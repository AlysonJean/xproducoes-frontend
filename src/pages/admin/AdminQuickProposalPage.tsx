import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { contactEventTitle, proposalNotesFromContact, type ContactProposalPrefill } from '../../utils/contactFormBlock';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  Textarea,
  Alert
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
  AlertCircle
} from 'lucide-react';
import type { Client, Equipment, Kit, Service } from '@/types/types';
import { apiFetch } from '@/services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { formatPrice } from '@/utils/formatPrice';
import { toNumber } from '@/utils/typeSafeFormatters';
import { equipmentUnits, equipmentUnitSuffix, equipmentUnitText, hoursBetween, kitPriceLine, serviceLine, type EquipmentPriceUnit, type KitPricingInput, type ServicePricingInput } from '@/utils/bookingPricing';
import { isWholeEventService } from '@/utils/wholeEventService';
import { KIT_FULFILLMENT_LABEL, kitFulfillment } from '@/utils/kitInfo';
import { useEquipmentPriceUnit } from '@/hooks/usePricingRules';
import { openWhatsAppUntracked } from '@/utils/whatsapp';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

// E3/E5: o serviço de montagem do catálogo ("Roadie / Auxiliar de Montagem"), cobrado à parte no equipamento avulso
// (decisão de 12/11). O cadastro não tem um campo que diga "este é o de montagem" (criar um pediria migração), esse
// serviço não tem slug e o id muda de um ambiente para outro. Vale o serviço ativo, que não é o técnico do evento
// todo, com "montagem" ou "roadie" no nome, sem depender de acento, maiúsculas ou do nome exato ("Auxiliar de
// montagem" e "Montagem e desmontagem" também servem). Com mais de um, o que mais kits trazem dentro.
const normalizeName = (text: string): string => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const ASSEMBLY_NAME = /\b(montagem|roadie)\b/;
const findAssemblyService = (services: Service[], kits: Kit[]): Service | null => {
  const candidates = services.filter(
    (s) => isActiveService(s) && s.coversWholeEvent !== true && ASSEMBLY_NAME.test(normalizeName(s.name || '')),
  );
  if (candidates.length <= 1) return candidates[0] ?? null;
  const kitsWith = (id: string) => kits.filter((k) => (k.items ?? []).some((i) => (i.serviceId ?? i.service?.id) === id)).length;
  return [...candidates].sort((a, b) => kitsWith(b.id) - kitsWith(a.id))[0];
};

// Preço do catálogo: equipamento pelo preço da unidade (a coluna pricePerHour guarda o da hora ou o da
// diária); kit (preço por evento) e serviço pelo preço do cadastro.
const catalogPrice = (type: string, item: Equipment | Kit | Service): number =>
  Number((type === 'EQUIPMENT' ? (item as Equipment).pricePerHour : (item as Kit | Service).price) || 0);

// D8a e P16 (aprovadas em 02/11/2026) e decisões do dono de 06/11: o kit tem preço por evento (nunca vezes
// as horas); o equipamento avulso custa por hora ou por diária (EQUIPMENT_PRICE_UNIT no servidor), vezes as
// unidades tiradas do início e do término; o serviço tem preço fixo. Antes o equipamento entrava com
// dailyPrice, que não existe no cadastro: R$ 0. O preço digitado à mão vence. Sem as datas ainda, conta 1
// unidade (ou o mínimo de diárias).
const unitsFor = (item: ProposalItem, unit: EquipmentPriceUnit, start: string, end: string): number =>
  equipmentUnits(unit, start, end, item.minimumUnits) ?? Math.max(1, unit === 'day' ? item.minimumUnits ?? 1 : 1);

const priceItems = (items: ProposalItem[], unit: EquipmentPriceUnit, start: string, end: string): ProposalItem[] =>
  items.map((item) => {
    if (item.kit && !item.priceEdited) {
      const unitPrice = kitPriceLine(item.kit, hoursBetween(start, end)).cents / 100;
      return { ...item, unitPrice, totalPrice: Math.max(0, Math.round((unitPrice * item.quantity - item.discount) * 100) / 100) };
    }
    if (item.service && !item.priceEdited) {
      const unitPrice = serviceLine(item.service, hoursBetween(start, end)).cents / 100;
      return { ...item, unitPrice, totalPrice: Math.max(0, Math.round((unitPrice * item.quantity - item.discount) * 100) / 100) };
    }
    if (item.ratePerUnit === undefined || item.priceEdited) return item;
    const unitPrice = Math.round(item.ratePerUnit * unitsFor(item, unit, start, end) * 100) / 100;
    return { ...item, unitPrice, totalPrice: Math.max(0, Math.round((unitPrice * item.quantity - item.discount) * 100) / 100) };
  });

// Descrição que vai para a reserva, o PDF e a página do cliente: com as horas ou diárias, quando o preço
// acompanha as datas.
const lineDescription = (item: ProposalItem, unit: EquipmentPriceUnit, start: string, end: string): string => {
  // Kit: a descrição da conta do servidor com o nome da linha; com o preço digitado à mão, sem hora extra.
  if (item.kit) return kitPriceLine({ ...item.kit, name: item.description }, item.priceEdited ? null : hoursBetween(start, end)).description;
  // Técnico durante o evento: a descrição com as horas da conta do servidor; com o preço digitado à mão, só o nome.
  if (item.service && !item.priceEdited) return serviceLine({ ...item.service, name: item.description }, hoursBetween(start, end)).description;
  const n = item.ratePerUnit !== undefined && !item.priceEdited ? equipmentUnits(unit, start, end, item.minimumUnits) : null;
  return n ? `${item.description} (${equipmentUnitText(n, unit)})` : item.description;
};

export const AdminQuickProposalPage = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [quotingFreight, setQuotingFreight] = useState(false);
  // O17/C9: o endereço e a regra do último cálculo do frete (freightKey); null antes do primeiro.
  const [freightQuotedKey, setFreightQuotedKey] = useState<string | null>(null);
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

  // Form State - Cliente
  const [clientType, setClientType] = useState<'registered' | 'manual'>('manual');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientName, setClientName] = useState(fromContact?.name ?? '');
  const [clientEmail, setClientEmail] = useState(fromContact?.email ?? '');
  const [clientContact, setClientContact] = useState(fromContact?.phone ?? '');
  // Erros de campos (escopo global)
  const [fieldErrors] = useState<Record<string, string>>({});

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

  // Items State
  const [items, setItems] = useState<ProposalItem[]>([]);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setCatalogError(null);
        const [clientsRes, equipsRes, kitsRes, servicesRes] = await Promise.all([
          apiFetch<Client[]>('/admin/clients'),
          apiFetch<Equipment[]>('/equipments'),
          apiFetch<Kit[]>('/kits'),
          apiFetch<Service[]>('/services')
        ]);
        setClients(Array.isArray(clientsRes) ? clientsRes : []);
        setEquipments(Array.isArray(equipsRes) ? equipsRes : []);
        setKits(Array.isArray(kitsRes) ? kitsRes : []);
        setServices(Array.isArray(servicesRes) ? servicesRes : []);
      } catch (error: unknown) {
        const err = error as { message?: string } | null;
        setCatalogError(err?.message || 'Não foi possível carregar clientes e catálogo.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [reloadKey]);

  const equipmentUnit = useEquipmentPriceUnit();
  const pricedItems = useMemo(
    () => priceItems(items, equipmentUnit, eventDate, eventEndDate),
    [items, equipmentUnit, eventDate, eventEndDate]
  );

  const subtotal = useMemo(() => {
    return pricedItems.reduce((sum, item) => sum + toNumber(item.totalPrice), 0);
  }, [pricedItems]);

  const filteredCatalogItems = useMemo(() => {
    // E19 (auditoria do orçamento, 12/11/2026): o GET /services do admin traz também os inativos e os "Em breve".
    const source = searchType === 'EQUIPMENT' ? equipments : searchType === 'KIT' ? kits : services.filter(isActiveService);
    if (!searchTerm.trim()) return source;
    const lower = searchTerm.toLowerCase();
    return source.filter((item: Equipment | Kit | Service) => item.name?.toLowerCase().includes(lower));
  }, [searchType, searchTerm, equipments, kits, services]);

  // Lote 13: os serviços do botão Técnico (marcados "Pode acompanhar o evento todo" e ativos).
  const technicianServices = useMemo(() => services.filter(isWholeEventService), [services]);
  // E3/E5: o serviço de montagem do catálogo, para o atalho Montagem.
  const assemblyService = useMemo(() => findAssemblyService(services, kits), [services, kits]);

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
        ? { ratePerUnit: catalogPrice(type, item), minimumUnits: (item as Equipment & { minimumRentalDuration?: number | null }).minimumRentalDuration ?? undefined }
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

  const addItemToProposal = (type: ProposalItem['type'], item: Equipment | Kit | Service) => {
    // E1/E3 (auditoria do orçamento, 12/11/2026): serviço que algum kit da proposta já traz não entra de novo.
    const includedBy = type === 'SERVICE' ? kitIncluding(item.id, items) : undefined;
    if (includedBy) {
      addNotification({ type: 'warning', title: 'Já incluso no kit', message: kitIncludesText(includedBy, item.name) });
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
  // quantidade 2 na linha. Com mais de um serviço marcado, cada botão troca só a própria linha; o técnico posto pela
  // busca do catálogo fica como está. O atalho Montagem segue a mesma regra (auditoria do orçamento, 12/11/2026).
  const replaceShortcutLine = (button: string, line: ProposalItem) => {
    const previous = shortcutLineIds.current[button];
    shortcutLineIds.current[button] = line.id;
    setItems((prev) => [...prev.filter((item) => item.id !== previous), line]);
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
    replaceShortcutLine(button, catalogLine('SERVICE', service));
    addNotification({ type: 'success', title: 'Item adicionado', message: service.name });
  };

  const addAssembly = () => {
    if (!assemblyService) {
      addNotification({ type: 'warning', title: 'Sem serviço de montagem', message: 'Nenhum serviço de montagem ativo no catálogo. Ative ou cadastre o "Roadie / Auxiliar de Montagem" em Serviços.' });
      return;
    }
    addShortcutService('montagem', assemblyService);
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
  };

  const validate = (): string | null => {
    if (items.length === 0) return 'Adicione pelo menos um item ao orçamento.';
    if (items.some((i) => !i.description.trim())) return 'Dê um nome a cada item do orçamento.';
    if (!eventDate) return 'Informe a data de início do evento.';
    if (!eventEndDate) return 'Informe a data de término do evento.';
    if (new Date(eventEndDate) <= new Date(eventDate)) return 'A data de término deve ser posterior à data de início.';
    if (!location.trim()) return 'Informe o local do evento.';
    if (!street.trim()) return 'Informe a rua do evento.';
    if (!addressNumber.trim()) return 'Informe o número do endereço.';
    if (!neighborhood.trim()) return 'Informe o bairro.';
    if (!city.trim()) return 'Informe a cidade.';
    if (!state.trim()) return 'Informe o estado (UF).';
    if (!zipCode.trim()) return 'Informe o CEP.';
    if (clientType === 'manual') {
      if (!clientName.trim()) return 'Informe o nome do cliente.';
      if (!clientContact.trim()) return 'Informe o contato (WhatsApp) do cliente.';
    } else if (clientType === 'registered' && !selectedClientId) {
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

  const handleSave = async (status: 'DRAFT' | 'PENDING') => {
    const validationError = validate();
    if (validationError) {
      addNotification({ type: 'error', title: 'Campo obrigatório', message: validationError });
      return;
    }

    try {
      setSaving(true);

      // Extrair IDs de cada tipo de item (como o backend espera)
      const equipmentIds = items.filter(i => i.type === 'EQUIPMENT' && i.sourceId).map(i => i.sourceId!);
      const serviceIds = items.filter(i => i.type === 'SERVICE' && i.sourceId).map(i => i.sourceId!);
      const kitIdItem = items.find(i => i.type === 'KIT' && i.sourceId);

      // D8a e P16: os itens vão como itens da reserva, com o preço usado (técnico, montagem, frete e hora
      // extra inclusive), e o servidor soma o total pela mesma função das outras telas: o corpo não leva
      // totalPrice. Antes os personalizados iam como texto em `notes` e o total era só a conta desta tela.
      const proposalItems = pricedItems.map((i) => ({
        description: lineDescription(i, equipmentUnit, eventDate, eventEndDate),
        quantity: Math.max(1, Math.round(i.quantity) || 1),
        unitPrice: Math.max(0, i.unitPrice),
        discount: Math.max(0, i.discount),
        totalPrice: Math.max(0, i.totalPrice),
        itemType: i.type,
        ...(i.type === 'EQUIPMENT' && i.sourceId ? { equipmentId: i.sourceId } : {}),
        ...(i.type === 'SERVICE' && i.sourceId ? { serviceId: i.sourceId } : {}),
        ...(i.type === 'KIT' && i.sourceId ? { kitId: i.sourceId } : {}),
      }));

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

      const bookingId = booking?.id;
      if (!bookingId) throw new Error('Reserva criada mas ID não retornado.');

      // D11 (aprovada em 02/11/2026): salvar não manda nada ao cliente. O link seguro, o e-mail e o WhatsApp saem do
      // "Enviar proposta" da página da reserva, para onde a tela vai agora. Antes o aviso prometia um link que a
      // página da reserva não mostrava.
      addNotification({ type: 'success', title: 'Proposta salva', message: 'Use "Enviar proposta" na página da reserva.' });
      navigate(`/admin/reservas/${bookingId}`);
    } catch (error: unknown) {
      const err = error as { message?: string } | null;
      const msg = err?.message || 'Falha ao salvar. Verifique os campos e tente novamente.';
      addNotification({ type: 'error', title: 'Erro ao salvar a proposta', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (value: string): string => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('pt-BR');
  };

  const loadLogoAsDataUrl = async (): Promise<string | null> => {
    try {
      const response = await fetch('/xproducoes-logo.png');
      if (!response.ok) return null;
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Falha ao converter logo em base64'));
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const getClientDisplayName = (): string => {
    if (clientType === 'registered') {
      const found = clients.find((c) => c.id === selectedClientId);
      return found?.user?.name || found?.name || 'Cliente cadastrado';
    }
    return clientName || 'Cliente não informado';
  };

  const getClientPhone = (): string => {
    if (clientType === 'registered') {
      const found = clients.find((c) => c.id === selectedClientId);
      return found?.phone || found?.user?.phone || '';
    }
    return clientContact || '';
  };

  const getClientEmail = (): string => {
    if (clientType === 'registered') {
      const found = clients.find((c) => c.id === selectedClientId);
      return found?.email || found?.user?.email || '';
    }
    return clientEmail || '';
  };

  // D6, parte 1 (02/11/2026): o texto mandava criar cadastro e prometia que a equipe vincularia a
  // proposta ao acesso do cliente e que ele acompanharia tudo "em tempo real" no painel. Nada disso
  // acontece hoje (o cadastro não vincula proposta, e não há tela para isso). Fica só o que é verdade.
  const buildWhatsappInviteText = (): string => {
    const eventName = eventTitle || 'seu evento';
    return [
      `Olá! A proposta comercial do evento "${eventName}" está pronta.` ,
      `Total estimado: ${formatPrice(subtotal)}.`,
      'Acabei de gerar o PDF para envio neste atendimento.',
      'Para ajustar algo ou confirmar, é só responder por aqui.',
    ].join(' ');
  };

  const normalizeWhatsAppNumber = (raw: string): string | null => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null;

    if (digits.startsWith('55') && digits.length >= 12) return digits;
    if (digits.length === 10 || digits.length === 11) return `55${digits}`;
    if (digits.length >= 12) return digits;

    return null;
  };

  const generateProposalPdf = async (): Promise<void> => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const logoDataUrl = await loadLogoAsDataUrl();

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', 14, 10, 42, 14);
    }

    doc.setFontSize(16);
    doc.text('Proposta Comercial', 14, 32);

    doc.setFontSize(10);
    doc.text(`Gerada em: ${new Date().toLocaleString('pt-BR')}`, 14, 38);
    doc.text(`Responsavel: ${user?.name || 'Equipe X Producoes'}`, 14, 43);

    doc.setFontSize(11);
    doc.text('Cliente', 14, 52);
    doc.setFontSize(10);
    doc.text(`Nome: ${getClientDisplayName()}`, 14, 57);
    doc.text(`WhatsApp: ${getClientPhone() || '-'}`, 14, 62);
    doc.text(`Email: ${getClientEmail() || '-'}`, 14, 67);

    doc.setFontSize(11);
    doc.text('Evento', 14, 77);
    doc.setFontSize(10);
    doc.text(`Titulo: ${eventTitle || 'Proposta Rapida'}`, 14, 82);
    doc.text(`Inicio: ${formatDateTime(eventDate)}`, 14, 87);
    doc.text(`Termino: ${formatDateTime(eventEndDate)}`, 14, 92);
    doc.text(`Local: ${location || '-'}`, 14, 97);

    const fullAddress = [street, addressNumber, neighborhood, city, state, zipCode]
      .filter(Boolean)
      .join(', ');
    const addressLines = doc.splitTextToSize(`Endereco: ${fullAddress || '-'}`, 180);
    doc.text(addressLines, 14, 102);

    autoTable(doc, {
      startY: 112,
      head: [['Item', 'Tipo', 'Qtd', 'Unitario', 'Desconto', 'Total']],
      body: pricedItems.map((item) => [
        lineDescription(item, equipmentUnit, eventDate, eventEndDate),
        ITEM_TYPE_LABELS[item.type] || item.type,
        String(item.quantity),
        formatPrice(item.unitPrice),
        formatPrice(item.discount),
        formatPrice(item.totalPrice),
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [25, 118, 210] },
    });

    const tableEndY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 120;
    doc.setFontSize(12);
    doc.text(`Total estimado: ${formatPrice(subtotal)}`, 14, tableEndY + 10);

    // Este PDF vai para o cliente: as observações internas não entram nele.
    const inviteTitleY = tableEndY + 22;
    doc.setFontSize(11);
    doc.text('Mensagem sugerida para WhatsApp', 14, inviteTitleY);
    doc.setFontSize(10);
    const inviteLines = doc.splitTextToSize(buildWhatsappInviteText(), 180);
    doc.text(inviteLines, 14, inviteTitleY + 6);

    const filenameClient = getClientDisplayName().replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    const fileName = `proposta-${filenameClient || 'cliente'}-${Date.now()}.pdf`;
    doc.save(fileName);
  };

  const handleDownloadPdf = async () => {
    const validationError = validate();
    if (validationError) {
      addNotification({ type: 'error', title: 'Campos pendentes', message: validationError });
      return;
    }

    try {
      setGeneratingPdf(true);
      await generateProposalPdf();

      addNotification({
        type: 'success',
        title: 'PDF pronto',
        message: 'Arquivo gerado com sucesso para envio via WhatsApp.',
      });
    } catch (error: unknown) {
      const err = error as { message?: string } | null;
      addNotification({
        type: 'error',
        title: 'Falha no PDF',
        message: err?.message || 'Nao foi possivel gerar o PDF da proposta.',
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadAndOpenWhatsApp = async () => {
    const validationError = validate();
    if (validationError) {
      addNotification({ type: 'error', title: 'Campos pendentes', message: validationError });
      return;
    }

    const normalizedPhone = normalizeWhatsAppNumber(getClientPhone());
    if (!normalizedPhone) {
      addNotification({
        type: 'error',
        title: 'WhatsApp inválido',
        message: 'Informe um telefone de cliente válido para abrir o WhatsApp automaticamente.',
      });
      return;
    }

    try {
      setSendingWhatsApp(true);
      // P14 (aprovada em 02/11/2026), parte 2: todo WhatsApp aberto pelo painel usa o abridor sem o evento de
      // conversão do GA (D7), o mesmo da ficha da reserva, e abre no clique, antes do PDF (que espera o logo):
      // depois de uma espera o navegador pode bloquear a aba.
      openWhatsAppUntracked(normalizedPhone, buildWhatsappInviteText());
      await generateProposalPdf();

      addNotification({
        type: 'success',
        title: 'WhatsApp aberto',
        message: 'PDF baixado. O WhatsApp foi aberto com mensagem pronta. Anexe o PDF na conversa para enviar.',
      });
    } catch (error: unknown) {
      const err = error as { message?: string } | null;
      addNotification({
        type: 'error',
        title: 'Falha no envio',
        message: err?.message || 'Nao foi possivel abrir o WhatsApp com a proposta.',
      });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  // Carregando dentro do layout (antes: BrandLoader em tela cheia, sem menu nem título).
  if (loading) {
    return (
      <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <BrandLoader size="xl" label="Carregando catálogo…" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Zap className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Nova proposta comercial</h2>
              <p className="text-sm text-muted-foreground">Monte o orçamento e gere o link ou o PDF para o cliente.</p>
            </div>
          </div>
          {/* flex-wrap: os 4 botões em linha estouravam a tela de 375px. */}
          <div className="flex flex-wrap gap-2">
             <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Cancelar</Button>
             <Button variant="outline" size="sm" onClick={handleDownloadPdf} isLoading={generatingPdf}>
              Baixar PDF
             </Button>
             <Button variant="outline" size="sm" onClick={handleDownloadAndOpenWhatsApp} isLoading={sendingWhatsApp}>
              PDF + WhatsApp
             </Button>
             <Button size="sm" onClick={() => handleSave('PENDING')} isLoading={saving} leftIcon={<Send className="h-4 w-4" />}>
                Salvar proposta
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Client Card */}
            <Card className="p-6 border-2">
               <h3 className="flex items-center gap-2 mb-6 text-primary font-semibold uppercase text-xs tracking-wider">
                 <Package className="h-4 w-4" aria-hidden="true" /> Dados do cliente
               </h3>
               
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
                      <Input label="Nome Completo *" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ex: João Silva" />
                      <Input label="WhatsApp / Celular *" value={clientContact} onChange={e => setClientContact(e.target.value)} placeholder="(00) 00000-0000" />
                      <Input label="E-mail" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Ex: joao@email.com" type="email" />
                    </div>
                  )}
               </div>
            </Card>

            {/* Items Card */}
            <Card className="p-6 border-2 border-primary/10 overflow-hidden">
               <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                 <h3 className="flex items-center gap-2 text-primary font-semibold uppercase text-xs tracking-wider">
                   <Calculator className="h-4 w-4" aria-hidden="true" /> Itens do orçamento
                 </h3>
                 <div className="flex flex-wrap gap-2">
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
               <p className="-mt-4 mb-6 text-xs text-muted-foreground">Técnico, montagem, frete e hora extra entram como itens (a hora extra do kit com valor cadastrado já entra na linha do kit, e serviço que o kit já traz não entra de novo). O botão Frete calcula pela distância até o endereço do evento (preencha o endereço antes), pela regra do servidor: equipamento avulso e kit de entrega têm contas diferentes, e só serviços ou só kit de retirada não têm frete. Pedágio estimado à parte.</p>
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
                                  <span className="text-xs text-muted-foreground">Na proposta: {lineDescription(item, equipmentUnit, eventDate, eventEndDate)}</span>
                                </>
                              )}
                              {item.service && !item.priceEdited && (
                                <span className="text-xs text-muted-foreground">Na proposta: {lineDescription(item, equipmentUnit, eventDate, eventEndDate)}</span>
                              )}
                              {item.ratePerUnit !== undefined && !item.priceEdited && (
                                <span className="text-xs text-muted-foreground">
                                  {formatPrice(item.ratePerUnit)}{equipmentUnitSuffix(equipmentUnit)} × {equipmentUnitText(unitsFor(item, equipmentUnit, eventDate, eventEndDate), equipmentUnit)}
                                </span>
                              )}
                           </div>
                         </div>

                         <div className="flex flex-wrap items-end gap-3">
                           <div className="w-20">
                             <Input
                               label="Qtd"
                               size="xs"
                               type="number"
                               className="text-center font-bold"
                               value={item.quantity}
                               onChange={e => updateItem(item.id, 'quantity', Number(e.target.value))}
                             />
                           </div>
                           <div className="w-36">
                             {/* `prefix="R$"` não é prop do Input (virava atributo HTML sem efeito). */}
                             <Input
                               label="Preço unit."
                               size="xs"
                               type="number"
                               leftIcon={<span className="text-xs font-semibold">R$</span>}
                               value={item.unitPrice}
                               onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                             />
                           </div>
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
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium uppercase tracking-wider text-xs">Subtotal estimado</span>
                    <span className="font-mono font-bold text-lg">{formatPrice(subtotal)}</span>
                  </div>
               </div>
            </Card>

            <Card className="p-6">
               <h3 className="flex items-center gap-2 mb-6 text-primary font-semibold uppercase text-xs tracking-wider">
                 <Settings className="h-4 w-4" aria-hidden="true" /> Evento e local
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Input label="Título do Evento" value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="Ex: Casamento João & Maria" />
                 <Input label="Local / Salão *" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex: Espaço VIP" />
                 <Input label="Início Previsto *" type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                 <Input label="Término Previsto *" type="datetime-local" value={eventEndDate} onChange={e => setEventEndDate(e.target.value)} />
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
                   <Input label="CEP *" value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="00000-000" className="md:col-span-1" error={fieldErrors.zipCode} />
                   <Input label="Rua *" value={street} onChange={e => setStreet(e.target.value)} placeholder="Ex: Av. Brasil" className="md:col-span-2" error={fieldErrors.street} />
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   <Input label="Número *" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} placeholder="Ex: 123" error={fieldErrors.addressNumber} />
                   <Input label="Bairro *" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Ex: Centro" error={fieldErrors.neighborhood} />
                   <Input label="Cidade *" value={city} onChange={e => setCity(e.target.value)} placeholder="Ex: Belo Horizonte" error={fieldErrors.city} />
                   <Input label="UF *" value={state} onChange={e => setState(e.target.value)} placeholder="Ex: MG" maxLength={2} error={fieldErrors.state} />
                 </div>
               </div>
               <div className="mt-4">
                 <Textarea label="Observações Internas (Não aparecem na proposta)" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex.: cliente pediu desconto; negociar o frete se fechar hoje." />
               </div>
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
                               {formatPrice(catalogPrice(searchType, item))}{searchType === 'EQUIPMENT' ? equipmentUnitSuffix(equipmentUnit) : ''}
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
    </AdminLayout>
  );
};

export default AdminQuickProposalPage;
