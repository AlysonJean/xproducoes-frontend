import { useEffect, useMemo, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import ReactGA from 'react-ga4';
import { v4 as uuidv4 } from 'uuid';
import { MapPin, Calendar, Clock, Info, User, Phone, Navigation2, Building2, Tag, X, Mail, ShoppingBag, Wrench, ChevronDown, Layers } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { api, apiFetch } from '../../services/api';
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
import { buildQuoteRequestSchema } from '../../validators/bookingSchema';
import type { Booking, Equipment, Kit, Service } from '../../types/types';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { formatPrice } from '../../utils/formatPrice';
import { useEquipmentPriceUnit, useFreightRules } from '../../hooks/usePricingRules';
import { equipmentUnitsForHours, equipmentUnitSuffix, equipmentUnitText, kitPriceLine, serviceLine, serviceMinutesText } from '../../utils/bookingPricing';
import { kitFulfillment } from '../../utils/kitInfo';
import { isWholeEventService, wholeEventRuleText } from '../../utils/wholeEventService';
import { useCatalogServices } from '../../hooks/useCatalogServices';
import { Checkbox } from '../../components/ui/Checkbox';
import {
  couponDiscount,
  logisticsFlags,
  parseCouponRule,
  quoteEventEndNote,
  quoteEventRange,
  quoteRequestText,
  quoteSuccessMessage,
  todayISO,
  type CouponRule,
} from '../../utils/quoteSubmission';
import {
  fetchStructureCatalog,
  findSetupService,
  isAvailableForOrder,
  kitEquipmentIds,
  kitServiceIds,
  structureOffers,
  STRUCTURE_LIGHTING_HINT,
  STRUCTURE_PRICE_NOTE,
} from '../../utils/cartCatalog';
import { freightRulesText, orderNeedsDelivery } from '../../utils/freightInfo';
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

// Auditoria do orçamento (12/11/2026), O25: nenhuma resposta pré-marcada (antes vinha "Não" nas três) e "Não sei" é uma
// resposta, como no briefing.
const logisticsOptions = [
  { value: 'yes', label: 'Sim' },
  { value: 'no', label: 'Não' },
  { value: 'unknown', label: 'Não sei' },
] as const;

type QuoteFormSchema = ReturnType<typeof buildQuoteRequestSchema>;
type QuoteFormInput = z.input<QuoteFormSchema>;
type QuoteFormData = z.output<QuoteFormSchema>;

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
  specialRequests: string;
  status: 'PENDING';
  setupTime?: string;
  clientName?: string;
  clientContact?: string;
  clientEmail?: string;
  kitId?: string;
  equipmentIds?: string[];
  serviceIds?: string[];
  couponCode?: string;
}

// Auditoria do orçamento (12/11/2026), O7: o cupom guarda o código e a regra que a validação devolveu; o desconto
// mostrado é refeito a cada mudança do subtotal (couponDiscount), em vez de ficar o valor do momento da validação.
interface AppliedCoupon {
  code: string;
  rule: CouponRule | null;
  /** O desconto que a validação devolveu: só vale quando a regra não veio (servidor anterior). */
  discountAmount: number;
}

interface CouponProblem {
  code: string;
  reason: string;
}

type CartEquipment = Equipment | { equipmentId: string; equipment: Equipment };

const equipmentOf = (item: CartEquipment): Equipment => ('equipment' in item && item.equipment ? item.equipment : (item as Equipment));

function getEquipmentUnitPrice(item: { pricePerHour?: number | string; equipment?: { pricePerHour?: number | string } }): number {
  return Number(('pricePerHour' in item ? item.pricePerHour : item.equipment?.pricePerHour) || 0);
}

// Diária (lote 13): o mínimo do cadastro (na diária, o mínimo de diárias), que o servidor usa na conta. O
// carrinho de visitante guarda o equipamento inteiro; o da conta traz o campo desde este lote (cartRepository).
function getEquipmentMinimum(item: { minimumRentalDuration?: number | null; equipment?: { minimumRentalDuration?: number | null } }): number | null {
  return ('minimumRentalDuration' in item ? item.minimumRentalDuration : item.equipment?.minimumRentalDuration) ?? null;
}

export const QuoteRequestPage: React.FC = () => {
  const { cart, clearCart, isLoading: cartLoading, refreshCart } = useCart();
  const equipments = useMemo(() => (cart?.equipments ?? []) as CartEquipment[], [cart]);
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
  const [couponProblem, setCouponProblem] = useState<CouponProblem | null>(null);
  const isGuest = !user?.id;

  // Auditoria do orçamento (12/11/2026), O19: ao abrir, o carrinho do navegador é relido do catálogo (preço, tipo e
  // horas do kit, status); o item que sumiu ou ficou indisponível aparece marcado, com o nome.
  useEffect(() => {
    Promise.resolve(refreshCart?.()).catch(() => undefined);
  }, [refreshCart]);

  // O26: quem pede sem conta informa o nome e o e-mail; o WhatsApp com DDD vale para todos (ver bookingSchema).
  const schema = useMemo(() => buildQuoteRequestSchema({ guest: isGuest }), [isGuest]);
  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormInput, unknown, QuoteFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      startTime: '19:00',
      endTime: '',
      phone: '',
    },
  });

  // O26: o WhatsApp de quem tem conta vem do cadastro, e a pessoa pode trocar.
  useEffect(() => {
    if (user?.phone && !getValues('phone')) setValue('phone', user.phone);
  }, [user?.phone, getValues, setValue]);

  // Estimativa de subtotal no front, com a regra do servidor (backend/src/services/booking/bookingPricing.ts;
  // decisões do dono de 06/11): kit pelo preço do evento, nunca vezes as horas; equipamento por hora ou por
  // diária (24 h para cima), conforme EQUIPMENT_PRICE_UNIT; serviços fixos. Só pré-visualiza o desconto do
  // cupom antes do envio; o valor final e autoritativo continua sendo calculado e validado no servidor.
  const equipmentUnit = useEquipmentPriceUnit();
  // O6: as horas do evento saem do início e do término (as da montagem não contam); a data do término, só no evento
  // de mais de um dia. Sem a data ainda, as horas são as do relógio, no dia de hoje.
  const [eventDateValue, startTimeValue, endTimeValue, endDateValue] = watch(['eventDate', 'startTime', 'endTime', 'endDate']);
  const eventRange = quoteEventRange({
    eventDate: eventDateValue || todayISO(),
    startTime: startTimeValue,
    endTime: endTimeValue,
    endDate: eventDateValue ? endDateValue : undefined,
  });
  const durationHours = eventRange?.hours ?? 0;

  // Lote 13, técnico durante o evento (decisão do dono de 06/11/2026): numa entrega o cliente escolhe entre "a equipe
  // monta e busca depois" e "um técnico fica durante todo o evento". A caixa aparece quando o pedido tem kit de
  // entrega ou equipamento (nunca no pedido só com kit de retirada) e o dono marcou algum serviço "Pode acompanhar o
  // evento todo": uma caixa por serviço marcado. O serviço que já está no carrinho não ganha caixa (já vai no pedido).
  // Marcada, o id do serviço vai em serviceIds, e o servidor cobra pelas horas do evento (serviceLine).
  const eventHours = durationHours > 0 ? Math.max(1, Math.ceil(durationHours)) : null;
  const catalogServices = useCatalogServices();
  const wholeEventServices = useMemo(() => catalogServices.filter(isWholeEventService), [catalogServices]);
  // E1: o serviço que já vem dentro do kit (itens do kit com serviço) nunca é cobrado de novo: nem pela caixa do
  // técnico, nem pelo serviço igual posto no carrinho.
  const kitServices = useMemo(() => kitServiceIds(kit), [kit]);
  const isDeliveryKit = Boolean(kit?.id && kitFulfillment(kit) === 'DELIVERY_SETUP');
  const hasDelivery = isDeliveryKit || equipments.length > 0;
  const [technicianIds, setTechnicianIds] = useState<string[]>([]);
  const technicianOffers = useMemo(
    () => (hasDelivery ? wholeEventServices.filter((s) => !services.some((it) => it.id === s.id) && !kitServices.has(s.id)) : []),
    [hasDelivery, services, wholeEventServices, kitServices],
  );
  const includedTechnicians = useMemo(
    () => (hasDelivery ? wholeEventServices.filter((s) => kitServices.has(s.id)) : []),
    [hasDelivery, wholeEventServices, kitServices],
  );
  const chosenTechnicians = useMemo(() => technicianOffers.filter((s) => technicianIds.includes(s.id)), [technicianOffers, technicianIds]);
  const toggleTechnician = (id: string, checked: boolean) =>
    setTechnicianIds((prev) => (checked ? [...prev.filter((x) => x !== id), id] : prev.filter((x) => x !== id)));

  // E5: equipamento avulso sem kit de entrega tem a montagem cobrada à parte, pelo serviço de montagem do catálogo
  // (findSetupService). Com kit de entrega a montagem já vem no kit, e a caixa não aparece.
  const setupService = useMemo(() => findSetupService(catalogServices), [catalogServices]);
  const offersSetup = equipments.length > 0 && !isDeliveryKit;
  const setupInCart = Boolean(setupService && services.some((it) => it.id === setupService.id));
  // E1: o serviço de montagem que o kit já traz (item do kit, mesmo num kit de retirada) não é oferecido nem cobrado.
  const setupInKit = Boolean(setupService && kitServices.has(setupService.id));
  const [wantsSetup, setWantsSetup] = useState(false);
  const chosenSetup: Service | null = offersSetup && setupService && !setupInCart && !setupInKit && wantsSetup ? setupService : null;

  // Palco (13/11/2026): os Kits 06 e 08 deixam de trazer o conjunto de palco, vendido à parte. No pedido com kit de
  // entrega ou equipamento avulso, a seção "Palco e estruturas (opcional)" oferece os itens ativos da categoria
  // "Estruturas" do catálogo (structureOffers), menos o que já está no carrinho ou no kit. Marcado, o item soma na
  // estimativa pela diária, como o equipamento avulso, e vai no pedido em equipmentIds.
  const cartEquipmentIds = useMemo(() => equipments.map((it) => ('id' in it ? it.id : it.equipmentId)).filter(Boolean), [equipments]);
  const [structureCatalog, setStructureCatalog] = useState<Equipment[]>([]);
  useEffect(() => {
    if (!hasDelivery) return;
    let alive = true;
    Promise.resolve()
      .then(() => fetchStructureCatalog(apiFetch))
      .then((list) => {
        if (alive && list) setStructureCatalog(list);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [hasDelivery]);
  // O que o kit traz vem da página do kit (GET /kits/:id): o carrinho da conta manda só o serviço de cada item do kit.
  // Sem essa resposta, nada é oferecido junto com o kit (para não cobrar de novo o que já vem nele).
  const kitId = kit?.id;
  const [kitComposition, setKitComposition] = useState<{ kitId: string; equipmentIds: Set<string> } | null>(null);
  useEffect(() => {
    if (!kitId || !hasDelivery) return;
    let alive = true;
    Promise.resolve()
      .then(() => apiFetch<Kit>(`/kits/${encodeURIComponent(kitId)}`))
      .then((detail) => {
        const ids = kitEquipmentIds(detail);
        if (alive && ids) setKitComposition({ kitId, equipmentIds: ids });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [kitId, hasDelivery]);
  const structureOptions = useMemo(() => {
    if (!hasDelivery) return [];
    if (!kitId) return structureOffers(structureCatalog, cartEquipmentIds);
    if (kitComposition?.kitId !== kitId) return [];
    return structureOffers(structureCatalog, [...cartEquipmentIds, ...kitComposition.equipmentIds]);
  }, [hasDelivery, kitId, kitComposition, structureCatalog, cartEquipmentIds]);
  const [structureIds, setStructureIds] = useState<string[]>([]);
  const [structuresOpen, setStructuresOpen] = useState(false);
  const chosenStructures = useMemo(() => structureOptions.filter((eq) => structureIds.includes(eq.id)), [structureOptions, structureIds]);
  const toggleStructure = (id: string, checked: boolean) =>
    setStructureIds((prev) => (checked ? [...prev.filter((x) => x !== id), id] : prev.filter((x) => x !== id)));
  // A estrutura marcada que deixou de estar ativa depois que a página abriu não está no carrinho, e o servidor recusa o
  // pedido ("não está disponível"). A lista é relida (sem a guardada) e a que saiu deixa a seção e o pedido, com o nome
  // no aviso. Se a releitura falhar, fica a lista de antes.
  const [structuresGone, setStructuresGone] = useState<string[]>([]);
  const reloadStructures = (marked: Equipment[]) => {
    Promise.resolve()
      .then(() => fetchStructureCatalog(apiFetch, { fresh: true }))
      .then((list) => {
        if (!list) return;
        setStructureCatalog(list);
        setStructuresGone(marked.filter((eq) => !list.some((it) => it.id === eq.id)).map((eq) => eq.name));
      })
      .catch(() => undefined);
  };

  // Os serviços do carrinho com o cadastro de agora (o carrinho salvo antes pode não ter a marcação), menos os que já
  // vêm no kit, mais os técnicos e a montagem marcados.
  const cartServices = useMemo(() => services.map((it) => catalogServices.find((s) => s.id === it.id) ?? it), [services, catalogServices]);
  const orderServices = useMemo(
    () => [...cartServices.filter((it) => !kitServices.has(it.id)), ...chosenTechnicians, ...(chosenSetup ? [chosenSetup] : [])],
    [cartServices, kitServices, chosenTechnicians, chosenSetup],
  );

  // O19/O23: item que sumiu do catálogo ou não está ativo não vai no pedido; aparece com o nome.
  const unavailableNames = useMemo(
    () => [
      ...(kit && !isAvailableForOrder(kit) ? [kit.name] : []),
      ...equipments.map(equipmentOf).filter((eq) => !isAvailableForOrder(eq)).map((eq) => eq.name),
      ...cartServices.filter((svc) => !isAvailableForOrder(svc)).map((svc) => svc.name),
    ],
    [kit, equipments, cartServices],
  );

  const subtotal = useMemo(() => {
    // Lote 13 (06/11/2026): o kit com horas incluídas e valor de hora extra cobra as horas cheias a mais,
    // como o servidor (kitPriceLine). Sem os horários ainda, só o preço do evento.
    const kitsPrice = kit && isAvailableForOrder(kit) ? kitPriceLine(kit, eventHours).cents / 100 : 0;
    // Unidades de cada equipamento pela conta do servidor (equipmentUnits): horas cheias (4,5 h contam 5 h)
    // ou diárias (24 h para cima, no mínimo o mínimo de diárias do cadastro de cada equipamento).
    const equipmentsPrice = equipments.reduce(
      (sum, it) =>
        isAvailableForOrder(equipmentOf(it))
          ? sum + getEquipmentUnitPrice(it) * (equipmentUnitsForHours(equipmentUnit, durationHours, getEquipmentMinimum(it)) ?? 0)
          : sum,
      0,
    );
    // Lote 13: o serviço que acompanha o evento todo cobra pelas horas, como o servidor (serviceLine); os outros, fixos.
    const servicesPrice = orderServices.reduce((sum, it) => (isAvailableForOrder(it) ? sum + serviceLine(it, eventHours).cents / 100 : sum), 0);
    // Palco (13/11/2026): as estruturas marcadas, pela conta do equipamento avulso (diárias, com o mínimo do cadastro).
    const structuresPrice = chosenStructures.reduce(
      (sum, eq) => sum + getEquipmentUnitPrice(eq) * (equipmentUnitsForHours(equipmentUnit, durationHours, getEquipmentMinimum(eq)) ?? 0),
      0,
    );
    return kitsPrice + equipmentsPrice + servicesPrice + structuresPrice;
  }, [kit, equipments, orderServices, chosenStructures, eventHours, durationHours, equipmentUnit]);

  // O7: o desconto acompanha o subtotal de agora.
  const coupon = useMemo(() => {
    if (!appliedCoupon) return null;
    if (!appliedCoupon.rule) return { amount: Math.min(appliedCoupon.discountAmount, subtotal), belowMinimum: false };
    return couponDiscount(appliedCoupon.rule, subtotal);
  }, [appliedCoupon, subtotal]);

  // Frete por km (decisões do dono de 06/11/2026, item frete-km): o site não calcula o frete (o cálculo consulta
  // o Google e fica no servidor, e o valor vem na proposta); só explica a regra, com os valores do servidor.
  // Pedido só com kit de retirada não tem frete, e o texto não aparece.
  const freightRules = useFreightRules();
  const freightText = freightRules && orderNeedsDelivery(kit, equipments.length) ? freightRulesText(freightRules) : null;

  // O7: o convidado manda o e-mail, para o servidor conferir o limite por cliente e a auto-indicação com a conta dele.
  const requestCouponCheck = async (code: string, email: string | undefined) => {
    const resp = await api.post('/coupons/validate', { code, subtotal, ...(email ? { email } : {}) });
    // api.ts desembrulha automaticamente o envelope { success, data } — resp.data já é o
    // payload interno; resp.data?.data cobre o caso defensivo de vir sem o envelope.
    return (resp?.data?.data ?? resp?.data) as { valid?: boolean; reason?: string; code?: string; discountAmount?: number; rule?: unknown } | undefined;
  };

  const guestEmail = () => (isGuest ? String(getValues('email') ?? '').trim() || undefined : undefined);

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;

    setCouponLoading(true);
    setCouponError(null);
    setCouponProblem(null);
    try {
      const result = await requestCouponCheck(code, guestEmail());
      if (result?.valid) {
        const rule = parseCouponRule(result.rule);
        const discountAmount = Number(result.discountAmount) || 0;
        setAppliedCoupon({ code: (result.code || code).toUpperCase(), rule, discountAmount });
        addNotification({
          type: 'success',
          title: 'Cupom aplicado!',
          message: `Desconto de ${formatPrice(rule ? couponDiscount(rule, subtotal).amount : discountAmount)} no pedido de agora. Ele acompanha as mudanças do pedido.`,
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
    setCouponProblem(null);
  };

  const sendOrder = async (data: QuoteFormData, couponToUse: AppliedCoupon | null) => {
    setServerError(null);
    setCouponProblem(null);
    setStructuresGone([]);

    if (!equipments.length && !kit?.id && !services.length) {
      setServerError('Adicione algum item ao carrinho antes de prosseguir.');
      addNotification({
        type: 'warning',
        title: 'Carrinho vazio',
        message: 'Adicione algum item ao carrinho antes de prosseguir.'
      });
      return;
    }

    // O23: a recusa diz qual item.
    if (unavailableNames.length > 0) {
      const msg = `Não dá para enviar com item indisponível: ${unavailableNames.join(', ')}. Tire do carrinho e envie de novo.`;
      setServerError(msg);
      addNotification({ type: 'warning', title: 'Item indisponível', message: msg });
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

    // O6: o evento é do início ao término (a validação garante os dois); a montagem vai à parte, quando veio.
    const range = quoteEventRange(data);
    if (!range) {
      setServerError('Confira a data e os horários do evento.');
      return;
    }

    // O7: antes do envio, o cupom é validado de novo com o subtotal e o e-mail de agora. Recusado, a pessoa decide
    // (tirar e enviar, ou revisar), sem perder nada do formulário. Sem resposta da validação, o servidor confere no envio.
    if (couponToUse) {
      try {
        const check = await requestCouponCheck(couponToUse.code, isGuest ? data.email || undefined : undefined);
        if (check && check.valid === false) {
          setCouponProblem({ code: couponToUse.code, reason: check.reason || 'Cupom inválido.' });
          return;
        }
      } catch (err: unknown) {
        logger.warn('Validação do cupom antes do envio falhou; o servidor confere no envio', 'QuoteRequestPage', err);
      }
    }

    try {
      const eventDuration = Math.max(1, Math.ceil(range.hours));
      const bookingData: QuoteBookingPayload = {
        eventDate: range.start.toISOString(),
        eventEndDate: range.end.toISOString(),
        eventDuration,
        location: data.venue,
        street: data.street,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        addressNumber: data.addressNumber,
        addressComplement: data.addressComplement || undefined,
        // O25: "Não sei" grava o caso comum; a resposta como a pessoa marcou vai no texto do pedido.
        ...logisticsFlags(data),
        specialRequests: quoteRequestText({ ...data, setupTime: range.setup ? data.setupTime : null }),
        notes: data.notes || undefined,
        status: 'PENDING',
        ...(range.setup ? { setupTime: range.setup.toISOString() } : {}),
        clientName: user?.name || data.name?.trim() || undefined,
        clientContact: data.phone.trim(),
      };

      if (data.email) bookingData.clientEmail = data.email;
      if (kit?.id) bookingData.kitId = kit.id;
      if (couponToUse) bookingData.couponCode = couponToUse.code;

      // Palco (13/11/2026): as estruturas marcadas vão como equipamento (structureOptions já tira o que está no carrinho).
      const equipmentIds = [...cartEquipmentIds, ...chosenStructures.map((eq) => eq.id)];

      // Lote 13: os técnicos marcados na caixa vão junto com os serviços do carrinho, sem repetir. E1: o serviço que já
      // vem no kit não vai de novo. E5: a montagem marcada vai como o serviço do catálogo.
      const serviceIds = Array.from(new Set(orderServices.map((it) => it.id))).filter(Boolean);

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
        formData: { ...data, duration: eventDuration },
        cartItems: [
          ...(kit?.id ? [{ name: kit?.name ? `Kit: ${kit.name}` : 'Kit Selecionado' }] : []),
          ...equipments.map((it) => ({ name: equipmentOf(it).name })),
          ...chosenStructures.map((eq) => ({ name: eq.name })),
          ...orderServices.map((it) => ({ name: it.name })),
        ]
      };

      navigate(createdBooking?.id ? `/orcamento-sucesso/${createdBooking.id}` : '/orcamento-sucesso', { state: statePayload });
    } catch (err: unknown) {
      logger.error('Erro ao criar booking', 'QuoteRequestPage', err);
      const msg = (axios.isAxiosError(err) && err.response?.data?.message) || (err instanceof Error ? err.message : null) || 'Erro ao salvar pedido.';
      setServerError(msg);
      // O19/O23: item que ficou indisponível entre abrir a página e enviar: o carrinho é relido e o aviso diz qual.
      if (/não está disponível/i.test(msg)) {
        Promise.resolve(refreshCart?.({ force: true })).catch(() => undefined);
        // Palco (13/11/2026): a estrutura marcada não está no carrinho; a lista das estruturas é relida.
        if (chosenStructures.length > 0) reloadStructures(chosenStructures);
      }

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

  const onSubmit: SubmitHandler<QuoteFormData> = (data) => sendOrder(data, appliedCoupon);

  // O7: "Tirar o cupom e enviar": manda o mesmo formulário, sem o cupom.
  const sendWithoutCoupon = () => {
    handleRemoveCoupon();
    void handleSubmit((data) => sendOrder(data, null))();
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

  const durationMinutes = Math.round(durationHours * 60);
  const endNote = eventRange ? quoteEventEndNote(eventRange) : '';
  const discount = coupon?.amount ?? 0;

  return (
    <ClientPage
      width="4xl"
      title="Finalizar Orçamento"
      description="Revise os detalhes abaixo para que possamos preparar o melhor serviço para você."
    >
      <Card className="p-4 shadow-xl sm:p-8">
        {unavailableNames.length > 0 && (
          <Alert variant="warning" className="mb-8">
            {unavailableNames.length === 1 ? 'Este item não está disponível agora' : 'Estes itens não estão disponíveis agora'}:{' '}
            <strong>{unavailableNames.join(', ')}</strong>. Tire do <Link to="/carrinho" className="underline">carrinho</Link> para enviar o pedido.
          </Alert>
        )}

        {serverError && (
          <Alert variant="error" className="mb-8">
            {serverError}
          </Alert>
        )}

        {/* Palco (13/11/2026): a estrutura marcada que deixou de estar ativa saiu do pedido (lista relida). */}
        {structuresGone.length > 0 && (
          <Alert variant="warning" className="mb-8">
            {structuresGone.length === 1 ? 'Saiu do pedido por não estar disponível agora' : 'Saíram do pedido por não estarem disponíveis agora'}:{' '}
            <strong>{structuresGone.join(', ')}</strong>. Confira a estimativa e envie de novo.
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

              {/* O6: início e término do evento, como no briefing; a montagem é outro campo. Auditoria do orçamento
                  (12/11/2026), fuso: o horário é o de Brasília, onde o evento acontece (utils/quoteSubmission.ts). */}
              <Input
                label="Início do evento *"
                type="time"
                leftIcon={<Clock className="h-4 w-4" />}
                {...register('startTime')}
                error={errors.startTime?.message}
                helperText="Horário de Brasília."
              />

              <Input
                label="Término do evento *"
                type="time"
                leftIcon={<Clock className="h-4 w-4" />}
                {...register('endTime')}
                error={errors.endTime?.message}
                helperText="Se acabar depois da meia-noite, é o horário do dia seguinte."
              />

              <Input
                label="Data do término (opcional)"
                type="date"
                leftIcon={<Calendar className="h-4 w-4" />}
                {...register('endDate')}
                error={errors.endDate?.message}
                helperText="Só para evento ou aluguel de mais de um dia. Em branco, o término é no mesmo dia (ou na madrugada seguinte)."
              />

              <Input
                label="Hora da montagem (opcional)"
                type="time"
                leftIcon={<Wrench className="h-4 w-4" />}
                {...register('setupTime')}
                error={errors.setupTime?.message}
                helperText="A partir de quando o local libera a montagem. Não muda o horário do evento."
              />
            </Grid>
            {durationMinutes > 0 && (
              <p className="mt-6 text-sm text-muted-foreground">
                Duração do evento: {serviceMinutesText(durationMinutes)}{endNote}.
              </p>
            )}
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
            {freightText && <p className="mt-6 text-sm text-muted-foreground">{freightText}</p>}
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
                  <legend className="mb-3 text-sm font-semibold text-foreground">{legend} *</legend>
                  <div className="flex flex-wrap gap-x-6">
                    {logisticsOptions.map(({ value, label }) => (
                      <label key={value} className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-foreground">
                        <input type="radio" value={value} {...register(field)} className="h-4 w-4 accent-primary" /> {label}
                      </label>
                    ))}
                  </div>
                  {errors[field] && <p className="text-sm text-destructive">{errors[field]?.message}</p>}
                </fieldset>
              ))}
            </div>
          </section>

          {/* Lote 13, técnico durante o evento (decisão do dono de 06/11/2026): montar e buscar depois, ou um técnico
              durante todo o evento, cobrado pelas horas. E1: o técnico que o kit já traz aparece como incluso. */}
          {(technicianOffers.length > 0 || includedTechnicians.length > 0) && (
            <section className={sectionClass} aria-labelledby="tecnico-no-evento">
              <h2 id="tecnico-no-evento" className={sectionTitleClass}>
                <span className={sectionIconClass} aria-hidden="true">
                  <User className="h-5 w-5" />
                </span>
                Técnico no evento
              </h2>
              <div className="space-y-4">
                {includedTechnicians.map((svc) => (
                  <p key={svc.id} className="text-sm font-semibold text-foreground">{svc.name} incluso no kit.</p>
                ))}
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
                {/* E5: "a equipe monta" vale para o kit de entrega; no avulso, a montagem é à parte (seção abaixo). */}
                {isDeliveryKit && chosenTechnicians.length === 0 && includedTechnicians.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sem técnico, a equipe monta antes do evento e busca depois que ele termina.</p>
                )}
              </div>
            </section>
          )}

          {/* E5: montagem do equipamento avulso, cobrada à parte pelo serviço de montagem do catálogo. */}
          {offersSetup && (
            <section className={sectionClass} aria-labelledby="montagem-no-local">
              <h2 id="montagem-no-local" className={sectionTitleClass}>
                <span className={sectionIconClass} aria-hidden="true">
                  <Wrench className="h-5 w-5" />
                </span>
                Montagem
              </h2>
              <div className="space-y-4">
                {setupInKit && setupService ? (
                  <p className="text-sm font-semibold text-foreground">{setupService.name} incluso no kit.</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    A montagem do equipamento avulso é cobrada à parte. Sem ela, a equipe entrega o equipamento e busca depois, e a montagem fica com você.
                  </p>
                )}
                {setupService && !setupInCart && !setupInKit && (
                  <Checkbox
                    id="montagem-no-local-caixa"
                    label="Montagem no local pela equipe"
                    description={`${setupService.name}: ${formatPrice(setupService.price)}.`}
                    checked={wantsSetup}
                    onChange={(e) => setWantsSetup(e.target.checked)}
                  />
                )}
                {setupService && setupInCart && (
                  <p className="text-sm font-semibold text-foreground">A montagem pela equipe ({setupService.name}) já está no seu carrinho.</p>
                )}
              </div>
            </section>
          )}

          {/* Palco (13/11/2026): palco e estruturas à parte, numa seção recolhível. Cada item com o preço da diária e,
              com os horários, as diárias do evento e o valor; marcado, soma na estimativa e vai no pedido. O
              aria-controls só aponta para a lista quando ela está na página (aberta). */}
          {structureOptions.length > 0 && (
            <section className={sectionClass} aria-labelledby="palco-e-estruturas">
              <h2 id="palco-e-estruturas" className="m-0">
                <button
                  type="button"
                  onClick={() => setStructuresOpen((open) => !open)}
                  aria-expanded={structuresOpen}
                  aria-controls={structuresOpen ? 'palco-e-estruturas-itens' : undefined}
                  className="flex w-full items-center gap-3 rounded-xl text-left text-xl font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className={sectionIconClass} aria-hidden="true">
                    <Layers className="h-5 w-5" />
                  </span>
                  <span className="flex-1">Palco e estruturas (opcional)</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${structuresOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
              </h2>
              {!structuresOpen && chosenStructures.length > 0 && (
                <p className="mt-4 text-sm text-foreground">Marcados: {chosenStructures.map((eq) => eq.name).join(', ')}.</p>
              )}
              {structuresOpen && (
                <div id="palco-e-estruturas-itens" className="mt-6 space-y-4">
                  <p className="text-sm text-muted-foreground">{STRUCTURE_PRICE_NOTE} O que você marcar entra na estimativa e vai no pedido.</p>
                  <p className="text-sm font-semibold text-foreground">{STRUCTURE_LIGHTING_HINT}</p>
                  {structureOptions.map((eq) => {
                    const price = getEquipmentUnitPrice(eq);
                    const units = equipmentUnitsForHours(equipmentUnit, durationHours, getEquipmentMinimum(eq));
                    return (
                      <Checkbox
                        key={eq.id}
                        id={`estrutura-${eq.id}`}
                        label={eq.name}
                        description={`${formatPrice(price)}${equipmentUnitSuffix(equipmentUnit)}${units ? ` · ${equipmentUnitText(units, equipmentUnit)} no evento: ${formatPrice(price * units)}` : ''}.`}
                        checked={structureIds.includes(eq.id)}
                        onChange={(ev) => toggleStructure(eq.id, ev.target.checked)}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Seção 4: Contato. O26: WhatsApp com DDD para todos; nome e e-mail para quem pede sem conta. */}
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>
              <span className={sectionIconClass} aria-hidden="true">
                <User className="h-5 w-5" />
              </span>
              {isGuest ? 'Sua Identidade' : 'Seu contato'}
            </h2>
            <p className="text-sm text-muted-foreground -mt-2 mb-6">
              {isGuest
                ? 'Não é preciso criar conta antes — usamos esses dados para acompanhar seu pedido e você pode acessá-lo depois com este e-mail.'
                : 'É por este WhatsApp que a equipe fala com você sobre o pedido.'}
            </p>

            <Grid columns={{ sm: 1, md: 2 }} gap={6}>
              {isGuest && (
                <Input
                  label="Seu Nome *"
                  autoComplete="name"
                  leftIcon={<User className="h-4 w-4" />}
                  {...register('name')}
                  error={errors.name?.message}
                />
              )}

              {isGuest && (
                <Input
                  label="Seu E-mail *"
                  type="email"
                  autoComplete="email"
                  leftIcon={<Mail className="h-4 w-4" />}
                  {...register('email')}
                  error={errors.email?.message}
                />
              )}

              <Input
                label="WhatsApp com DDD *"
                type="tel"
                autoComplete="tel"
                leftIcon={<Phone className="h-4 w-4" />}
                placeholder="(31) 98888-7777"
                {...register('phone')}
                error={errors.phone?.message}
              />
            </Grid>
          </section>

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
                    {coupon?.belowMinimum && appliedCoupon.rule?.minOrderValue != null
                      ? `Este cupom vale a partir de ${formatPrice(appliedCoupon.rule.minOrderValue)} em itens; com o pedido de agora, ele não dá desconto.`
                      : `Desconto de ${formatPrice(discount)}`}
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
                {appliedCoupon && discount > 0 && (
                  <div className="flex justify-between font-semibold text-success">
                    <span>Desconto ({appliedCoupon.code})</span>
                    <span className="tabular-nums">- {formatPrice(discount)}</span>
                  </div>
                )}
                {/* Auditoria do orçamento (12/11/2026): o total do site não tem o frete; o e-mail e a proposta têm. */}
                <div className="flex justify-between text-foreground font-bold text-base pt-2">
                  <span>Total estimado (sem frete)</span>
                  <span className="tabular-nums">
                    {formatPrice(Math.max(0, subtotal - discount))}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground italic pt-1">
                  Estimativa dos itens. O frete, calculado pela distância até o local, e o pedágio, quando houver, entram na proposta que a equipe envia; o valor final é confirmado nela.
                </p>
              </div>
            )}
          </section>

          <div className="pt-6">
            {couponProblem && (
              <Alert variant="warning" className="mb-6">
                <p>
                  O cupom {couponProblem.code} não vale para este pedido: {couponProblem.reason}
                </p>
                <p className="mt-1">Você pode tirar o cupom e enviar assim mesmo; nada do que você preencheu se perde.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button type="button" size="sm" onClick={sendWithoutCoupon} isLoading={isSubmitting}>
                    Tirar o cupom e enviar
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setCouponProblem(null)}>
                    Revisar o pedido
                  </Button>
                </div>
              </Alert>
            )}
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
