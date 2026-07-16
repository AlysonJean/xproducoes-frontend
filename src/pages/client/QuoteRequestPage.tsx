import { useMemo, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import ReactGA from 'react-ga4';
import { v4 as uuidv4 } from 'uuid';
import { MapPin, Calendar, Clock, Info, User, Phone, Navigation2, Building2, Tag, X } from 'lucide-react';
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
  Grid
} from '../../components/ui/StandardComponents';
import { quoteRequestSchema } from '../../validators/bookingSchema';
import type { Booking } from '../../types/types';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { formatPrice } from '../../utils/formatPrice';
import { TrustStrip } from '../../components/ui/TrustStrip';

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

export const QuoteRequestPage: React.FC = () => {
  const { cart, clearCart } = useCart();
  const equipments = useMemo(() => cart?.equipments ?? [], [cart]);
  const services = useMemo(() => cart?.services ?? [], [cart]);
  const kit = cart?.kit;
  const navigate = useNavigate();
  const { user, setAuthenticatedUser } = useAuth();
  const { addNotification } = useNotifications();
  const [serverError, setServerError] = useState<string | null>(null);
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

  // Estimativa de subtotal no front (mesma fórmula do backend: kit/equipamentos por hora,
  // serviços fixos) — só para pré-visualizar o desconto do cupom antes do envio. O valor
  // final e autoritativo continua sendo calculado e validado no servidor.
  const durationValue = Number(watch('duration')) || 0;
  const subtotal = useMemo(() => {
    const kitsPrice = kit?.price ? Number(kit.price) * durationValue : 0;
    const equipmentsPrice = equipments.reduce((sum, it) => sum + getEquipmentUnitPrice(it), 0) * durationValue;
    const servicesPrice = services.reduce((sum, it) => sum + Number((it as { price?: number | string }).price || 0), 0);
    return kitsPrice + equipmentsPrice + servicesPrice;
  }, [kit, equipments, services, durationValue]);

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
      
      const serviceIds = services.map((it) => it.id).filter(Boolean);
      
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

      // api.ts desembrulha { success, data } automaticamente, então resp.data já é o `data`
      // do backend. Para /bookings ele é a própria reserva; para /bookings/guest ele é
      // { booking, user, token, refreshToken } (ver bookingController.createGuest) — daí o
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
        message: 'Seu pedido de orçamento foi enviado com sucesso.' 
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
          ...services.map((it) => ({ name: it.name }))
        ]
      };

      if (createdBooking?.id) {
        navigate(`/reserva-sucesso/${createdBooking.id}`, { state: statePayload });
      } else {
        navigate('/reserva-sucesso', { state: statePayload });
      }
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

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-foreground">Finalizar Orçamento</h1>
        <p className="text-muted-foreground mt-2">
          Revise os detalhes abaixo para que possamos preparar o melhor serviço para você.
        </p>
      </div>

      <Card className="p-8 shadow-xl border-border">
        {serverError && (
          <Alert variant="error" className="mb-8">
            {serverError}
          </Alert>
        )}

        <Form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          {/* Seção 1: Detalhes do Evento */}
          <div className="bg-muted/10 p-6 md:p-8 rounded-[2rem] border border-border/50">
            <h2 className="text-xl font-bold flex items-center gap-3 text-foreground mb-6">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              O Momento
            </h2>
            
            <Grid columns={{ sm: 1, md: 2 }} gap={6}>
              <Input
                label="Nome/Local do Evento *"
                leftIcon={<Building2 className="h-4 w-4" />}
                {...register('venue')}
                error={errors.venue?.message}
                placeholder="Ex: Espaço Kalahari, Casamento..."
                className="bg-card"
              />
              
              <Input
                label="Data do Evento *"
                type="date"
                leftIcon={<Calendar className="h-4 w-4" />}
                {...register('eventDate')}
                error={errors.eventDate?.message}
                 className="bg-card"
              />

              <Input
                label="Hora de Início da Montagem *"
                type="time"
                leftIcon={<Clock className="h-4 w-4" />}
                {...register('startTime')}
                error={errors.startTime?.message}
                 className="bg-card"
              />

              <Input
                label="Tempo de Operação (horas) *"
                type="number"
                leftIcon={<Clock className="h-4 w-4" />}
                {...register('duration')}
                error={errors.duration?.message}
                placeholder="Ex: 5"
                 className="bg-card"
              />
            </Grid>
          </div>

          {/* Seção 2: Endereço */}
          <div className="bg-muted/10 p-6 md:p-8 rounded-[2rem] border border-border/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
               <h2 className="text-xl font-bold flex items-center gap-3 text-foreground">
                 <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                   <MapPin className="h-5 w-5" />
                 </div>
                 O Destino
               </h2>
               <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Logística Geográfica</p>
            </div>

            <Grid columns={{ sm: 1, md: 2 }} gap={6}>
              <Input
                label="CEP *"
                {...register('zipCode')}
                error={errors.zipCode?.message}
                placeholder="00000-000"
              />
              
              <Input
                label="Rua *"
                {...register('street')}
                error={errors.street?.message}
                placeholder="Nome da avenida, rua..."
              />

              <Input
                label="Número *"
                {...register('addressNumber')}
                error={errors.addressNumber?.message}
                placeholder="Ex: 123"
              />

              <Input
                label="Complemento"
                {...register('addressComplement')}
                error={errors.addressComplement?.message}
                placeholder="Ex: Bloco A, Apto 101"
              />

              <Input
                label="Bairro *"
                {...register('neighborhood')}
                error={errors.neighborhood?.message}
              />

              <Grid columns={2} gap={4}>
                <Input label="Cidade *" {...register('city')} error={errors.city?.message} className="bg-card" />
                <Input label="Estado *" {...register('state')} error={errors.state?.message} placeholder="UF" className="bg-card" />
              </Grid>
            </Grid>
          </div>

          {/* Seção 3: Logística */}
          <div className="bg-muted/10 p-6 md:p-8 rounded-[2rem] border border-border/50">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                 <h2 className="text-xl font-bold flex items-center gap-3 text-foreground">
                   <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                     <Navigation2 className="h-5 w-5" />
                   </div>
                   O Terreno
                 </h2>
                 <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Análise Estrutural</p>
             </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 bg-muted/30 rounded-2xl border border-border/50">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Local com escadas?</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" value="yes" {...register('requiresStairs')} className="accent-primary" /> Sim
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" value="no" {...register('requiresStairs')} className="accent-primary" /> Não
                  </label>
                </div>
                {errors.requiresStairs && <p className="text-xs text-destructive">{errors.requiresStairs.message}</p>}
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Local coberto?</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" value="yes" {...register('isCovered')} className="accent-primary" /> Sim
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" value="no" {...register('isCovered')} className="accent-primary" /> Não
                  </label>
                </div>
                {errors.isCovered && <p className="text-xs text-destructive">{errors.isCovered.message}</p>}
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">Tem estacionamento?</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" value="yes" {...register('hasParking')} className="accent-primary" /> Sim
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" value="no" {...register('hasParking')} className="accent-primary" /> Não
                  </label>
                </div>
                {errors.hasParking && <p className="text-xs text-destructive">{errors.hasParking.message}</p>}
              </div>
            </div>
          </div>

          {/* Seção 4: Contato Adicional (se necessário) */}
          {!user?.id && (
            <div className="bg-muted/10 p-6 md:p-8 rounded-[2rem] border border-border/50">
              <h2 className="text-xl font-bold flex items-center gap-3 text-foreground mb-6">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                   <User className="h-5 w-5" />
                </div>
                Sua Identidade
              </h2>
              <p className="text-sm text-muted-foreground -mt-4 mb-6">
                Não é preciso criar conta antes — usamos esses dados para acompanhar seu pedido e você pode acessá-lo depois com este e-mail.
              </p>

              <Grid columns={{ sm: 1, md: 2 }} gap={6}>
                <Input
                  label="Seu Nome *"
                  leftIcon={<User className="h-4 w-4" />}
                  {...register('name')}
                  error={errors.name?.message}
                />

                <Input
                  label="Seu E-mail *"
                  type="email"
                  leftIcon={<User className="h-4 w-4" />}
                  {...register('email')}
                  error={errors.email?.message}
                />

                <Input
                  label="Telefone (WhatsApp, opcional)"
                  leftIcon={<Phone className="h-4 w-4" />}
                  {...register('phone')}
                  error={errors.phone?.message}
                />
              </Grid>
            </div>
          )}

          {/* Seção 5: Observações */}
          <div className="bg-muted/10 p-6 md:p-8 rounded-[2rem] border border-border/50">
            <h2 className="text-xl font-bold flex items-center gap-3 text-foreground mb-6">
               <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
                   <Info className="h-5 w-5" />
               </div>
               Orientações Finais
            </h2>
            
            <Textarea
              {...register('notes')}
              error={errors.notes?.message}
              rows={4}
              placeholder="Deseja acrescentar algum detalhe específico sobre o local, acessos ou necessidades técnicas?"
            />
          </div>

          {/* Seção 6: Cupom de Desconto */}
          <div className="bg-muted/10 p-6 md:p-8 rounded-[2rem] border border-border/50">
            <h2 className="text-xl font-bold flex items-center gap-3 text-foreground mb-6">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Tag className="h-5 w-5" />
              </div>
              Cupom de Desconto
            </h2>

            {appliedCoupon ? (
              <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <div>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    Cupom {appliedCoupon.code} aplicado
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Desconto de {formatPrice(appliedCoupon.discountAmount)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Remover cupom"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Ex: BEMVINDO10"
                  className="bg-card uppercase flex-1"
                  error={couponError || undefined}
                />
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
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
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
          </div>

          <div className="pt-6">
            <Button
              type="submit"
              size="lg"
              fullWidth
              isLoading={isSubmitting}
              className="h-14 text-lg font-bold shadow-lg shadow-primary/20"
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
    </div>
  );
};

export default QuoteRequestPage;
