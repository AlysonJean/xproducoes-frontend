import { useMemo, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import ReactGA from 'react-ga4';
import { v4 as uuidv4 } from 'uuid';
import { MapPin, Calendar, Clock, Info, User, Phone, Navigation2, Building2, Tag, X, Mail, ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { api } from '../../services/api';
import {
  Button,
  Input,
  Textarea,
  Card,
  Form,
  Alert,
  Grid,
  buttonVariants
} from '../../components/ui/StandardComponents';
import { BrandLoader } from '../../components/ui/BrandLoader';
import { quoteRequestSchema } from '../../validators/bookingSchema';
import type { Booking } from '../../types/types';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { formatPrice } from '../../utils/formatPrice';
import { useEquipmentPriceUnit } from '../../hooks/usePricingRules';
import { equipmentUnitsForHours, kitPriceLine, serviceLine } from '../../utils/bookingPricing';
import { kitFulfillment } from '../../utils/kitInfo';
import { wholeEventRuleText } from '../../utils/wholeEventService';
import { useWholeEventServices } from '../../hooks/useWholeEventServices';
import { Checkbox } from '../../components/ui/Checkbox';
import { quoteSuccessMessage } from '../../utils/quoteSubmission';
import { TrustStrip } from '../../components/ui/TrustStrip';
import { ClientPage } from '../../components/client/ClientPage';

// Seções do formulário: mesmo fundo/raio/ícone em todas (antes: rounded-[2rem] e um ícone de cada cor —
// índigo, esmeralda, âmbar, rosa — fora da paleta de tokens).
const sectionClass = 'rounded-3xl border border-border/50 bg-muted/10 p-4 sm:p-6 md:p-8';
const sectionTitleClass = 'mb-6 flex items-center gap-3 text-xl font-bold text-foreground';
const sectionIconClass = 'rounded-xl bg-primary/10 p-2.5 text-primary';

const logisticsQuestions = [
  { field: 'requiresStairs', legend: 'Local com escadas?' },
  { field: 'isCovered', legend: 'Local coberto?' },
  { field: 'hasParking', legend: 'Tem estacionamento?' },
] as const;

type QuoteFormInput = z.input<typeof quoteRequestSchema>;
type QuoteFormData = z.output<typeof quoteRequestSchema>;

interface QuoteBookingPayload {
  eventDate: string;
  eventEndDate: string;
  eventDuration: number;
  location: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  addressNumber: string;
  addressComplement?: string;
  requiresStairs: boolean;
  isCovered: boolean;
  hasParking: boolean;
  notes?: string;
  status: 'PENDING';
  setupTime: string;
  clientName?: string;
  clientContact?: string;
  clientEmail?: string;
  kitId?: string;
  equipmentIds?: string[];
  serviceIds?: string[];
  couponCode?: string;
}

interface AppliedCoupon {
  code: string;
  discountAmount: number;
}

function getEquipmentUnitPrice(item: { pricePerHour?: number | string; equipment?: { pricePerHour?: number | string } }): number {
  return Number(('pricePerHour' in item ? item.pricePerHour : item.equipment?.pricePerHour) || 0);
}

// Diária (lote 13): o mínimo do cadastro (na diária, o mínimo de diárias), que o servidor usa na conta. O
// carrinho de visitante guarda o equipamento inteiro; o da conta traz o campo desde este lote (cartRepository).
function getEquipmentMinimum(item: { minimumRentalDuration?: number | null; equipment?: { minimumRentalDuration?: number | null } }): number | null {
  return ('minimumRentalDuration' in item ? item.minimumRentalDuration : item.equipment?.minimumRentalDuration) ?? null;
}

export const QuoteRequestPage: React.FC = () => {
  const { cart, clearCart, isLoading: cartLoading } = useCart();
  const equipments = useMemo(() => cart?.equipments ?? [], [cart]);
  const services = useMemo(() => cart?.services ?? [], [cart]);
  const kit = cart?.kit;
  const navigate = useNavigate();
  const { user, setAuthenticatedUser, isLoading: authLoading } = useAuth();
  const { addNotification } = useNotifications();
  const [serverError, setServerError] = useState<string | null>(null);
  // O envio esvazia o carrinho antes de ir para a tela de sucesso: sem isto, a tela de carrinho vazio piscaria.
  const [sent, setSent] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormInput, unknown, QuoteFormData>({
        resolver: zodResolver(quoteRequestSchema),
    defaultValues: {
      requiresStairs: 'no',
      isCovered: 'no',
      hasParking: 'no',
      startTime: '19:00',
    },
  });

  // Estimativa de subtotal no front, com a regra do servidor (backend/src/services/booking/bookingPricing.ts;
  // decisões do dono de 06/11): kit pelo preço do evento, nunca vezes as horas; equipamento por hora ou por
  // diária (24 h para cima), conforme EQUIPMENT_PRICE_UNIT; serviços fixos. Só pré-visualiza o desconto do
  // cupom antes do envio; o valor final e autoritativo continua sendo calculado e validado no servidor.
  const equipmentUnit = useEquipmentPriceUnit();
  const durationValue = Number(watch('duration')) || 0;

  // Lote 13, técnico durante o evento (decisão do dono de 06/11/2026): numa entrega o cliente escolhe entre "a equipe
  // monta e busca depois" e "um técnico fica durante todo o evento". A caixa aparece quando o pedido tem kit de
  // entrega ou equipamento (nunca no pedido só com kit de retirada) e o dono marcou algum serviço "Pode acompanhar o
  // evento todo": uma caixa por serviço marcado. O serviço que já está no carrinho não ganha caixa (já vai no pedido).
  // Marcada, o id do serviço vai em serviceIds, e o servidor cobra pelas horas do evento (serviceLine).
  const eventHours = durationValue > 0 ? Math.max(1, Math.ceil(durationValue)) : null;
  const wholeEventServices = useWholeEventServices();
  const [technicianIds, setTechnicianIds] = useState<string[]>([]);
  const technicianOffers = useMemo(() => {
    const deliveryOrEquipment = Boolean(kit?.id && kitFulfillment(kit) === 'DELIVERY_SETUP') || equipments.length > 0;
    return deliveryOrEquipment ? wholeEventServices.filter((s) => !services.some((it) => it.id === s.id)) : [];
  }, [kit, equipments, services, wholeEventServices]);
  const chosenTechnicians = useMemo(() => technicianOffers.filter((s) => technicianIds.includes(s.id)), [technicianOffers, technicianIds]);
  // Os serviços do pedido com a marcação de agora (o carrinho salvo antes pode não ter o campo), mais os técnicos marcados.
  const orderServices = useMemo(
    () => [...services.map((it) => wholeEventServices.find((s) => s.id === it.id) ?? it), ...chosenTechnicians],
    [services, wholeEventServices, chosenTechnicians],
  );
  const toggleTechnician = (id: string, checked: boolean) =>
    setTechnicianIds((prev) => (checked ? [...prev.filter((x) => x !== id), id] : prev.filter((x) => x !== id)));

  const subtotal = useMemo(() => {
    // Lote 13 (06/11/2026): o kit com horas incluídas e valor de hora extra cobra as horas cheias a mais,
    // como o servidor (kitPriceLine). Sem a duração ainda, só o preço do evento.
    const kitsPrice = kit ? kitPriceLine(kit, durationValue > 0 ? Math.max(1, Math.ceil(durationValue)) : null).cents / 100 : 0;
    // Unidades de cada equipamento pela conta do servidor (equipmentUnits): horas cheias (4,5 h contam 5 h)
    // ou diárias (24 h para cima, no mínimo o mínimo de diárias do cadastro de cada equipamento).
    const equipmentsPrice = equipments.reduce(
      (sum, it) => sum + getEquipmentUnitPrice(it) * (equipmentUnitsForHours(equipmentUnit, durationValue, getEquipmentMinimum(it)) ?? 0),
      0,
    );
    // Lote 13: o serviço que acompanha o evento todo cobra pelas horas, como o servidor (serviceLine); os outros, fixos.
    const servicesPrice = orderServices.reduce((sum, it) => sum + serviceLine(it, eventHours).cents / 100, 0);
    return kitsPrice + equipmentsPrice + servicesPrice;
  }, [kit, equipments, orderServices, eventHours, durationValue, equipmentUnit]);

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;

    setCouponLoading(true);
    setCouponError(null);
    try {
      const resp = await api.post('/coupons/validate', { code, subtotal });
      // api.ts desembrulha automaticamente o envelope { success, data } — resp.data já é o
      // payload interno; resp.data?.data cobre o caso defensivo de vir sem o envelope.
      const result = resp?.data?.data ?? resp?.data;
      if (result?.valid) {
        setAppliedCoupon({ code: code.toUpperCase(), discountAmount: Number(result.discountAmount) || 0 });
        addNotification({
          type: 'success',
          title: 'Cupom aplicado!',
          message: `Desconto de ${formatPrice(result.discountAmount)} aplicado ao seu orçamento.`,
        });
      } else {
        setAppliedCoupon(null);
        setCouponError(result?.reason || 'Cupom inválido.');
      }
    } catch (err: unknown) {
      const msg = (axios.isAxiosError(err) && err.response?.data?.message) || 'Não foi possível validar o cupom agora.';
      setCouponError(msg);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const onSubmit: SubmitHandler<QuoteFormData> = async (data) => {
    setServerError(null);

    if (!equipments.length && !kit?.id && !services.length) {
      setServerError('Adicione algum item ao carrinho antes de prosseguir.');
      addNotification({
        type: 'warning',
        title: 'Carrinho vazio',
        message: 'Adicione algum item ao carrinho antes de prosseguir.'
      });
      return;
    }

    if (!user?.id && !data.email) {
      const msg = 'Informe seu e-mail para que possamos criar seu acompanhamento de pedido.';
      setServerError(msg);
      addNotification({
        type: 'warning',
        title: 'E-mail necessário',
        message: msg
      });
      return;
    }

    try {
      // Construir payload para o backend
      const [hh, mm] = data.startTime.split(':').map(Number);
      const [yyyy, mon, dd] = data.eventDate.split('-').map(Number);
      const eventStart = new Date(yyyy, mon - 1, dd, hh, mm, 0, 0);
      const eventEnd = new Date(eventStart.getTime() + (data.duration * 3600 * 1000));

            const bookingData: QuoteBookingPayload = {
        eventDate: eventStart.toISOString(),
        eventEndDate: eventEnd.toISOString(),
        eventDuration: data.duration,
        location: data.venue,
        street: data.street,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        addressNumber: data.addressNumber,
        addressComplement: data.addressComplement || undefined,
        requiresStairs: data.requiresStairs === 'yes',
        isCovered: data.isCovered === 'yes',
        hasParking: data.hasParking === 'yes',
        notes: data.notes || undefined,
        status: 'PENDING',
        setupTime: eventStart.toISOString(),
        clientName: user?.name || data.name || undefined,
        clientContact: user?.phone || data.phone || user?.email || data.email || undefined,
      };

      if (data.email) bookingData.clientEmail = data.email;
      if (kit?.id) bookingData.kitId = kit.id;
      if (appliedCoupon) bookingData.couponCode = appliedCoupon.code;
      
      const equipmentIds = equipments.map((it) => {
        if ('id' in it) return it.id;
        return it.equipmentId;
      }).filter(Boolean);
      
      // Lote 13: os técnicos marcados na caixa vão junto com os serviços do carrinho, sem repetir.
      const serviceIds = Array.from(new Set([...services.map((it) => it.id), ...chosenTechnicians.map((it) => it.id)])).filter(Boolean);
      
      if (equipmentIds.length > 0) bookingData.equipmentIds = equipmentIds;
      if (serviceIds.length > 0) bookingData.serviceIds = serviceIds;

      const idempotencyKey = uuidv4();
      
      addNotification({ 
        type: 'info', 
        title: 'Processando', 
        message: 'Enviando seu pedido de orçamento...' 
      });

      const endpoint = user?.id ? '/bookings' : '/bookings/guest';
      const resp = await api.post(endpoint, bookingData, {
        headers: { 'Idempotency-Key': idempotencyKey }
      });
      setSent(true);

      // api.ts desembrulha { success, data } automaticamente, então resp.data já é o `data`
      // do backend. Para /bookings ele é a própria reserva; para /bookings/guest ele é
      // { booking, user, token, refreshToken } — ou { booking, existingAccount: true }, sem
      // sessão, quando o e-mail já tem conta (ver bookingController.createGuest) — daí o
      // fallback: usa `.booking` quando existe, senão trata resp.data como a reserva em si.
      const responseData = resp?.data?.data ?? resp?.data;
      const createdBooking: Booking | null = responseData?.booking ?? responseData ?? null;

      // Checkout de convidado: o backend já criou a conta e autenticou (cookies httpOnly
      // na resposta) — só falta refletir isso no estado local para "Minhas Reservas" etc.
      // funcionarem imediatamente, sem exigir um login manual separado.
      if (!user?.id && responseData?.user) {
        setAuthenticatedUser(responseData.user);
      }

      ReactGA.event({
        category: "ecommerce",
        action: "purchase",
        label: "quote_request_success",
        value: 0
      });

      await clearCart();
      
      addNotification({
        type: 'success',
        title: 'Sucesso!',
        message: quoteSuccessMessage(responseData)
      });
      
      const statePayload = { 
        booking: createdBooking, 
        formData: data,
        cartItems: [
          ...(kit?.id ? [{ name: kit?.name ? `Kit: ${kit.name}` : 'Kit Selecionado' }] : []),
          ...equipments.map((it) => {
            if ('name' in it) return { name: it.name };
            return { name: it.equipment.name };
          }),
          ...services.map((it) => ({ name: it.name })),
          ...chosenTechnicians.map((it) => ({ name: it.name }))
        ]
      };

      navigate(createdBooking?.id ? `/orcamento-sucesso/${createdBooking.id}` : '/orcamento-sucesso', { state: statePayload });
        } catch (err: unknown) {
      logger.error('Erro ao criar booking', 'QuoteRequestPage', err);
      const msg = (axios.isAxiosError(err) && err.response?.data?.message) || (err instanceof Error ? err.message : null) || 'Erro ao salvar pedido.';
      setServerError(msg);
      
      ReactGA.event({
        category: "ecommerce",
        action: "purchase_error",
        label: msg.substring(0, 50)
      });

      addNotification({ 
        type: 'error', 
        title: 'Falha no envio', 
        message: msg 
      });
    }
  };

  // Achado: com o carrinho vazio (o link de indicação cai aqui), a pessoa preenchia o formulário
  // inteiro e só no envio descobria que precisava de itens. Agora escolhe o caminho antes.
  if (!sent && !equipments.length && !services.length && !kit?.id) {
    if (cartLoading || authLoading) {
      return (
        <ClientPage width="4xl">
          <BrandLoader label="Carregando seu carrinho…" />
        </ClientPage>
      );
    }
    return (
      <ClientPage width="4xl">
        <Card className="space-y-8 p-6 text-center shadow-xl sm:p-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
            <ShoppingBag className="h-10 w-10" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Seu carrinho está vazio</h1>
            <p className="mx-auto max-w-md text-lg text-muted-foreground">
              Para receber um orçamento, conte como vai ser o seu evento ou escolha os equipamentos que você quer.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-4 pt-2 sm:flex-row">
            <Link to="/briefing" className={buttonVariants({ size: 'lg' })}>
              Conte como é o evento
            </Link>
            <Link to="/equipamentos" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Ver Equipamentos
            </Link>
          </div>
        </Card>
      </ClientPage>
    );
  }

  return (
    <ClientPage
      width="4xl"
      title="Finalizar Orçamento"
      description="Revise os detalhes abaixo para que possamos preparar o melhor serviço para você."
    >
      <Card className="p-4 shadow-xl sm:p-8">
        {serverError && (
          <Alert variant="error" className="mb-8">
            {serverError}
          </Alert>
        )}

        <Form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Seção 1: Detalhes do Evento */}
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>
              <span className={sectionIconClass} aria-hidden="true">
                <Calendar className="h-5 w-5" />
              </span>
              O Momento
            </h2>

            <Grid columns={{ sm: 1, md: 2 }} gap={6}>
              <Input
                label="Nome/Local do Evento *"
                leftIcon={<Building2 className="h-4 w-4" />}
                {...register('venue')}
                error={errors.venue?.message}
                placeholder="Ex.: Espaço Kalahari, Casamento..."
              />

              <Input
                label="Data do Evento *"
                type="date"
                leftIcon={<Calendar className="h-4 w-4" />}
                {...register('eventDate')}
                error={errors.eventDate?.message}
              />

              <Input
                label="Hora de Início da Montagem *"
                type="time"
                leftIcon={<Clock className="h-4 w-4" />}
                {...register('startTime')}
                error={errors.startTime?.message}
              />

              <Input
                label="Tempo de Operação (horas) *"
                type="number"
                leftIcon={<Clock className="h-4 w-4" />}
                {...register('duration')}
                error={errors.duration?.message}
                placeholder="Ex.: 5"
              />
            </Grid>
          </section>

          {/* Seção 2: Endereço */}
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>
              <span className={sectionIconClass} aria-hidden="true">
                <MapPin className="h-5 w-5" />
              </span>
              O Destino
            </h2>

            <Grid columns={{ sm: 1, md: 2 }} gap={6}>
              <Input
                label="CEP *"
                inputMode="numeric"
                autoComplete="postal-code"
                {...register('zipCode')}
                error={errors.zipCode?.message}
                placeholder="00000-000"
              />
              
              <Input
                label="Rua *"
                autoComplete="address-line1"
                {...register('street')}
                error={errors.street?.message}
                placeholder="Nome da avenida, rua..."
              />

              <Input
                label="Número *"
                {...register('addressNumber')}
                error={errors.addressNumber?.message}
                placeholder="Ex.: 123"
              />

              <Input
                label="Complemento"
                autoComplete="address-line2"
                {...register('addressComplement')}
                error={errors.addressComplement?.message}
                placeholder="Ex.: Bloco A, Apto 101"
              />

              <Input
                label="Bairro *"
                {...register('neighborhood')}
                error={errors.neighborhood?.message}
              />

              <Grid columns={2} gap={4}>
                <Input label="Cidade *" autoComplete="address-level2" {...register('city')} error={errors.city?.message} />
                <Input label="Estado *" autoComplete="address-level1" {...register('state')} error={errors.state?.message} placeholder="UF" />
              </Grid>
            </Grid>
          </section>

          {/* Seção 3: Logística */}
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>
              <span className={sectionIconClass} aria-hidden="true">
                <Navigation2 className="h-5 w-5" />
              </span>
              O Terreno
            </h2>

            {/* fieldset/legend: antes o título de cada grupo era um <label> solto, sem ligação com os rádios. */}
            <div className="grid grid-cols-1 gap-6 rounded-2xl border border-border/50 bg-muted/30 p-4 sm:p-6 md:grid-cols-3">
              {logisticsQuestions.map(({ field, legend }) => (
                <fieldset key={field} className="space-y-3">
                  <legend className="mb-3 text-sm font-semibold text-foreground">{legend}</legend>
                  <div className="flex gap-6">
                    <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-foreground">
                      <input type="radio" value="yes" {...register(field)} className="h-4 w-4 accent-primary" /> Sim
                    </label>
                    <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-foreground">
                      <input type="radio" value="no" {...register(field)} className="h-4 w-4 accent-primary" /> Não
                    </label>
                  </div>
                  {errors[field] && <p className="text-sm text-destructive">{errors[field]?.message}</p>}
                </fieldset>
              ))}
            </div>
          </section>

          {/* Lote 13, técnico durante o evento (decisão do dono de 06/11/2026): montar e buscar depois, ou um técnico
              durante todo o evento, cobrado pelas horas. */}
          {technicianOffers.length > 0 && (
            <section className={sectionClass} aria-labelledby="tecnico-no-evento">
              <h2 id="tecnico-no-evento" className={sectionTitleClass}>
                <span className={sectionIconClass} aria-hidden="true">
                  <User className="h-5 w-5" />
                </span>
                Técnico no evento
              </h2>
              <div className="space-y-4">
                {technicianOffers.map((svc) => (
                  <Checkbox
                    key={svc.id}
                    id={`tecnico-${svc.id}`}
                    label={technicianOffers.length === 1 ? 'Quero um técnico durante todo o evento' : `Quero um técnico durante todo o evento: ${svc.name}`}
                    description={technicianOffers.length === 1 ? `${svc.name}: ${wholeEventRuleText(svc, eventHours)}` : wholeEventRuleText(svc, eventHours)}
                    checked={technicianIds.includes(svc.id)}
                    onChange={(e) => toggleTechnician(svc.id, e.target.checked)}
                  />
                ))}
                {chosenTechnicians.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sem técnico, a equipe monta antes do evento e busca depois que ele termina.</p>
                )}
              </div>
            </section>
          )}

          {/* Seção 4: Contato Adicional (se necessário) */}
          {!user?.id && (
            <section className={sectionClass}>
              <h2 className={sectionTitleClass}>
                <span className={sectionIconClass} aria-hidden="true">
                  <User className="h-5 w-5" />
                </span>
                Sua Identidade
              </h2>
              <p className="text-sm text-muted-foreground -mt-2 mb-6">
                Não é preciso criar conta antes — usamos esses dados para acompanhar seu pedido e você pode acessá-lo depois com este e-mail.
              </p>

              <Grid columns={{ sm: 1, md: 2 }} gap={6}>
                <Input
                  label="Seu Nome *"
                  autoComplete="name"
                  leftIcon={<User className="h-4 w-4" />}
                  {...register('name')}
                  error={errors.name?.message}
                />

                <Input
                  label="Seu E-mail *"
                  type="email"
                  autoComplete="email"
                  leftIcon={<Mail className="h-4 w-4" />}
                  {...register('email')}
                  error={errors.email?.message}
                />

                <Input
                  label="Telefone (WhatsApp, opcional)"
                  type="tel"
                  autoComplete="tel"
                  leftIcon={<Phone className="h-4 w-4" />}
                  {...register('phone')}
                  error={errors.phone?.message}
                />
              </Grid>
            </section>
          )}

          {/* Seção 5: Observações */}
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>
              <span className={sectionIconClass} aria-hidden="true">
                <Info className="h-5 w-5" />
              </span>
              Orientações Finais
            </h2>

            <Textarea
              label="Observações (opcional)"
              {...register('notes')}
              error={errors.notes?.message}
              rows={4}
              placeholder="Deseja acrescentar algum detalhe específico sobre o local, acessos ou necessidades técnicas?"
            />
          </section>

          {/* Seção 6: Cupom de Desconto */}
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>
              <span className={sectionIconClass} aria-hidden="true">
                <Tag className="h-5 w-5" />
              </span>
              Cupom de Desconto
            </h2>

            {appliedCoupon ? (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-success/30 bg-success/10 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-success">
                    Cupom {appliedCoupon.code} aplicado
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Desconto de {formatPrice(appliedCoupon.discountAmount)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveCoupon}
                  className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Remover cupom"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex-1">
                  <Input
                    aria-label="Código do cupom"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Ex.: BEMVINDO10"
                    className="uppercase"
                    autoComplete="off"
                    error={couponError || undefined}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleApplyCoupon}
                  isLoading={couponLoading}
                  disabled={!couponInput.trim()}
                >
                  Aplicar
                </Button>
              </div>
            )}

            {subtotal > 0 && (
              <div className="mt-6 pt-6 border-t border-border/50 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal estimado</span>
                  <span className="tabular-nums">{formatPrice(subtotal)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between font-semibold text-success">
                    <span>Desconto ({appliedCoupon.code})</span>
                    <span className="tabular-nums">- {formatPrice(appliedCoupon.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-foreground font-bold text-base pt-2">
                  <span>Total estimado</span>
                  <span className="tabular-nums">
                    {formatPrice(Math.max(0, subtotal - (appliedCoupon?.discountAmount || 0)))}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground italic pt-1">
                  Valor estimado — o valor final será confirmado pela nossa equipe.
                </p>
              </div>
            )}
          </section>

          <div className="pt-6">
            <Button
              type="submit"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
              className="shadow-lg shadow-primary/20"
            >
              Confirmar Pedido de Orçamento
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-4 italic">
              * Ao clicar em confirmar, seu pedido será enviado para nossa equipe e entraremos em contato em breve.
            </p>
            <TrustStrip className="mt-6 pt-6 border-t border-border/50" />
          </div>
        </Form>
      </Card>
    </ClientPage>
  );
};

export default QuoteRequestPage;
