import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { contactEventTitle, proposalNotesFromContact, type ContactProposalPrefill } from '../../utils/contactFormBlock';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  Textarea,
  Alert,
  ConfirmModal
} from '@/components/ui/StandardComponents';
import { 
  Plus, 
  Trash2, 
  Search, 
  Calculator, 
  Package, 
  Settings,
  Send,
  Zap,
  ArrowRight,
  AlertCircle,
  FileText,
  Sparkles
} from 'lucide-react';
import type { Client, Equipment, Kit, Service } from '@/types/types';
import { apiFetch } from '@/services/api';
import { fetchAllAdminClients } from '@/services/pagedFetch';
import { useNotifications } from '@/contexts/NotificationContext';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { formatPrice } from '@/utils/formatPrice';
import { toNumber } from '@/utils/typeSafeFormatters';
import { fieldErrorsSummary, PROPOSAL_FIELD_ORDER, proposalFieldErrors, type ProposalField, type ProposalFieldErrors } from '@/utils/quickProposalFields';
import { formatCep, isCompleteCep, lookupCep } from '@/utils/briefing';
import { equipmentUnits, equipmentUnitSuffix, equipmentUnitText, hoursBetween, kitPriceLine, priceUnitOf, serviceLine, type BookingItemLike, type EquipmentPriceUnit, type KitPricingInput, type ServicePricingInput } from '@/utils/bookingPricing';
import { isWholeEventService } from '@/utils/wholeEventService';
import { KIT_FULFILLMENT_LABEL, kitFulfillment } from '@/utils/kitInfo';
import { findSetupService } from '@/utils/cartCatalog';
import { proposalBaseFromBooking, type ProposalBaseBooking } from '@/utils/proposalFromBooking';
import type { BookingDetails } from '@/types/types';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useLeaveGuard } from '@/hooks/useLeaveGuard';
import { distributeTargetTotal, parseMoneyInput, proposalAlerts, type SameDayBooking } from '@/utils/proposalReview';
import { asArray } from '@/utils/normalize';

const ITEM_TYPE_LABELS: Record<string, string> = {
  EQUIPMENT: 'Equipamento',
  KIT: 'Kit',
  SERVICE: 'Serviço',
  CUSTOM: 'Personalizado',
};

const CATALOG_TABS = [
  { value: 'EQUIPMENT', label: 'Equipamentos' },
  { value: 'KIT', label: 'Kits' },
  { value: 'SERVICE', label: 'Serviços' },
] as const;

const PAGE_TITLE = 'Proposta Rápida';
const BREADCRUMBS = [
  { name: 'Admin', href: '/admin/painel' },
  { name: 'Reservas', href: '/admin/reservas' },
  { name: 'Nova proposta' },
];

// Mesma geração de chave do apiFetch (src/services/api.ts).
const newIdempotencyKey = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

interface ProposalItem {
  id: string;
  type: 'KIT' | 'EQUIPMENT' | 'SERVICE' | 'CUSTOM';
  sourceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  imageUrl?: string;
  // D8a e P16: equipamento do catálogo tem preço por hora ou por diária; o preço da linha acompanha as
  // datas do evento até alguém digitar outro preço. minimumUnits: o mínimo de diárias do cadastro.
  ratePerUnit?: number;
  minimumUnits?: number;
  priceEdited?: boolean;
  // Auditoria do orçamento (12/11/2026), O18/A4/C11: a unidade do preço (diária ou hora) que o servidor pôs no
  // equipamento (priceUnit do GET /equipments, que chega junto com o preço). Sem ela, a linha não acompanha as datas
  // e Salvar fica travado: nunca cobrar por hora quando o servidor está em diária.
  priceUnit?: EquipmentPriceUnit | null;
  // Lote 13 (campos do kit aprovados em 06/11/2026): o kit do catálogo guarda o preço do evento, as horas
  // incluídas, a hora extra e o tipo; a linha acompanha as datas do evento como a do equipamento.
  kit?: KitPricingInput;
  // Lote 13, técnico durante o evento (decisão do dono de 06/11/2026): o serviço marcado "Pode acompanhar o evento
  // todo" guarda o preço e a duração do cadastro; a linha acompanha as horas do evento (serviceLine), como a do kit.
  service?: ServicePricingInput;
  // Auditoria do orçamento (12/11/2026), E1/E3: os serviços que o kit do catálogo já traz dentro (itens do kit com
  // serviceId). Serviço que já vem no kit não entra de novo na proposta.
  includedServiceIds?: string[];
  // Linha posta pelo botão Frete (frete, pedágio ou "Frete a combinar"): o próximo clique a troca.
  freight?: boolean;
}

// "Sugerir itens" (ideia aprovada por Alyson em 20/11/2026): no orçamento de um pedido do briefing, a IA da Cloudflare
// lê as respostas do cliente e propõe kit, serviços e equipamentos do catálogo (POST /admin/bookings/:id/suggest-items).
// As linhas entram como as da busca (preço do catálogo, mesmas regras: um kit só, serviço que o kit traz não entra de
// novo), a equipe confere e muda o que quiser, e nada é gravado sem Salvar.
const BRIEFING_MARK = '— Briefing preenchido pelo cliente —';
interface AiSuggestedLine {
  id: string;
  name: string;
  quantity: number;
  reason: string;
}
interface AiSuggestion {
  kit: { id: string; name: string; reason: string } | null;
  services: AiSuggestedLine[];
  equipment: AiSuggestedLine[];
  observations: string[];
}
interface AppliedSuggestion {
  added: Array<{ name: string; reason: string }>;
  skipped: string[];
  observations: string[];
}

// Auditoria do orçamento (12/11/2026), E4: a regra do frete da proposta, como a do servidor (freightMode): com kit de
// entrega, a do kit (o equipamento avulso vai na mesma entrega); sem ele, com equipamento avulso, a do avulso. Só
// serviços ou só kit de retirada: sem frete (null).
type FreightMode = 'KIT_DELIVERY' | 'EQUIPMENT';
const freightModeOf = (items: ProposalItem[]): FreightMode | null => {
  if (items.some((i) => i.kit && kitFulfillment(i.kit) !== 'CLIENT_PICKUP')) return 'KIT_DELIVERY';
  return items.some((i) => i.type === 'EQUIPMENT') ? 'EQUIPMENT' : null;
};

// O17/C9: o endereço e a regra usados no cálculo do frete. Se um dos dois muda depois, as linhas ficam desatualizadas.
const freightKey = (address: Record<string, string>, mode: FreightMode | null): string =>
  JSON.stringify([...Object.values(address).map((value) => value.trim().toLowerCase().replace(/\s+/g, ' ')), mode]);

// E1/E3: a linha de kit da proposta que já traz o serviço, pela composição do kit (não pelo nome).
const kitIncluding = (serviceId: string, items: ProposalItem[]): ProposalItem | undefined =>
  items.find((i) => i.includedServiceIds?.includes(serviceId));

const kitIncludesText = (kitLine: ProposalItem, serviceName: string): string =>
  `O kit "${kitLine.kit?.name || kitLine.description}" já inclui "${serviceName}".`;

// E19: a busca do catálogo só lista serviço ativo (o "Em breve" e o inativo não podem ser vendidos).
const isActiveService = (service: { status?: string | null }): boolean => (service.status ?? 'ACTIVE') === 'ACTIVE';
// Onda 2 da auditoria de 19/11 (F6P1-05): o mesmo para kit e equipamento. Para o admin, GET /kits e /equipments trazem
// todos os status, e a proposta era gravada com o item inativo, em manutenção ou "Em breve".
const isActiveCatalogItem = isActiveService;

// Auditoria do orçamento (12/11/2026), onda 2: a linha do frete sem valor ("Frete a combinar", "Pedágio à parte", do
// botão Frete ou digitada) aparece como "a combinar"/"à parte", nunca "R$ 0,00", e Salvar avisa antes de gravar. É a
// marca que o servidor põe na linha para o link e a ficha (toArrangeKind, na mesma onda): item personalizado, valor
// zero e a descrição que começa com "Frete" e diz "a combinar" ou começa com "Pedágio" e diz "à parte". Com valor
// digitado, é uma linha como as outras; o frete de R$ 0 "incluso no kit" não é marcado.
const PENDING_FREIGHT: Array<{ starts: RegExp; says: RegExp; label: string; note: string }> = [
  { starts: /^frete\b/, says: /\ba combinar\b/, label: 'a combinar', note: 'frete a combinar' },
  { starts: /^pedagio\b/, says: /\ba parte\b/, label: 'à parte', note: 'pedágio à parte' },
];
const pendingFreight = (item: Pick<ProposalItem, 'type' | 'description' | 'totalPrice'>) => {
  if (item.type !== 'CUSTOM' || Math.round(Math.max(0, item.totalPrice) * 100) > 0) return null;
  const text = item.description.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  return PENDING_FREIGHT.find(({ starts, says }) => starts.test(text) && says.test(text)) ?? null;
};
// "frete a combinar", "pedágio à parte": o que fica sem valor, sem repetir, para o subtotal e o aviso ao salvar.
const pendingFreightNotes = (items: ProposalItem[]): string[] =>
  [...new Set(items.map((item) => pendingFreight(item)?.note).filter((note): note is string => !!note))];

// O18/A4/C11: linha de equipamento com o preço do cadastro e sem a unidade do servidor (o preço digitado à mão vence).
const missingPriceUnit = (item: ProposalItem): boolean => item.ratePerUnit !== undefined && !item.priceEdited && !item.priceUnit;
// Sufixo do preço no catálogo pela unidade que veio no equipamento; sem ela, nenhum.
const unitSuffixOf = (item: unknown): string => {
  const unit = priceUnitOf(item);
  return unit ? equipmentUnitSuffix(unit) : '';
};

// O31/C12: quantidade inteira, a partir de 1; null para vazio, fração ou zero.
const parseQuantity = (raw: string): number | null => (/^\d+$/.test(raw.trim()) && Number(raw) >= 1 ? Number(raw) : null);

// E3/E5: o serviço de montagem do catálogo ("Roadie / Auxiliar de Montagem"), cobrado à parte no equipamento avulso
// (decisão de 12/11). A regra para achá-lo é a mesma do /orcamento: utils/cartCatalog.findSetupService (palavra
// "montagem" ou "roadie", ativo, não é o técnico do evento todo; com mais de um, o que mais kits trazem dentro).

// Preço do catálogo: equipamento pelo preço da unidade (a coluna pricePerHour guarda o da hora ou o da
// diária); kit (preço por evento) e serviço pelo preço do cadastro.
const catalogPrice = (type: string, item: Equipment | Kit | Service): number =>
  Number((type === 'EQUIPMENT' ? (item as Equipment).pricePerHour : (item as Kit | Service).price) || 0);

// D8a e P16 (aprovadas em 02/11/2026) e decisões do dono de 06/11: o kit tem preço por evento (nunca vezes
// as horas); o equipamento avulso custa por hora ou por diária (EQUIPMENT_PRICE_UNIT no servidor), vezes as
// unidades tiradas do início e do término; o serviço tem preço fixo. Antes o equipamento entrava com
// dailyPrice, que não existe no cadastro: R$ 0. O preço digitado à mão vence. Sem as datas ainda, conta 1
// unidade (ou o mínimo de diárias). Auditoria do orçamento (12/11/2026), O18/A4/C11: a unidade é a de cada
// equipamento (priceUnit), não mais a da consulta GET /equipments/pricing-rules, que valia "hora" enquanto carregava
// ou se falhasse; sem a unidade, a linha fica com o preço do cadastro e Salvar pede a unidade.
const unitsFor = (item: ProposalItem, unit: EquipmentPriceUnit, start: string, end: string): number =>
  equipmentUnits(unit, start, end, item.minimumUnits) ?? Math.max(1, unit === 'day' ? item.minimumUnits ?? 1 : 1);

const priceItems = (items: ProposalItem[], start: string, end: string): ProposalItem[] =>
  items.map((item) => {
    if (item.kit && !item.priceEdited) {
      const unitPrice = kitPriceLine(item.kit, hoursBetween(start, end)).cents / 100;
      return { ...item, unitPrice, totalPrice: Math.max(0, Math.round((unitPrice * item.quantity - item.discount) * 100) / 100) };
    }
    if (item.service && !item.priceEdited) {
      const unitPrice = serviceLine(item.service, hoursBetween(start, end)).cents / 100;
      return { ...item, unitPrice, totalPrice: Math.max(0, Math.round((unitPrice * item.quantity - item.discount) * 100) / 100) };
    }
    if (item.ratePerUnit === undefined || item.priceEdited || !item.priceUnit) return item;
    const unitPrice = Math.round(item.ratePerUnit * unitsFor(item, item.priceUnit, start, end) * 100) / 100;
    return { ...item, unitPrice, totalPrice: Math.max(0, Math.round((unitPrice * item.quantity - item.discount) * 100) / 100) };
  });

// Descrição que vai para a reserva, o PDF e a página do cliente: com as horas ou diárias, quando o preço
// acompanha as datas.
const lineDescription = (item: ProposalItem, start: string, end: string): string => {
  // Kit: a descrição da conta do servidor com o nome da linha; com o preço digitado à mão, sem hora extra.
  if (item.kit) return kitPriceLine({ ...item.kit, name: item.description }, item.priceEdited ? null : hoursBetween(start, end)).description;
  // Técnico durante o evento: a descrição com as horas da conta do servidor; com o preço digitado à mão, só o nome.
  if (item.service && !item.priceEdited) return serviceLine({ ...item.service, name: item.description }, hoursBetween(start, end)).description;
  const unit = item.ratePerUnit !== undefined && !item.priceEdited ? item.priceUnit : null;
  const n = unit ? equipmentUnits(unit, start, end, item.minimumUnits) : null;
  return unit && n ? `${item.description} (${equipmentUnitText(n, unit)})` : item.description;
};

const catalogLine = (type: ProposalItem['type'], item: Equipment | Kit | Service): ProposalItem => {
  // Kit: as "horas incluídas no preço" (minimumRentalDuration), a hora extra e o tipo vão para a conta do
  // kit (kitPriceLine), que monta a descrição com as horas (decisões do dono de 06/11).
  const catalogKit = item as Kit;
  return {
    id: Math.random().toString(36).substr(2, 9),
    type,
    sourceId: item.id,
    description: item.name,
    quantity: 1,
    unitPrice: catalogPrice(type, item),
    discount: 0,
    totalPrice: catalogPrice(type, item),
    imageUrl: item.imageUrl,
    ...(type === 'EQUIPMENT'
      ? {
          ratePerUnit: catalogPrice(type, item),
          minimumUnits: (item as Equipment & { minimumRentalDuration?: number | null }).minimumRentalDuration ?? undefined,
          priceUnit: priceUnitOf(item),
        }
      : {}),
    ...(type === 'KIT'
      ? {
          kit: {
            name: item.name,
            price: catalogPrice(type, item),
            minimumRentalDuration: catalogKit.minimumRentalDuration ?? null,
            extraHourPrice: catalogKit.extraHourPrice ?? null,
            fulfillment: kitFulfillment(catalogKit),
          },
          includedServiceIds: (catalogKit.items ?? [])
            .map((kitItem) => kitItem.serviceId ?? kitItem.service?.id)
            .filter((id): id is string => !!id),
        }
      : {}),
    ...(type === 'SERVICE' && (item as Service).coversWholeEvent === true
      ? {
          service: {
            name: item.name,
            price: catalogPrice(type, item),
            duration: (item as Service).duration ?? null,
            coversWholeEvent: true,
          },
        }
      : {}),
  };
};

// A-06: cada item gravado vira a linha da tela. Item do catálogo (kit, equipamento, serviço) entra como o da busca
// (mesmas regras: horas, diárias, kit que traz serviço); se o preço de hoje do catálogo não bate com o gravado (preço
// negociado, ou o catálogo mudou), fica o gravado, como um preço digitado à mão. O desconto gravado (o "Fechar no
// valor") fica na linha. Item fora do catálogo (frete, pedágio, item à mão, ou do catálogo apagado) entra como está.
const linesFromBookingItems = (
  saved: BookingItemLike[],
  catalog: { equipments: Equipment[]; kits: Kit[]; services: Service[] },
  start: string,
  end: string,
): ProposalItem[] =>
  saved.map((item) => {
    const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    const discount = Math.max(0, Number(item.discount) || 0);
    const totalPrice = Math.max(0, Number(item.totalPrice ?? unitPrice * quantity - discount) || 0);
    const type = item.itemType;
    const source =
      type === 'KIT' && item.kitId ? catalog.kits.find((k) => k.id === item.kitId)
      : type === 'EQUIPMENT' && item.equipmentId ? catalog.equipments.find((e) => e.id === item.equipmentId)
      : type === 'SERVICE' && item.serviceId ? catalog.services.find((sv) => sv.id === item.serviceId)
      : undefined;
    if (source && (type === 'KIT' || type === 'EQUIPMENT' || type === 'SERVICE')) {
      const line: ProposalItem = { ...catalogLine(type, source), quantity, discount };
      const [priced] = priceItems([line], start, end);
      if (Math.round(priced.unitPrice * 100) === Math.round(unitPrice * 100)) return priced;
      return { ...line, unitPrice, totalPrice, priceEdited: true };
    }
    const description = item.description || 'Item';
    return {
      id: Math.random().toString(36).slice(2, 11),
      type: 'CUSTOM' as const,
      description,
      quantity,
      unitPrice,
      discount,
      totalPrice,
      ...(/^(frete|pedagio)\b/.test(description.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()) ? { freight: true } : {}),
    };
  });

// A-06: o que identifica a lista de itens (para saber se ela mudou depois de preenchida com os itens da reserva).
const linesKey = (lines: ProposalItem[]): string =>
  JSON.stringify(lines.map((l) => [l.type, l.sourceId ?? '', l.description, l.quantity, Math.round(l.unitPrice * 100), Math.round(l.discount * 100)]));

const AdminQuickProposalPage = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quotingFreight, setQuotingFreight] = useState(false);
  // O31/C12: o texto digitado na quantidade enquanto não é um inteiro a partir de 1 (vazio, fração, zero), por linha.
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  // Onda 2: Salvar com linha "a combinar"/"à parte" pede confirmação.
  const [confirmPendingFreight, setConfirmPendingFreight] = useState(false);
  // O17/C9: o endereço e a regra do último cálculo do frete (freightKey); null antes do primeiro.
  const [freightQuotedKey, setFreightQuotedKey] = useState<string | null>(null);
  // "Sugerir itens" (20/11/2026): esperando a IA, e o que a última sugestão pôs, deixou de fora e pediu para conferir.
  const [suggesting, setSuggesting] = useState(false);
  const [appliedSuggestion, setAppliedSuggestion] = useState<AppliedSuggestion | null>(null);
  // Id da linha que cada atalho pôs da última vez (chave: o id do serviço do Técnico, "manual" no item à mão, ou
  // "montagem").
  const shortcutLineIds = useRef<Record<string, string>>({});

  // D24 (aprovada em 02/11/2026): "Transformar em proposta", na tela de contatos, abre esta página com os dados do
  // formulário no estado da navegação. Lido uma vez, ao abrir; recarregar a página começa vazio, como antes. A data
  // informada não vira horário (o campo pede hora): vai nas observações e num aviso perto de Início e Término.
  const routerLocation = useLocation();
  const [fromContact] = useState<ContactProposalPrefill | null>(
    () => (routerLocation.state as { fromContact?: ContactProposalPrefill } | null)?.fromContact ?? null,
  );
  // 18/11/2026: "Montar orçamento" da ficha abre esta página com ?reserva=<código> (pedido do briefing, sem itens do
  // catálogo). A tela vem com a reserva (cliente, datas, endereço e o briefing à vista) e salvar troca os itens dela, sem
  // criar outra reserva (ver utils/proposalFromBooking). Fica no endereço: recarregar a página abre a mesma reserva.
  const bookingId = useMemo(
    () => new URLSearchParams(routerLocation.search).get('reserva')?.trim() || null,
    [routerLocation.search],
  );
  const [baseBooking, setBaseBooking] = useState<ProposalBaseBooking | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  // Teste do painel de 25/11/2026 (A-06): "Refazer orçamento" abria a tela vazia, e mudar uma quantidade pedia refazer
  // todos os itens (o desconto do "Fechar no valor" se perdia). Agora a tela abre com os itens gravados da reserva, com
  // os preços e descontos de hoje; a chave deles diz se algo mudou (sair sem mudar nada não pergunta).
  const baseItemsRef = useRef<BookingItemLike[]>([]);
  const itemsPrefilledRef = useRef(false);
  const [prefilledItemsKey, setPrefilledItemsKey] = useState<string | null>(null);

  // Form State - Cliente
  const [clientType, setClientType] = useState<'registered' | 'manual'>('manual');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientName, setClientName] = useState(fromContact?.name ?? '');
  const [clientEmail, setClientEmail] = useState(fromContact?.email ?? '');
  const [clientContact, setClientContact] = useState(fromContact?.phone ?? '');
  // Form State - Evento
  const [eventTitle, setEventTitle] = useState(fromContact ? contactEventTitle(fromContact) : '');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [notes, setNotes] = useState(fromContact ? proposalNotesFromContact(fromContact) : '');

  // Form State - Endereço (obrigatórios pelo backend)
  const [street, setStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  // Teste do painel de 25/11/2026 (A-09 e A-11): os erros de cada campo, ao lado dele (somem quando o campo muda).
  const [fieldErrors, setFieldErrors] = useState<ProposalFieldErrors>({});
  const clearFieldError = (field: ProposalField) =>
    setFieldErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  const onField = (field: ProposalField, setter: (value: string) => void) => (e: { target: { value: string } }) => {
    setter(e.target.value);
    clearFieldError(field);
  };
  // A-10: o CEP completo busca o endereço (ViaCEP, como o passo 1 do aceite do cliente) e preenche o que está vazio.
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'notFound'>('idle');
  const cepAbortRef = useRef<AbortController | null>(null);

  // Items State
  const [items, setItems] = useState<ProposalItem[]>([]);
  // Teste de ponta a ponta (21/11/2026): sair sem salvar (Cancelar, menu, recarregar) perdia as linhas sem aviso. Com
  // linhas na proposta, pergunta antes; salvar navega pelo código e não passa pelo aviso (ver hooks/useLeaveGuard).
  const hasUnsavedLines = items.length > 0 && linesKey(items) !== prefilledItemsKey;
  const { guardClose, isConfirmOpen: leaveConfirmOpen, confirmDiscard: confirmLeave, cancelDiscard: cancelLeave } = useUnsavedChangesGuard(hasUnsavedLines);
  useLeaveGuard(hasUnsavedLines, (to) => guardClose(() => navigate(to)));
  const [clients, setClients] = useState<Client[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  // Catalog Search
  const [searchType, setSearchType] = useState<'EQUIPMENT' | 'KIT' | 'SERVICE'>('EQUIPMENT');
  const [searchTerm, setSearchTerm] = useState('');
  // Falha ao carregar o catálogo virava só um toast e a tela seguia com o catálogo vazio.
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Achado (revisão antes do deploy): cada clique em "Salvar proposta" mandava uma
  // Idempotency-Key nova, então tentar de novo depois de um erro podia gravar a reserva duas
  // vezes. O mesmo envio (mesmo corpo) repete a chave e o backend devolve a reserva já gravada;
  // se o formulário mudou, é outro envio e ganha chave nova.
  const lastSubmissionRef = useRef<{ body: string; key: string } | null>(null);

  // A reserva do "Montar orçamento" preenche a tela uma vez: o "Tentar de novo" do catálogo não desfaz o que foi digitado.
  const prefilledRef = useRef(false);
  const loadBaseBooking = async (id: string): Promise<ProposalBaseBooking | null> => {
    try {
      setBookingError(null);
      const raw = await apiFetch<BookingDetails>(`/bookings/${encodeURIComponent(id)}`);
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !raw.id) throw new Error('Reserva não encontrada.');
      const base = proposalBaseFromBooking(raw);
      setBaseBooking(base);
      // A-06: os itens gravados, para preencher a tela depois que o catálogo chegar (uma vez só).
      const savedItems = (raw as { items?: unknown }).items;
      if (!itemsPrefilledRef.current) baseItemsRef.current = Array.isArray(savedItems) ? (savedItems as BookingItemLike[]) : [];
      if (!prefilledRef.current) {
        prefilledRef.current = true;
        setEventTitle(base.eventTitle);
        setLocation(base.location);
        setEventDate(base.eventDate);
        setEventEndDate(base.eventEndDate);
        setStreet(base.street);
        setAddressNumber(base.addressNumber);
        setNeighborhood(base.neighborhood);
        setCity(base.city);
        setState(base.state);
        setZipCode(base.zipCode);
      }
      return base;
    } catch (error: unknown) {
      setBaseBooking(null);
      setBookingError(error instanceof Error && error.message ? error.message : 'Não foi possível abrir a reserva.');
      return null;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setCatalogError(null);
        const base = bookingId ? await loadBaseBooking(bookingId) : null;
        const [clientsRes, equipsRes, kitsRes, servicesRes] = await Promise.all([
          // Onda 2 da auditoria de 19/11 (F6P1-04): todos os clientes, não só os 50 mais novos.
          fetchAllAdminClients<Client>(),
          apiFetch<Equipment[]>('/equipments'),
          apiFetch<Kit[]>('/kits'),
          apiFetch<Service[]>('/services')
        ]);
        setClients(Array.isArray(clientsRes) ? clientsRes : []);
        setEquipments(Array.isArray(equipsRes) ? equipsRes : []);
        setKits(Array.isArray(kitsRes) ? kitsRes : []);
        setServices(Array.isArray(servicesRes) ? servicesRes : []);
        // A-06: os itens gravados da reserva entram na tela (com os itens liberados; travados, a tela nem salva).
        if (base && !base.lockedReason && !itemsPrefilledRef.current && baseItemsRef.current.length > 0) {
          itemsPrefilledRef.current = true;
          const lines = linesFromBookingItems(
            baseItemsRef.current,
            {
              equipments: Array.isArray(equipsRes) ? equipsRes : [],
              kits: Array.isArray(kitsRes) ? kitsRes : [],
              services: Array.isArray(servicesRes) ? servicesRes : [],
            },
            base.eventDate,
            base.eventEndDate,
          );
          setItems(lines);
          setPrefilledItemsKey(linesKey(lines));
        }
      } catch (error: unknown) {
        const err = error as { message?: string } | null;
        setCatalogError(err?.message || 'Não foi possível carregar clientes e catálogo.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [reloadKey, bookingId]);

  const pricedItems = useMemo(
    () => priceItems(items, eventDate, eventEndDate),
    [items, eventDate, eventEndDate]
  );

  const subtotal = useMemo(() => {
    return pricedItems.reduce((sum, item) => sum + toNumber(item.totalPrice), 0);
  }, [pricedItems]);
  const pendingNotes = pendingFreightNotes(pricedItems);
  // M-08: a soma dos descontos das linhas (o "Fechar no valor" reparte o desconto entre elas).
  const totalDiscount = Math.round(pricedItems.reduce((sum, item) => sum + Math.max(0, toNumber(item.discount)), 0) * 100) / 100;

  // Pedido de Alyson de 24/11/2026: "Fechar no valor". A equipe digita o total que quer cobrar e o desconto é dividido entre os itens
  // pelo preço de tabela (utils/proposalReview), com a soma batendo no centavo. Frete e pedágio ficam como estão.
  const [targetDraft, setTargetDraft] = useState('');
  const [closedTarget, setClosedTarget] = useState<number | null>(null);
  const hasDiscount = pricedItems.some((item) => item.discount > 0);
  const closeAtTarget = () => {
    const target = parseMoneyInput(targetDraft);
    if (target === null) {
      addNotification({ type: 'error', title: 'Valor inválido', message: 'Digite o total, por exemplo 1.000 ou 1.000,00.' });
      return;
    }
    const result = distributeTargetTotal(pricedItems, target);
    if (!result.ok) {
      addNotification({ type: 'warning', title: 'Não deu para fechar nesse valor', message: result.reason });
      return;
    }
    setItems((prev) => prev.map((item) => {
      const discount = result.discounts[item.id];
      const priced = pricedItems.find((p) => p.id === item.id);
      if (discount === undefined || !priced) return item;
      return { ...item, discount, totalPrice: Math.max(0, Math.round((priced.unitPrice * priced.quantity - discount) * 100) / 100) };
    }));
    setClosedTarget(target);
    addNotification({ type: 'success', title: 'Total fechado', message: `Total em ${formatPrice(target / 100)}: o desconto ficou dividido entre os itens.` });
  };
  const clearDiscounts = () => {
    setItems((prev) => prev.map((item) => ({ ...item, discount: 0, totalPrice: Math.max(0, Math.round(item.unitPrice * item.quantity * 100) / 100) })));
    setClosedTarget(null);
  };

  // Pedido de Alyson de 24/11/2026: outras reservas no(s) dia(s) do evento, para a conferência (a lista do painel filtra pelo dia de
  // Brasília). Canceladas e reembolsadas ficam de fora, e a própria reserva também.
  const eventDay = eventDate.slice(0, 10);
  const eventEndDay = eventEndDate.slice(0, 10);
  const dayKey = /^\d{4}-\d{2}-\d{2}$/.test(eventDay)
    ? `${eventDay}|${/^\d{4}-\d{2}-\d{2}$/.test(eventEndDay) && eventEndDay >= eventDay ? eventEndDay : eventDay}`
    : '';
  const [sameDayState, setSameDayState] = useState<{ key: string; list: SameDayBooking[] }>({ key: '', list: [] });
  useEffect(() => {
    if (!dayKey) return;
    let active = true;
    const [from, to] = dayKey.split('|');
    Promise.resolve()
      .then(() => apiFetch(`/bookings?startDate=${from}&endDate=${to}&limit=50`))
      .then((data) => { if (active) setSameDayState({ key: dayKey, list: asArray<SameDayBooking>(data) }); })
      .catch(() => { if (active) setSameDayState({ key: dayKey, list: [] }); });
    return () => { active = false; };
  }, [dayKey]);
  const sameDay = sameDayState.key === dayKey && dayKey
    ? sameDayState.list.filter((b) => b.id !== bookingId && !['CANCELLED', 'REFUNDED'].includes(String(b.status)))
    : [];

  const filteredCatalogItems = useMemo(() => {
    // E19 (auditoria do orçamento, 12/11/2026): o GET /services do admin traz também os inativos e os "Em breve".
    const source = searchType === 'EQUIPMENT' ? equipments.filter(isActiveCatalogItem) : searchType === 'KIT' ? kits.filter(isActiveCatalogItem) : services.filter(isActiveService);
    if (!searchTerm.trim()) return source;
    const lower = searchTerm.toLowerCase();
    return source.filter((item: Equipment | Kit | Service) => item.name?.toLowerCase().includes(lower));
  }, [searchType, searchTerm, equipments, kits, services]);

  // Lote 13: os serviços do botão Técnico (marcados "Pode acompanhar o evento todo" e ativos).
  const technicianServices = useMemo(() => services.filter(isWholeEventService), [services]);
  // E3/E5: o serviço de montagem do catálogo, para o atalho Montagem.
  const assemblyService = useMemo(() => findSetupService(services, kits), [services, kits]);

  const addItemToProposal = (type: ProposalItem['type'], item: Equipment | Kit | Service) => {
    // E1/E3 (auditoria do orçamento, 12/11/2026): serviço que algum kit da proposta já traz não entra de novo.
    const includedBy = type === 'SERVICE' ? kitIncluding(item.id, items) : undefined;
    if (includedBy) {
      addNotification({ type: 'warning', title: 'Já incluso no kit', message: kitIncludesText(includedBy, item.name) });
      return;
    }
    // Auditoria do orçamento (12/11/2026), C13/O24: a reserva tem um kit só (kitId); antes o 2º kit entrava na tela e
    // o servidor ligava só o 1º à reserva.
    const currentKit = type === 'KIT' ? items.find((i) => i.type === 'KIT') : undefined;
    if (currentKit) {
      addNotification({
        type: 'warning',
        title: 'Um kit por reserva',
        message: `A proposta já tem o kit "${currentKit.description}". Uma reserva leva um kit só: para trocar, remova o kit atual e adicione o outro; para somar, use equipamentos e serviços avulsos.`,
      });
      return;
    }
    // C13/O24: o técnico que acompanha o evento todo é uma linha só (dois técnicos: quantidade 2 na linha), venha da
    // busca ou do botão Técnico.
    const sameWholeEvent = type === 'SERVICE' && (item as Service).coversWholeEvent === true
      ? items.find((i) => i.type === 'SERVICE' && i.sourceId === item.id)
      : undefined;
    if (sameWholeEvent) {
      addNotification({
        type: 'warning',
        title: 'Já está na proposta',
        message: `"${item.name}" acompanha o evento todo e já está na proposta. Para mais de um, mude a quantidade da linha.`,
      });
      return;
    }
    const line = catalogLine(type, item);
    setItems(prev => [...prev, line]);
    addNotification({ type: 'success', title: 'Item adicionado', message: item.name });
    // Kit que traz um serviço já posto na proposta: avisa (Salvar pede para tirar a linha do serviço).
    const repeated = items.find((i) => i.type === 'SERVICE' && i.sourceId && line.includedServiceIds?.includes(i.sourceId));
    if (repeated) {
      addNotification({ type: 'warning', title: 'Já incluso no kit', message: `${kitIncludesText(line, repeated.description)} Tire a linha desse serviço.` });
    }
  };

  // Q12 (respostas de 03/11): técnico, montagem e frete são cobrados à parte, como itens. Decisão de 06/11: a hora
  // extra do kit sem valor cadastrado entra como item, à mão; a do kit com valor cadastrado já vem na linha do kit
  // (lote 13). Decisões de 12/11 (auditoria do orçamento): o frete segue a regra nova (botão Frete) e a montagem do
  // avulso é o serviço de montagem do catálogo (atalho Montagem).
  const customLine = (description: string): ProposalItem => ({
    id: Math.random().toString(36).substr(2, 9),
    type: 'CUSTOM',
    description,
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    totalPrice: 0
  });

  const addCustomItem = (description = 'Novo Serviço/Item') => {
    setItems(prev => [...prev, customLine(description)]);
  };

  // Decisão do dono de 08/11/2026: clicar de novo em Técnico troca a linha que esse botão pôs da última vez, mesmo
  // editada, como no Frete, em vez de repetir o técnico (o 2º clique criava outra linha igual). Dois técnicos:
  // quantidade 2 na linha. Com mais de um serviço marcado, cada botão troca só a própria linha. O atalho Montagem segue
  // a mesma regra (auditoria do orçamento, 12/11/2026). C13/O24: o botão do técnico do evento todo troca também a linha
  // desse serviço posta pela busca do catálogo (antes as duas somavam); `alsoReplace` diz quais.
  const replaceShortcutLine = (button: string, line: ProposalItem, alsoReplace?: (item: ProposalItem) => boolean) => {
    const previous = shortcutLineIds.current[button];
    shortcutLineIds.current[button] = line.id;
    setItems((prev) => [...prev.filter((item) => item.id !== previous && !alsoReplace?.(item)), line]);
  };

  // E1/E3/E5 (auditoria do orçamento, 12/11/2026): os atalhos Técnico e Montagem não põem serviço que algum kit da
  // proposta já traz (avisam "o kit já inclui …"). Montagem põe o serviço de montagem do catálogo, com o preço do
  // cadastro, em vez da linha à mão de R$ 0.
  const addShortcutService = (button: string, service: Service) => {
    const includedBy = kitIncluding(service.id, items);
    if (includedBy) {
      addNotification({ type: 'warning', title: 'Já incluso no kit', message: kitIncludesText(includedBy, service.name) });
      return;
    }
    const sameService = service.coversWholeEvent === true
      ? (item: ProposalItem) => item.type === 'SERVICE' && item.sourceId === service.id
      : undefined;
    replaceShortcutLine(button, catalogLine('SERVICE', service), sameService);
    addNotification({ type: 'success', title: 'Item adicionado', message: service.name });
  };

  const addAssembly = () => {
    if (!assemblyService) {
      addNotification({ type: 'warning', title: 'Sem serviço de montagem', message: 'Nenhum serviço de montagem ativo no catálogo. Ative ou cadastre o "Roadie / Auxiliar de Montagem" em Serviços.' });
      return;
    }
    addShortcutService('montagem', assemblyService);
  };

  // "Sugerir itens" (20/11/2026): só no orçamento de um pedido do briefing, com os itens livres para mudar.
  const canSuggest = Boolean(baseBooking && !baseBooking.lockedReason && baseBooking.briefing.includes(BRIEFING_MARK));

  const withQuantity = (line: ProposalItem, quantity: number): ProposalItem => {
    const units = Number.isInteger(quantity) && quantity >= 1 ? Math.min(quantity, 99) : 1;
    return { ...line, quantity: units, totalPrice: Math.max(0, line.unitPrice * units - line.discount) };
  };

  // As linhas sugeridas entram pelas mesmas regras da busca do catálogo (addItemToProposal), de uma vez: o que não
  // está mais no catálogo, um 2º kit, serviço que o kit traz e item repetido ficam de fora, com o motivo.
  const applySuggestion = (suggestion: AiSuggestion | null | undefined): AppliedSuggestion => {
    const next = [...items];
    const added: AppliedSuggestion['added'] = [];
    const skipped: string[] = [];
    const observations = [...(suggestion?.observations ?? [])];

    if (suggestion?.kit) {
      const kit = kits.find((k) => k.id === suggestion.kit?.id && isActiveCatalogItem(k));
      const currentKit = next.find((i) => i.type === 'KIT');
      if (!kit) skipped.push(`${suggestion.kit.name}: não está mais no catálogo.`);
      else if (currentKit) skipped.push(`${kit.name}: a proposta já tem o kit "${currentKit.description}" (um kit por reserva).`);
      else {
        const kitLine = catalogLine('KIT', kit);
        next.push(kitLine);
        added.push({ name: kit.name, reason: suggestion.kit.reason });
        const repeated = next.find((i) => i.type === 'SERVICE' && i.sourceId && kitLine.includedServiceIds?.includes(i.sourceId));
        if (repeated) observations.push(`${kitIncludesText(kitLine, repeated.description)} Tire a linha desse serviço.`);
      }
    }
    for (const line of suggestion?.services ?? []) {
      const service = services.find((s) => s.id === line.id && isActiveService(s));
      if (!service) {
        skipped.push(`${line.name}: não está à venda no catálogo.`);
        continue;
      }
      const includedBy = kitIncluding(service.id, next);
      if (includedBy) {
        skipped.push(kitIncludesText(includedBy, service.name));
        continue;
      }
      if (next.some((i) => i.type === 'SERVICE' && i.sourceId === service.id)) {
        skipped.push(`${service.name}: já está na proposta.`);
        continue;
      }
      next.push(withQuantity(catalogLine('SERVICE', service), line.quantity));
      added.push({ name: line.quantity > 1 ? `${service.name} (${line.quantity})` : service.name, reason: line.reason });
    }
    for (const line of suggestion?.equipment ?? []) {
      const equipment = equipments.find((e) => e.id === line.id && isActiveCatalogItem(e));
      if (!equipment) {
        skipped.push(`${line.name}: não está mais no catálogo.`);
        continue;
      }
      if (next.some((i) => i.type === 'EQUIPMENT' && i.sourceId === equipment.id)) {
        skipped.push(`${equipment.name}: já está na proposta.`);
        continue;
      }
      next.push(withQuantity(catalogLine('EQUIPMENT', equipment), line.quantity));
      added.push({ name: line.quantity > 1 ? `${equipment.name} (${line.quantity})` : equipment.name, reason: line.reason });
    }
    setItems(next);
    return { added, skipped, observations };
  };

  const suggestItems = async () => {
    if (!baseBooking || suggesting) return;
    setSuggesting(true);
    try {
      const suggestion = await apiFetch<AiSuggestion>(`/admin/bookings/${encodeURIComponent(baseBooking.id)}/suggest-items`, {
        method: 'POST',
        body: '{}',
        timeoutMs: 30_000,
      });
      setAppliedSuggestion(applySuggestion(suggestion));
    } catch (error: unknown) {
      addNotification({
        type: 'warning',
        title: 'Sem sugestão agora',
        message: error instanceof Error && error.message ? error.message : 'A IA não respondeu. Monte à mão.',
      });
    } finally {
      setSuggesting(false);
    }
  };

  const updateItem = (id: string, field: keyof ProposalItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      // Preço digitado à mão deixa de acompanhar as datas do evento. Linha nunca negativa (o servidor recusa).
      const updated = { ...item, [field]: value, ...(field === 'unitPrice' ? { priceEdited: true } : {}) };
      updated.totalPrice = Math.max(0, (updated.unitPrice * updated.quantity) - updated.discount);
      return updated;
    }));
  };

  // Auditoria do orçamento (12/11/2026), O31/C12: a quantidade é inteira, a partir de 1. Vazio, zero ou fração fica só
  // no campo (com o aviso) e a linha segue com a última quantidade válida: a conta da tela e o que vai para a reserva
  // usam sempre a mesma. O aviso fica até o campo ganhar um inteiro, e Salvar recusa enquanto isso. Sair do
  // campo não descarta o texto: o clique em Salvar tira o foco do campo antes, e a quantidade anterior seria gravada
  // sem aviso. Antes a linha calculava com 1,5 e gravava 2 (2 × R$ 600 = R$ 900).
  const dropQuantityDraft = (id: string) => {
    setQuantityDrafts((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const changeQuantity = (id: string, raw: string) => {
    const quantity = parseQuantity(raw);
    if (quantity === null) {
      setQuantityDrafts((prev) => ({ ...prev, [id]: raw }));
      return;
    }
    dropQuantityDraft(id);
    updateItem(id, 'quantity', quantity);
  };

  // Frete por km (decisões do dono de 06/11/2026, item frete-km): o botão Frete pede ao servidor o frete do
  // endereço do evento (POST /admin/freight/quote, só admin; a chave do Google fica só no servidor), com a regra e
  // os valores do servidor e o pedágio estimado à parte. As linhas entram como itens personalizados e o valor
  // continua editável. Auditoria do orçamento (12/11/2026), E4 e O17/C9: o botão manda a regra da proposta (kit de
  // entrega: até 15 km vem no kit e, acima, só os km a mais; equipamento avulso: R$ 50 até 15 km e, acima, os km com o
  // mínimo) e não calcula quando a proposta só tem serviços ou só kit de retirada. Mudar o endereço ou a regra
  // depois de calcular deixa as linhas desatualizadas, e Salvar pede para recalcular.
  const pickupKit = items.find((i) => i.kit && kitFulfillment(i.kit) === 'CLIENT_PICKUP');
  const freightAddress = { street, addressNumber, neighborhood, city, state, zipCode };
  const freightMode = freightModeOf(items);
  const freightStale =
    freightQuotedKey !== null && items.some((i) => i.freight) && freightQuotedKey !== freightKey(freightAddress, freightMode);

  const freightLine = (description: string, price: number): ProposalItem => ({
    id: Math.random().toString(36).substr(2, 9),
    type: 'CUSTOM',
    description,
    quantity: 1,
    unitPrice: price,
    discount: 0,
    totalPrice: price,
    freight: true,
  });

  // Decisão de 07/11/2026: clicar de novo em Frete (outro endereço, outro cálculo) troca as linhas que o botão pôs da
  // última vez, mesmo editadas, em vez de repetir o frete. As outras linhas da proposta ficam como estão.
  const replaceFreightLines = (lines: ProposalItem[]) => {
    setItems((prev) => [...prev.filter((item) => !item.freight), ...lines]);
  };

  const quoteFreight = async () => {
    const address = freightAddress;
    const mode = freightMode;
    if (!mode) {
      // Sem o que entregar: não calcula e tira as linhas de um cálculo anterior, com o aviso.
      const hadLines = items.some((i) => i.freight);
      if (hadLines) replaceFreightLines([]);
      const reason = pickupKit
        ? `O kit "${pickupKit.kit?.name || pickupKit.description}" é de retirada e a proposta não tem equipamento avulso para entregar`
        : 'A proposta não tem equipamento nem kit de entrega (só serviços)';
      addNotification({ type: 'warning', title: 'Sem frete', message: `${reason}: não há frete.${hadLines ? ' As linhas do frete calculado antes saíram.' : ''}` });
      return;
    }
    if (Object.values(address).some((value) => !value.trim())) {
      addNotification({ type: 'warning', title: 'Endereço incompleto', message: 'Preencha o endereço do evento (rua, número, bairro, cidade, UF e CEP) para calcular o frete.' });
      return;
    }
    setQuotingFreight(true);
    try {
      const quote = await apiFetch<{ status?: string; items?: Array<{ description?: string; unitPrice?: number | string }> }>('/admin/freight/quote', {
        method: 'POST',
        body: JSON.stringify({ ...address, mode }),
      });
      const lines = (Array.isArray(quote?.items) ? quote.items : []).map((line) =>
        freightLine(line.description || 'Frete', Math.max(0, toNumber(line.unitPrice))),
      );
      if (lines.length === 0) throw new Error('Resposta do frete sem linhas.');
      replaceFreightLines(lines);
      if (quote?.status !== 'OK') {
        addNotification({ type: 'warning', title: 'Frete a combinar', message: 'Não deu para calcular a distância agora. Combine o frete com o cliente ou digite o valor na linha.' });
      }
    } catch {
      replaceFreightLines([freightLine('Frete a combinar', 0)]);
      addNotification({ type: 'error', title: 'Frete não calculado', message: 'Não foi possível calcular o frete agora. Digite o valor na linha "Frete a combinar".' });
    } finally {
      setFreightQuotedKey(freightKey(address, mode));
      setQuotingFreight(false);
    }
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
    dropQuantityDraft(id);
  };

  const changeZipCode = (raw: string) => {
    const formatted = formatCep(raw);
    setZipCode(formatted);
    clearFieldError('zipCode');
    cepAbortRef.current?.abort();
    if (!isCompleteCep(formatted)) {
      setCepStatus('idle');
      return;
    }
    const controller = new AbortController();
    cepAbortRef.current = controller;
    setCepStatus('loading');
    void lookupCep(formatted, controller.signal).then((address) => {
      if (controller.signal.aborted) return;
      if (!address) {
        setCepStatus('notFound');
        return;
      }
      setCepStatus('idle');
      // Só o que está vazio: o que a pessoa já digitou fica.
      if (address.street) setStreet((current) => current.trim() ? current : address.street);
      if (address.neighborhood) setNeighborhood((current) => current.trim() ? current : address.neighborhood);
      if (address.city) setCity((current) => current.trim() ? current : address.city);
      if (address.state) setState((current) => current.trim() ? current : address.state);
      for (const field of ['street', 'neighborhood', 'city', 'state'] as const) clearFieldError(field);
    });
  };

  const validate = (): string | null => {
    // Orçamento de uma reserva: só com ela aberta e com os itens liberados (a mesma regra do servidor).
    if (bookingId && !baseBooking) return bookingError || 'A reserva ainda não foi carregada.';
    if (baseBooking?.lockedReason) return baseBooking.lockedReason;
    if (items.length === 0) return 'Adicione pelo menos um item ao orçamento.';
    if (items.some((i) => !i.description.trim())) return 'Dê um nome a cada item do orçamento.';
    // Auditoria do orçamento (12/11/2026), O31/C12 e O18/A4/C11.
    if (items.some((i) => quantityDrafts[i.id] !== undefined)) return 'A quantidade de cada item é um número inteiro, a partir de 1 (sem fração e sem deixar vazio).';
    if (items.some(missingPriceUnit)) return 'O servidor não informou se o preço do equipamento é por diária ou por hora. Recarregue a página e adicione o equipamento de novo, ou digite o preço da linha.';
    // A-09/A-11: datas, local, endereço e o cliente digitado são conferidos campo a campo (proposalFieldErrors, em
    // handleSave). No orçamento de uma reserva, o cliente é o dela e não muda por aqui.
    if (!bookingId && clientType === 'registered' && !selectedClientId) {
      return 'Selecione um cliente cadastrado.';
    }
    // Garantir que há pelo menos um item de catálogo (schema exige kitId ou equipmentIds ou serviceIds)
    const hasCatalogItem = items.some(i => i.type !== 'CUSTOM' && i.sourceId);
    if (!hasCatalogItem) return 'Adicione pelo menos um equipamento, kit ou serviço do catálogo.';
    // Auditoria do orçamento (12/11/2026), E1/E3: serviço que o kit já traz (posto antes do kit, por exemplo).
    for (const line of items) {
      const includedBy = line.type === 'SERVICE' && line.sourceId ? kitIncluding(line.sourceId, items) : undefined;
      if (includedBy) return `${kitIncludesText(includedBy, line.description)} Tire a linha desse serviço da proposta.`;
    }
    // O17/C9: frete calculado para outro endereço ou outra regra.
    if (freightStale) return 'O endereço ou os itens mudaram depois do cálculo do frete. Clique em Frete para recalcular (ou remova as linhas do frete).';
    return null;
  };

  const handleSave = async (status: 'PENDING', pendingFreightConfirmed = false) => {
    // A-09/A-11: todos os campos de uma vez, cada erro ao lado do campo, e o foco no primeiro.
    const errorsNow = proposalFieldErrors(
      { clientName, clientContact, clientEmail, location, eventDate, eventEndDate, zipCode, street, addressNumber, neighborhood, city, state },
      { manualClient: !bookingId && clientType === 'manual' },
    );
    setFieldErrors(errorsNow);
    const firstField = PROPOSAL_FIELD_ORDER.find((field) => errorsNow[field]);
    if (firstField) {
      addNotification({ type: 'error', title: 'Confira o orçamento', message: fieldErrorsSummary(errorsNow) });
      document.getElementById(`qp-${firstField}`)?.focus();
      return;
    }
    const validationError = validate();
    if (validationError) {
      addNotification({ type: 'error', title: 'Confira o orçamento', message: validationError });
      return;
    }
    // Onda 2: linha "Frete a combinar"/"Pedágio à parte" sem valor: avisa e pede confirmação antes de gravar.
    if (pendingNotes.length > 0 && !pendingFreightConfirmed) {
      setConfirmPendingFreight(true);
      return;
    }
    setConfirmPendingFreight(false);

    try {
      setSaving(true);

      // Extrair IDs de cada tipo de item (como o backend espera)
      const equipmentIds = items.filter(i => i.type === 'EQUIPMENT' && i.sourceId).map(i => i.sourceId!);
      const serviceIds = items.filter(i => i.type === 'SERVICE' && i.sourceId).map(i => i.sourceId!);
      const kitIdItem = items.find(i => i.type === 'KIT' && i.sourceId);

      // D8a e P16: os itens vão como itens da reserva, com o preço usado (técnico, montagem, frete e hora
      // extra inclusive), e o servidor soma o total pela mesma função das outras telas: o corpo não leva
      // totalPrice. Antes os personalizados iam como texto em `notes` e o total era só a conta desta tela.
      // O31/C12: a quantidade da linha já é inteira (changeQuantity), a mesma da conta.
      const proposalItems = pricedItems.map((i) => ({
        description: lineDescription(i, eventDate, eventEndDate),
        quantity: i.quantity,
        unitPrice: Math.max(0, i.unitPrice),
        discount: Math.max(0, i.discount),
        totalPrice: Math.max(0, i.totalPrice),
        itemType: i.type,
        ...(i.type === 'EQUIPMENT' && i.sourceId ? { equipmentId: i.sourceId } : {}),
        ...(i.type === 'SERVICE' && i.sourceId ? { serviceId: i.sourceId } : {}),
        ...(i.type === 'KIT' && i.sourceId ? { kitId: i.sourceId } : {}),
      }));

      // 18/11/2026: orçamento de uma reserva ("Montar orçamento" da ficha). As linhas trocam as da reserva, e o servidor
      // liga o kit, os equipamentos e os serviços delas e refaz o total (itens + frete + pedágio). Vão também o título,
      // o local, as datas e o endereço, que podem ter sido corrigidos aqui; o cliente, o status e as observações
      // internas ficam como estão. Nada vai ao cliente: o link sai do "Enviar proposta" da ficha, para onde a tela volta.
      if (bookingId) {
        await apiFetch(`/bookings/${encodeURIComponent(bookingId)}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...(eventTitle.trim() ? { eventTitle: eventTitle.trim() } : {}),
            location,
            street,
            addressNumber,
            neighborhood,
            city,
            state,
            zipCode,
            eventDate: new Date(eventDate).toISOString(),
            eventEndDate: new Date(eventEndDate).toISOString(),
            items: proposalItems,
          }),
        });
        addNotification({ type: 'success', title: 'Orçamento salvo na reserva', message: 'Confira a reserva e use "Enviar proposta": o link vai pelo WhatsApp e por e-mail, se a reserva tiver e-mail.' });
        navigate(`/admin/reservas/${encodeURIComponent(bookingId)}`, { state: { sendProposal: true } });
        return;
      }

      // Achado (auditoria ponta a ponta): ia também `userId: user?.id`, o id do admin logado. Com
      // cliente manual, o backend pendurava a reserva no perfil de cliente do próprio admin (telefone
      // da primeira proposta manual) e a confirmação ia ao admin por e-mail e a outro cliente por
      // WhatsApp. O cliente é o cadastrado (clientId) ou o manual, gravado na própria reserva.
      const payload: Record<string, unknown> = {
        clientId: clientType === 'registered' ? selectedClientId : undefined,
        clientName: clientType === 'manual' ? clientName : undefined,
        clientContact: clientType === 'manual' ? clientContact : undefined,
        // Achado (revisão antes do deploy): o e-mail é opcional, mas '' ia no corpo e o backend
        // (z.string().email().optional()) respondia 400 — proposta sem e-mail nunca era criada.
        clientEmail: clientType === 'manual' ? clientEmail.trim() || undefined : undefined,
        eventTitle: eventTitle || 'Proposta Rápida',
        location,
        street,
        addressNumber,
        neighborhood,
        city,
        state,
        zipCode,
        eventDate: new Date(eventDate).toISOString(),
        eventEndDate: new Date(eventEndDate).toISOString(),
        // Achado (auditoria ponta a ponta): o campo diz "Não aparecem na proposta", mas ia para `notes`, que sai no
        // PDF e na área do cliente. Agora vai para internalNotes, que o cliente não recebe.
        internalNotes: notes.trim() || undefined,
        items: proposalItems,
        status,
        ...(equipmentIds.length > 0 && { equipmentIds }),
        ...(serviceIds.length > 0 && { serviceIds }),
        ...(kitIdItem?.sourceId && { kitId: kitIdItem.sourceId }),
      };

      const body = JSON.stringify(payload);
      const previous = lastSubmissionRef.current;
      const idempotencyKey = previous && previous.body === body ? previous.key : newIdempotencyKey();
      lastSubmissionRef.current = { body, key: idempotencyKey };

      // Achado (revisão antes do deploy): o apiFetch já desembrulha { success, data } e devolve a
      // própria reserva; ler `.data.id` dava sempre vazio, e toda criação bem-sucedida terminava
      // em "Reserva criada mas ID não retornado.".
      const booking = await apiFetch<{ id: string }>('/bookings', {
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': idempotencyKey }
      });

      const createdId = booking?.id;
      if (!createdId) throw new Error('Reserva criada mas ID não retornado.');

      // D11 (aprovada em 02/11/2026): salvar não manda nada ao cliente. O link seguro, o e-mail e o WhatsApp saem do
      // "Enviar proposta" da página da reserva, para onde a tela vai agora. Antes o aviso prometia um link que a
      // página da reserva não mostrava. Auditoria do orçamento (12/11/2026), E8: o link é o caminho da proposta (o
      // "PDF + WhatsApp" desta tela saiu); o estado sendProposal pede à ficha que leve ao "Enviar proposta", sem enviar
      // sozinha (o envio manda e-mail ao cliente).
      addNotification({ type: 'success', title: 'Proposta salva', message: 'Confira a reserva e use "Enviar proposta": o link vai pelo WhatsApp e por e-mail, se a reserva tiver e-mail.' });
      navigate(`/admin/reservas/${createdId}`, { state: { sendProposal: true } });
    } catch (error: unknown) {
      const err = error as { message?: string } | null;
      const msg = err?.message || 'Falha ao salvar. Verifique os campos e tente novamente.';
      addNotification({ type: 'error', title: 'Erro ao salvar a proposta', message: msg });
    } finally {
      setSaving(false);
    }
  };

  // Orçamento em PDF (13/11/2026): saiu o "Baixar PDF" de uso interno desta tela. Era um terceiro PDF montado no
  // navegador (jsPDF), com outro visual e a sua própria conta; depois de salvar, a ficha da reserva baixa o orçamento
  // oficial, que o servidor gera a partir da reserva (o mesmo do link da proposta e da área do cliente).

  // 18/11/2026: o orçamento de uma reserva tem o próprio caminho no topo.
  const breadcrumbs = bookingId ? [...BREADCRUMBS.slice(0, 2), { name: 'Orçamento da reserva' }] : BREADCRUMBS;
  const saveBlocked = Boolean(bookingId) && (!baseBooking || Boolean(baseBooking.lockedReason));

  // Pedido de Alyson de 24/11/2026: a conferência antes de enviar (dado que falta no briefing, outra reserva no dia, valor que parece
  // erro). Só avisa: quem decide é a equipe.
  const reviewClientName = bookingId
    ? (baseBooking?.clientName && baseBooking.clientName !== 'Cliente sem nome' ? baseBooking.clientName : '')
    : clientType === 'registered' ? (selectedClientId ? 'cadastrado' : '') : clientName;
  const reviewAlerts = proposalAlerts({
    briefing: baseBooking?.briefing,
    clientName: reviewClientName,
    lines: pricedItems,
    subtotal,
    closedTargetCents: closedTarget,
    eventStart: eventDate,
    eventEnd: eventEndDate,
    sameDay,
  });

  // Carregando dentro do layout (antes: BrandLoader em tela cheia, sem menu nem título).
  if (loading) {
    return (
      <AdminLayout title={PAGE_TITLE} breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <BrandLoader size="xl" label="Carregando catálogo…" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={PAGE_TITLE} breadcrumbs={breadcrumbs}>
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Zap className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{bookingId ? `Orçamento da reserva ${baseBooking?.code ?? ''}`.trim() : 'Nova proposta comercial'}</h2>
              {/* E8 (auditoria do orçamento, 12/11/2026): o link é o caminho da proposta. Orçamento em PDF (13/11/2026): o PDF
                  sai da ficha, depois de salvar. */}
              <p className="text-sm text-muted-foreground">
                {bookingId
                  ? 'Monte os itens e salve: eles entram nesta reserva. O cliente recebe o link da proposta pelo "Enviar proposta" da ficha, onde também se baixa o orçamento em PDF.'
                  : 'Monte o orçamento e salve: o cliente recebe o link da proposta pelo "Enviar proposta" da ficha da reserva, onde também se baixa o orçamento em PDF.'}
              </p>
            </div>
          </div>
          {/* flex-wrap: os botões em linha estouravam a tela de 375px. */}
          <div className="flex flex-wrap gap-2">
             <Button variant="outline" size="sm" onClick={() => guardClose(() => navigate(-1))}>Cancelar</Button>
             <Button size="sm" onClick={() => handleSave('PENDING')} isLoading={saving} disabled={saveBlocked} leftIcon={<Send className="h-4 w-4" />}>
                {bookingId ? 'Salvar na reserva' : 'Salvar proposta'}
             </Button>
          </div>
        </header>

        {catalogError && (
          <Alert
            variant="error"
            title="Erro ao carregar o catálogo"
            description={catalogError}
            action={<Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>Tentar de novo</Button>}
          />
        )}

        {bookingError && (
          <Alert
            variant="error"
            title="Não foi possível abrir a reserva"
            description={bookingError}
            action={<Button variant="outline" size="sm" onClick={() => bookingId && void loadBaseBooking(bookingId)}>Tentar de novo</Button>}
          />
        )}
        {baseBooking?.lockedReason && (
          <Alert variant="warning" title="Os itens desta reserva não mudam" description={baseBooking.lockedReason} />
        )}
        {baseBooking && !baseBooking.lockedReason && baseBooking.itemCount > 0 && (
          <Alert
            variant="info"
            title="Os itens de hoje já estão na lista"
            description={`${baseBooking.itemCount === 1 ? 'O item gravado já está' : `Os ${baseBooking.itemCount} itens gravados já estão`} abaixo, com os preços e descontos de hoje. Mude o que precisar (quantidade, preço, item a mais ou a menos): salvar grava esta lista no lugar da atual, e o total é refeito por ela (com o frete e o pedágio).`}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Client Card */}
            <Card className="p-6 border-2">
               <h3 className="flex items-center gap-2 mb-6 text-primary font-semibold uppercase text-xs tracking-wider">
                 <Package className="h-4 w-4" aria-hidden="true" /> Dados do cliente
               </h3>
               
               {bookingId ? (
                 baseBooking && (
                   <div className="space-y-1 text-sm">
                     <p className="font-semibold text-foreground break-words">{baseBooking.clientName}</p>
                     <p className="text-muted-foreground break-all">{[baseBooking.clientPhone, baseBooking.clientEmail].filter(Boolean).join(' · ') || 'Sem telefone nem e-mail'}</p>
                     <p className="text-xs text-muted-foreground">O cliente da reserva não muda por aqui.</p>
                   </div>
                 )
               ) : (
               <div className="space-y-4">
                  <Select 
                    label="Origem do Cliente"
                    value={clientType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setClientType(e.target.value as 'manual' | 'registered')}
                    options={[
                      { value: 'manual', label: 'Manual (Conversa do WhatsApp)' },
                      { value: 'registered', label: 'Base de Clientes Cadastrados' }
                    ]}
                  />

                  {clientType === 'registered' ? (
                    <Select 
                      label="Selecionar Cliente"
                      value={selectedClientId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClientId(e.target.value)}
                      options={[{ value: '', label: 'Selecione...' }, ...clients.map(c => ({ value: c.id, label: c.user?.name || c.name }))]}
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input id="qp-clientName" label="Nome Completo *" value={clientName} onChange={onField('clientName', setClientName)} error={fieldErrors.clientName} placeholder="Ex: João Silva" />
                      <Input id="qp-clientContact" label="WhatsApp / Celular *" value={clientContact} onChange={onField('clientContact', setClientContact)} error={fieldErrors.clientContact} placeholder="(31) 98888-7777" inputMode="tel" />
                      <Input id="qp-clientEmail" label="E-mail" value={clientEmail} onChange={onField('clientEmail', setClientEmail)} error={fieldErrors.clientEmail} placeholder="Ex: joao@email.com" type="email" />
                    </div>
                  )}
               </div>
               )}
            </Card>

            {/* 18/11/2026: no orçamento de uma reserva do briefing, as respostas do cliente ficam à vista enquanto se montam os itens. */}
            {baseBooking?.briefing && (
              <Card className="p-6 border-primary/20 bg-primary/5">
                <h3 className="flex items-center gap-2 mb-3 text-primary font-semibold uppercase text-xs tracking-wider">
                  <FileText className="h-4 w-4" aria-hidden="true" /> Briefing do cliente
                </h3>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line break-words">{baseBooking.briefing}</p>
              </Card>
            )}

            {/* Items Card */}
            <Card className="p-6 border-2 border-primary/10 overflow-hidden">
               <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                 <h3 className="flex items-center gap-2 text-primary font-semibold uppercase text-xs tracking-wider">
                   <Calculator className="h-4 w-4" aria-hidden="true" /> Itens do orçamento
                 </h3>
                 <div className="flex flex-wrap gap-2">
                   {canSuggest && (
                     <Button variant="outline" size="xs" onClick={suggestItems} isLoading={suggesting} leftIcon={<Sparkles className="h-3 w-3" />}>
                       Sugerir itens (IA)
                     </Button>
                   )}
                   {/* Lote 13, técnico durante o evento (decisão do dono de 06/11/2026): com serviço marcado "Pode acompanhar
                       o evento todo", o botão põe esse serviço, cobrado pelas horas do evento (um botão por serviço quando
                       há mais de um); sem nenhum, o item à mão de antes. Auditoria do orçamento (12/11/2026): o técnico que
                       um kit da proposta já traz não entra de novo (E1). */}
                   {technicianServices.length === 0 ? (
                     <Button variant="outline" size="xs" onClick={() => replaceShortcutLine('manual', customLine('Técnico'))} leftIcon={<Plus className="h-3 w-3" />}>
                       Técnico
                     </Button>
                   ) : (
                     technicianServices.map((svc) => (
                       <Button key={svc.id} variant="outline" size="xs" onClick={() => addShortcutService(svc.id, svc)} leftIcon={<Plus className="h-3 w-3" />}>
                         {technicianServices.length === 1 ? 'Técnico' : svc.name}
                       </Button>
                     ))
                   )}
                   <Button variant="outline" size="xs" onClick={addAssembly} leftIcon={<Plus className="h-3 w-3" />}>
                     Montagem
                   </Button>
                   <Button
                     variant="outline"
                     size="xs"
                     onClick={quoteFreight}
                     isLoading={quotingFreight}
                     leftIcon={<Plus className="h-3 w-3" />}
                     aria-describedby={[pickupKit ? 'frete-kit-retirada' : '', freightStale ? 'frete-desatualizado' : ''].filter(Boolean).join(' ') || undefined}
                   >
                     Frete
                   </Button>
                   <Button variant="outline" size="xs" onClick={() => addCustomItem('Hora extra')} leftIcon={<Plus className="h-3 w-3" />}>
                     Hora extra
                   </Button>
                   <Button variant="outline" size="xs" onClick={() => addCustomItem()} leftIcon={<Plus className="h-3 w-3" />}>
                     Item personalizado
                   </Button>
                 </div>
               </div>
               <p className="-mt-4 mb-6 text-xs text-muted-foreground">Técnico, montagem, frete e hora extra entram como itens (a hora extra do kit com valor cadastrado já entra na linha do kit, e serviço que o kit já traz não entra de novo). O botão Frete calcula pela distância até o endereço do evento (preencha o endereço antes), pela regra do servidor: equipamento avulso e kit de entrega têm contas diferentes, e só serviços ou só kit de retirada não têm frete. Pedágio estimado à parte. A reserva leva um kit só; para somar, use equipamentos e serviços avulsos.</p>
               {appliedSuggestion && (
                 <div role="note" aria-label="Sugestão da IA" className="-mt-2 mb-6 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
                   <div className="flex items-start justify-between gap-3">
                     <p className="font-semibold">
                       {appliedSuggestion.added.length > 0
                         ? `A IA pôs ${appliedSuggestion.added.length === 1 ? '1 item' : `${appliedSuggestion.added.length} itens`} a partir do briefing. Confira cada linha antes de salvar: a IA pode errar.`
                         : 'A IA não achou itens novos para pôr. Monte à mão.'}
                     </p>
                     <Button variant="ghost" size="xs" onClick={() => setAppliedSuggestion(null)} aria-label="Fechar a sugestão da IA">
                       Fechar
                     </Button>
                   </div>
                   {appliedSuggestion.added.length > 0 && (
                     <ul className="mt-2 list-disc space-y-1 pl-5">
                       {appliedSuggestion.added.map((line) => (
                         <li key={line.name}>{line.reason ? `${line.name}: ${line.reason}` : line.name}</li>
                       ))}
                     </ul>
                   )}
                   {appliedSuggestion.skipped.length > 0 && (
                     <>
                       <p className="mt-3 font-medium">Ficaram de fora:</p>
                       <ul className="mt-1 list-disc space-y-1 pl-5">
                         {appliedSuggestion.skipped.map((text) => <li key={text}>{text}</li>)}
                       </ul>
                     </>
                   )}
                   {appliedSuggestion.observations.length > 0 && (
                     <>
                       <p className="mt-3 font-medium">Para conferir com o cliente:</p>
                       <ul className="mt-1 list-disc space-y-1 pl-5">
                         {appliedSuggestion.observations.map((text) => <li key={text}>{text}</li>)}
                       </ul>
                     </>
                   )}
                 </div>
               )}
               {pickupKit && (
                 <p id="frete-kit-retirada" role="note" className="-mt-4 mb-6 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-foreground">
                   O kit "{pickupKit.description}" é de retirada: o cliente busca e devolve na X Produções. O frete só entra se a proposta tiver equipamento avulso para entregar.
                 </p>
               )}
               {freightStale && (
                 <p id="frete-desatualizado" role="alert" className="-mt-4 mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-foreground">
                   O endereço ou os itens mudaram depois do cálculo do frete: clique em Frete para recalcular antes de salvar.
                 </p>
               )}
               {items.some(missingPriceUnit) && (
                 <p id="unidade-do-preco" role="alert" className="-mt-4 mb-6 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-foreground">
                   O servidor não informou se o preço do equipamento é por diária ou por hora: a linha marcada não acompanha as datas, e Salvar fica travado. Recarregue a página e adicione o equipamento de novo, ou digite o preço da linha.
                 </p>
               )}

               <div className="space-y-4">
                 {items.length === 0 ? (
                   <div className="py-12 text-center border-2 border-dashed rounded-2xl border-border bg-muted/20">
                      <p className="text-muted-foreground text-sm">Nenhum item adicionado ainda.</p>
                      <p className="text-sm text-muted-foreground">Use o catálogo ao lado para começar.</p>
                   </div>
                 ) : (
                   <div className="space-y-3">
                     {pricedItems.map((item) => (
                       <div key={item.id} className="group relative flex flex-col md:flex-row gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-all hover:shadow-md">
                         <div className="flex-grow space-y-2">
                           <Input
                             size="xs"
                             aria-label="Descrição do item"
                             className="font-bold text-sm bg-transparent"
                             value={item.description}
                             onChange={e => updateItem(item.id, 'description', e.target.value)}
                           />
                           <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" size="sm">
                                {ITEM_TYPE_LABELS[item.type] || item.type}
                              </Badge>
                              {item.freight && freightStale && <Badge variant="destructive" size="sm">Desatualizado</Badge>}
                              {item.kit && (
                                <>
                                  <Badge variant="outline" size="sm">{KIT_FULFILLMENT_LABEL[kitFulfillment(item.kit)]}</Badge>
                                  <span className="text-xs text-muted-foreground">Na proposta: {lineDescription(item, eventDate, eventEndDate)}</span>
                                </>
                              )}
                              {item.service && !item.priceEdited && (
                                <span className="text-xs text-muted-foreground">Na proposta: {lineDescription(item, eventDate, eventEndDate)}</span>
                              )}
                              {item.ratePerUnit !== undefined && !item.priceEdited && item.priceUnit && (
                                <span className="text-xs text-muted-foreground">
                                  {formatPrice(item.ratePerUnit)}{equipmentUnitSuffix(item.priceUnit)} × {equipmentUnitText(unitsFor(item, item.priceUnit, eventDate, eventEndDate), item.priceUnit)}
                                </span>
                              )}
                              {missingPriceUnit(item) && <Badge variant="destructive" size="sm">Sem a unidade do preço</Badge>}
                           </div>
                         </div>

                         <div className="flex flex-wrap items-end gap-3">
                           <div className="w-20">
                             {/* O31/C12: inteiro a partir de 1; vazio, zero ou fração fica no campo, com o aviso, até virar inteiro. */}
                             <Input
                               label="Qtd"
                               size="xs"
                               type="number"
                               min={1}
                               step={1}
                               inputMode="numeric"
                               className="text-center font-bold"
                               value={quantityDrafts[item.id] ?? String(item.quantity)}
                               error={quantityDrafts[item.id] !== undefined ? 'Inteiro, mín. 1' : undefined}
                               onChange={e => changeQuantity(item.id, e.target.value)}
                             />
                           </div>
                           <div className="w-36">
                             {/* `prefix="R$"` não é prop do Input (virava atributo HTML sem efeito). Onda 2: a linha do
                                 frete sem valor mostra "a combinar"/"à parte" no campo, não 0. */}
                             <Input
                               label="Preço unit."
                               size="xs"
                               type="number"
                               leftIcon={<span className="text-xs font-semibold">R$</span>}
                               value={pendingFreight(item) ? '' : item.unitPrice}
                               placeholder={pendingFreight(item)?.label}
                               onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                             />
                           </div>
                           {item.discount > 0 && (
                             <p className="text-xs font-medium text-success pb-2">
                               Desconto {formatPrice(item.discount)} · item {formatPrice(item.totalPrice)}
                             </p>
                           )}
                           <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-destructive hover:bg-destructive/10 h-8 w-8" aria-label={`Remover ${item.description || 'item'}`}>
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>

               <div className="mt-8 pt-6 border-t space-y-2">
                  {/* M-08 (teste do painel de 25/11/2026): com desconto ("Fechar no valor" ou digitado), a conta aparece inteira:
                      preço de tabela, desconto e o total, em vez de só o "Subtotal estimado" com o desconto escondido nas linhas. */}
                  {totalDiscount > 0 && (
                    <>
                      <div className="flex justify-between items-center text-sm" data-testid="qp-gross">
                        <span className="text-muted-foreground text-xs">Preço de tabela</span>
                        <span className="font-mono">{formatPrice(subtotal + totalDiscount)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm" data-testid="qp-discount">
                        <span className="text-muted-foreground text-xs">Desconto</span>
                        <span className="font-mono">− {formatPrice(totalDiscount)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium uppercase tracking-wider text-xs">{totalDiscount > 0 ? 'Total' : 'Subtotal estimado'}</span>
                    <span className="font-mono font-bold text-lg" data-testid="qp-total">{formatPrice(subtotal)}</span>
                  </div>
                  {pendingNotes.length > 0 && (
                    <p className="text-right text-xs font-medium text-foreground">+ {pendingNotes.join(' + ')}</p>
                  )}
                  {/* Pedido de Alyson de 24/11/2026: "Fechar no valor". */}
                  <div className="flex flex-wrap items-end justify-end gap-2 pt-2">
                    <div className="w-40">
                      <Input
                        label="Fechar no valor"
                        size="xs"
                        inputMode="decimal"
                        leftIcon={<span className="text-xs font-semibold">R$</span>}
                        placeholder="Ex.: 1.000"
                        value={targetDraft}
                        onChange={(e) => setTargetDraft(e.target.value)}
                      />
                    </div>
                    <Button size="xs" variant="outline" onClick={closeAtTarget} disabled={pricedItems.length === 0}>Aplicar</Button>
                    {hasDiscount && <Button size="xs" variant="ghost" onClick={clearDiscounts}>Tirar desconto</Button>}
                  </div>
                  <p className="text-right text-xs text-muted-foreground">
                    O desconto é dividido entre os itens pelo preço de tabela (frete e pedágio ficam como estão). O PDF mostra o preço de tabela riscado e o desconto de cada item.
                  </p>
               </div>
            </Card>

            <Card className="p-6">
               <h3 className="flex items-center gap-2 mb-4 text-primary font-semibold uppercase text-xs tracking-wider" id="conferencia-titulo">
                 <AlertCircle className="h-4 w-4" aria-hidden="true" /> Conferência antes de enviar
               </h3>
               {reviewAlerts.length === 0 ? (
                 <p className="text-sm text-muted-foreground">Nada a conferir.</p>
               ) : (
                 <ul className="space-y-2" aria-labelledby="conferencia-titulo">
                   {reviewAlerts.map((alert) => (
                     <li key={alert} className="flex gap-2 text-sm text-foreground">
                       <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                       <span>{alert}</span>
                     </li>
                   ))}
                 </ul>
               )}
            </Card>

            <Card className="p-6">
               <h3 className="flex items-center gap-2 mb-6 text-primary font-semibold uppercase text-xs tracking-wider">
                 <Settings className="h-4 w-4" aria-hidden="true" /> Evento e local
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Input label="Título do Evento" value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="Ex: Casamento João & Maria" />
                 <Input id="qp-location" label="Local / Salão *" value={location} onChange={onField('location', setLocation)} error={fieldErrors.location} placeholder="Ex: Espaço VIP" />
                 <Input id="qp-eventDate" label="Início Previsto *" type="datetime-local" value={eventDate} onChange={onField('eventDate', setEventDate)} error={fieldErrors.eventDate} />
                 <Input id="qp-eventEndDate" label="Término Previsto *" type="datetime-local" value={eventEndDate} onChange={onField('eventEndDate', setEventEndDate)} error={fieldErrors.eventEndDate} />
               </div>
               {fromContact?.eventDate && (
                 <p className="mt-2 text-xs text-muted-foreground">
                   Data informada no contato: {fromContact.eventDate}. Preencha o início e o término com o horário combinado.
                 </p>
               )}

               <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                 <h4 className="flex items-center gap-2 text-muted-foreground font-semibold uppercase text-xs tracking-wider">
                   <AlertCircle className="h-3 w-3" aria-hidden="true" /> Endereço do evento (obrigatório)
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                   <Input
                     id="qp-zipCode"
                     label="CEP *"
                     value={zipCode}
                     onChange={(e) => changeZipCode(e.target.value)}
                     error={fieldErrors.zipCode}
                     description={cepStatus === 'loading' ? 'Buscando o endereço…' : cepStatus === 'notFound' ? 'Não achamos o endereço deste CEP: preencha à mão.' : 'O endereço se completa pelo CEP.'}
                     placeholder="00000-000"
                     inputMode="numeric"
                     className="md:col-span-1"
                   />
                   <Input id="qp-street" label="Rua *" value={street} onChange={onField('street', setStreet)} error={fieldErrors.street} placeholder="Ex: Av. Brasil" className="md:col-span-2" />
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   <Input id="qp-addressNumber" label="Número *" value={addressNumber} onChange={onField('addressNumber', setAddressNumber)} error={fieldErrors.addressNumber} placeholder="Ex: 123" />
                   <Input id="qp-neighborhood" label="Bairro *" value={neighborhood} onChange={onField('neighborhood', setNeighborhood)} error={fieldErrors.neighborhood} placeholder="Ex: Centro" />
                   <Input id="qp-city" label="Cidade *" value={city} onChange={onField('city', setCity)} error={fieldErrors.city} placeholder="Ex: Belo Horizonte" />
                   <Input id="qp-state" label="UF *" value={state} onChange={onField('state', (v) => setState(v.toUpperCase()))} error={fieldErrors.state} placeholder="Ex: MG" maxLength={2} />
                 </div>
               </div>
               {/* No orçamento de uma reserva, as observações internas dela mudam pelo Editar da ficha (não vão daqui). */}
               {!bookingId && (
                 <div className="mt-4">
                   <Textarea label="Observações Internas (Não aparecem na proposta)" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex.: cliente pediu desconto; negociar o frete se fechar hoje." />
                 </div>
               )}
            </Card>
          </div>

          {/* Catalog Sidebar */}
          <div className="space-y-6">
             <Card className="p-4 border-primary/20 bg-primary/5 sticky top-24">
                <h3 className="flex items-center gap-2 mb-4 text-primary font-semibold uppercase text-xs tracking-wider">
                  <Search className="h-4 w-4" aria-hidden="true" /> Adicionar do catálogo
                </h3>

                <div className="flex gap-1 p-1 bg-muted/30 rounded-xl mb-4" role="group" aria-label="Tipo de item">
                   {CATALOG_TABS.map(tab => (
                     <Button
                       key={tab.value}
                       size="xs"
                       variant={searchType === tab.value ? 'primary' : 'ghost'}
                       aria-pressed={searchType === tab.value}
                       className="flex-1 px-2"
                       onClick={() => setSearchType(tab.value)}
                     >
                       {tab.label}
                     </Button>
                   ))}
                </div>

                <div className="mb-4">
                  <Input
                    size="sm"
                    aria-label="Buscar no catálogo"
                    leftIcon={<Search className="h-4 w-4" />}
                    placeholder="Buscar..."
                    className="bg-background"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {filteredCatalogItems.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-6">Nenhum item encontrado.</p>
                  )}
                  {filteredCatalogItems.map((item: Equipment | Kit | Service) => (
                      <button
                        type="button"
                        key={item.id}
                        aria-label={`Adicionar ${item.name}`}
                        className="group w-full text-left p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => addItemToProposal(searchType, item)}
                      >
                        <div className="flex justify-between items-start gap-2">
                           <div className="min-w-0">
                             <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">{item.name}</p>
                             <p className="text-xs text-muted-foreground font-mono">
                               {formatPrice(catalogPrice(searchType, item))}{searchType === 'EQUIPMENT' ? unitSuffixOf(item) : ''}
                             </p>
                           </div>
                           <div className="h-6 w-6 shrink-0 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center transition-all" aria-hidden="true">
                              <ArrowRight className="h-3 w-3" />
                           </div>
                        </div>
                      </button>
                  ))}
                </div>
             </Card>
          </div>
        </div>
      </div>

      {/* Onda 2 (auditoria do orçamento, 12/11/2026): Salvar com linha do frete sem valor avisa antes de gravar. */}
      <ConfirmModal
        isOpen={confirmPendingFreight}
        onClose={() => setConfirmPendingFreight(false)}
        onConfirm={() => void handleSave('PENDING', true)}
        title="Salvar com valor a combinar?"
        message={`A proposta tem ${pendingNotes.join(' e ')}: o cliente vê "a combinar" ou "à parte" no lugar do valor até a linha ganhar um preço. Para pôr o valor agora, volte e digite-o no preço da linha.`}
        variant="warning"
        isLoading={saving}
        confirmText="Salvar assim"
        cancelText="Voltar"
      />

      <ConfirmModal
        isOpen={leaveConfirmOpen}
        onClose={cancelLeave}
        onConfirm={confirmLeave}
        title="Sair sem salvar?"
        message={
          items.length === 1
            ? 'A linha da proposta ainda não foi salva. Se sair agora, ela se perde.'
            : `As ${items.length} linhas da proposta ainda não foram salvas. Se sair agora, elas se perdem.`
        }
        variant="warning"
        confirmText="Sair sem salvar"
        cancelText="Continuar editando"
      />
    </AdminLayout>
  );
};

export default AdminQuickProposalPage;
