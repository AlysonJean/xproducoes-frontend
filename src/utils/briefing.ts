// Página /briefing: regras e textos, separados da tela. O cliente conta como é o evento sem escolher
// itens do catálogo; as respostas viram um texto legível em specialRequests, que o painel mostra na
// ficha da reserva, e o envio cria o cadastro dele (POST /bookings/guest).

import { brasiliaDateTime, nextDateISO } from './brasiliaTime';

export const BRIEFING_STEPS = ['O evento', 'O local', 'O que você precisa', 'Detalhes', 'Seus dados'] as const;

export const EVENT_TYPES = ['Casamento', 'Aniversário ou 15 anos', 'Corporativo', 'Formatura', 'Show ou festival', 'Evento religioso', 'Outro'];
// Auditoria do orçamento (12/11/2026), E9 e E11: o maior kit atende até 500 pessoas; acima disso é sob consulta.
export const GUEST_OVER_500 = 'Mais de 500 (sob consulta)';
export const GUEST_RANGES = ['Até 50', '50 a 100', '100 a 200', '200 a 500', GUEST_OVER_500, 'Ainda não sei'];
export const ENVIRONMENTS = ['Fechado', 'Coberto', 'Ao ar livre', 'Ainda não sei'];
export const YES_NO_UNKNOWN = ['Sim', 'Não', 'Não sei'];
export const VOLTAGES = ['110V', '220V', 'Não sei'];

// Auditoria do orçamento (12/11/2026), E10 e E11: as estruturas do catálogo (palco, trave, backdrop) e o telão ou
// painel de LED, que é sob consulta (parceiro); "Banda ao vivo" parecia que a empresa leva a banda: é o som para ela.
export const NEED_STRUCTURES = 'Estruturas (palco, trave, backdrop)';
export const NEED_LED = 'Telão / painel de LED (sob consulta)';
export const NEED_BAND = 'Vai ter banda ao vivo (som para a banda)';
export const NEED_DJ = 'DJ';
export const NEEDS = ['Som', 'Iluminação', NEED_STRUCTURES, NEED_LED, NEED_DJ, NEED_BAND, 'Microfones', 'Ainda não sei, quero ajuda'];
export const DJ_OPTIONS = ['Preciso de um DJ', 'Já tenho DJ, com equipamento', 'Já tenho DJ, sem equipamento'];

// Auditoria do orçamento (12/11/2026), E11: numa entrega há duas formas de atender (decisão da dona de 06/11): a
// equipe monta e busca depois, ou um técnico fica durante todo o evento (item à parte, pelas horas do evento, quando
// não vem no kit). Pergunta opcional, no passo de detalhes, que já é todo opcional.
export const EVENT_CREW_OPTIONS = ['Montar e buscar depois', 'Técnico durante todo o evento', 'Não sei'];

export const NOT_DEFINED = 'A definir';

// Quem preenche não vê este número; ele vai junto no registro, para saber qual texto a pessoa leu.
// Auditoria do orçamento (12/11/2026), O22 e D10: saiu "Sinal, hora extra e cancelamento seguem as condições da
// proposta" (nenhuma proposta traz essas condições, e a política de reserva ainda não está publicada). Entra o fluxo
// real: o pedido não é reserva; a proposta vem pelo link, com o frete e o pedágio; a data só fica confirmada com o
// aceite e o sinal. Texto novo, versão nova.
export const BRIEFING_TERMS_VERSION = '2026-11-12';
export const BRIEFING_TERMS =
  'Estou ciente de que o orçamento considera as informações acima e que mudanças no local, no horário, no público ou na energia podem alterar o valor. Energia adequada no local, licenças (como ECAD e prefeitura) e danos causados por convidados são de responsabilidade do contratante. Este pedido ainda não é uma reserva: a equipe confere a disponibilidade e manda a proposta num link, com o frete e o pedágio, quando houver, e a data só fica confirmada depois que eu aceitar a proposta e pagar o sinal.';

export interface BriefingAnswers {
  eventType: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  timeUnknown: boolean;
  guests: string;
  venueKnown: '' | 'yes' | 'no';
  venue: string;
  zipCode: string;
  street: string;
  addressNumber: string;
  addressComplement: string;
  neighborhood: string;
  city: string;
  state: string;
  environment: string;
  stairs: string;
  parking: string;
  needs: string[];
  bandSize: string;
  moreInfo: string;
  voltage: string;
  setupTime: string;
  soundLimit: string;
  rainCover: string;
  bandInstruments: string;
  bandRider: string;
  djOption: string;
  eventCrew: string;
  name: string;
  phone: string;
  email: string;
  accepted: boolean;
}

export const EMPTY_BRIEFING: BriefingAnswers = {
  eventType: '',
  eventDate: '',
  startTime: '19:00',
  endTime: '23:00',
  timeUnknown: false,
  guests: '',
  venueKnown: '',
  venue: '',
  zipCode: '',
  street: '',
  addressNumber: '',
  addressComplement: '',
  neighborhood: '',
  city: '',
  state: 'MG',
  environment: '',
  stairs: '',
  parking: '',
  needs: [],
  bandSize: '',
  moreInfo: '',
  voltage: '',
  setupTime: '',
  soundLimit: '',
  rainCover: '',
  bandInstruments: '',
  bandRider: '',
  djOption: '',
  eventCrew: '',
  name: '',
  phone: '',
  email: '',
  accepted: false,
};

export type BriefingErrors = Partial<Record<keyof BriefingAnswers, string>>;

const digitsOf = (value: string) => value.replace(/\D/g, '');

export function formatCep(value: string): string {
  const digits = digitsOf(value).slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export function isCompleteCep(value: string): boolean {
  return digitsOf(value).length === 8;
}

// Horário de Brasília, como no /orcamento (auditoria do orçamento, 12/11/2026, fuso: antes era o do aparelho, e quem
// preenchia de outro fuso gravava outra hora; ver utils/brasiliaTime.ts). Término menor ou igual ao início é madrugada
// do dia seguinte (festa que acaba às 2h). Sem horário definido, vale a faixa padrão só para a data existir; o texto do
// briefing avisa a equipe que o horário está a confirmar.
const brasiliaDate = (date: string, time: string): Date => brasiliaDateTime(date, time) ?? new Date(Number.NaN);

export function eventRange(answers: BriefingAnswers): { start: Date; end: Date; hours: number } {
  const startTime = answers.timeUnknown ? EMPTY_BRIEFING.startTime : answers.startTime;
  const endTime = answers.timeUnknown ? EMPTY_BRIEFING.endTime : answers.endTime;
  const start = brasiliaDate(answers.eventDate, startTime);
  let end = brasiliaDate(answers.eventDate, endTime);
  if (end <= start) end = brasiliaDate(nextDateISO(answers.eventDate), endTime);
  return { start, end, hours: Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 3_600_000)) };
}

/** O que falta para sair da etapa. Sem erro nenhum, pode avançar. */
export function stepErrors(step: number, answers: BriefingAnswers, options: { loggedIn: boolean; now?: Date }): BriefingErrors {
  const errors: BriefingErrors = {};
  if (step === 0) {
    if (!answers.eventType) errors.eventType = 'Escolha o tipo de evento.';
    if (!answers.eventDate) {
      errors.eventDate = 'Informe a data, mesmo que aproximada.';
    } else if (eventRange(answers).start <= (options.now ?? new Date())) {
      errors.eventDate = 'A data do evento precisa ser no futuro.';
    }
    if (!answers.timeUnknown && (!answers.startTime || !answers.endTime)) {
      errors.startTime = 'Informe o início e o término, ou marque que ainda não sabe.';
    }
    if (!answers.guests) errors.guests = 'Escolha uma opção. Se não souber, toque em "Ainda não sei".';
  }
  if (step === 1) {
    if (!answers.venueKnown) errors.venueKnown = 'Conte se o local já está definido.';
    if (answers.venueKnown === 'yes') {
      if (!answers.street.trim()) errors.street = 'Informe a rua.';
      if (!answers.addressNumber.trim()) errors.addressNumber = 'Informe o número. Se não houver, escreva S/N.';
      if (!answers.neighborhood.trim()) errors.neighborhood = 'Informe o bairro.';
    }
    if (answers.venueKnown) {
      if (!answers.city.trim()) errors.city = 'Informe a cidade.';
      if (!answers.state.trim()) errors.state = 'Informe o estado.';
    }
  }
  if (step === 2 && answers.needs.length === 0) {
    errors.needs = 'Escolha pelo menos uma opção. Se não souber, toque em "Ainda não sei, quero ajuda".';
  }
  if (step === 4) {
    if (answers.name.trim().length < 2) errors.name = 'Como podemos chamar você?';
    if (digitsOf(answers.phone).length < 10) errors.phone = 'Informe o WhatsApp com DDD.';
    if (!options.loggedIn && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email.trim())) {
      errors.email = 'Informe um e-mail válido. É por ele que você acompanha o pedido.';
    }
    if (!answers.accepted) errors.accepted = 'Para enviar, é preciso marcar que está ciente.';
  }
  return errors;
}

const brDate = (isoDate: string) => isoDate.split('-').reverse().join('/');

export function venueSummary(answers: BriefingAnswers): string {
  const cityState = `${answers.city.trim()}/${answers.state.trim().toUpperCase()}`;
  if (answers.venueKnown !== 'yes') return `Ainda não definido (${cityState})`;
  const address = `${answers.street.trim()}, ${answers.addressNumber.trim()}, ${answers.neighborhood.trim()}, ${cityState}`;
  return answers.venue.trim() ? `${answers.venue.trim()} (${address})` : address;
}

/** Texto gravado na reserva: só o que foi respondido, com "Não sei" escrito como a pessoa marcou. */
export function buildBriefingText(answers: BriefingAnswers, acceptedAt: Date): string {
  const hasBand = answers.needs.includes(NEED_BAND);
  const hasDj = answers.needs.includes(NEED_DJ);
  const outdoors = answers.environment === 'Ao ar livre';
  const lines: Array<[string, string]> = [
    ['Evento', answers.eventType],
    ['Data', brDate(answers.eventDate)],
    ['Horário', answers.timeUnknown ? 'A confirmar' : `${answers.startTime} às ${answers.endTime}`],
    ['Convidados', answers.guests],
    ['Local', venueSummary(answers)],
    ['Ambiente', answers.environment],
    ['Escadas no acesso', answers.stairs],
    ['Estacionamento ou carga e descarga', answers.parking],
    ['Precisa de', answers.needs.join(', ')],
    ['Integrantes da banda', hasBand ? answers.bandSize.trim() : ''],
    ['A banda leva os instrumentos', hasBand ? answers.bandInstruments : ''],
    ['A banda tem rider técnico', hasBand ? answers.bandRider : ''],
    ['DJ', hasDj ? answers.djOption : ''],
    ['Durante o evento', answers.eventCrew],
    ['Tensão da tomada', answers.voltage],
    ['Liberado para montar a partir de', answers.setupTime],
    ['O local tem horário limite para som', answers.soundLimit],
    ['Tem proteção em caso de chuva', outdoors ? answers.rainCover : ''],
    ['O cliente também disse', answers.moreInfo.trim()],
  ];
  const answered = lines.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`);
  return [
    '— Briefing preenchido pelo cliente —',
    ...answered,
    '',
    `— Ciência marcada em ${acceptedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (texto ${BRIEFING_TERMS_VERSION}) —`,
    BRIEFING_TERMS,
  ].join('\n');
}

export interface BriefingPayload {
  source: 'briefing';
  status: 'PENDING';
  eventTitle: string;
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
  setupTime?: string;
  clientName: string;
  clientContact: string;
  clientEmail?: string;
  specialRequests: string;
}

export function buildBriefingPayload(answers: BriefingAnswers, options: { loggedIn: boolean; acceptedAt: Date }): BriefingPayload {
  const { start, end, hours } = eventRange(answers);
  const known = answers.venueKnown === 'yes';
  // A hora da montagem também é a de Brasília (fuso, acima).
  const setup = answers.setupTime ? brasiliaDateTime(answers.eventDate, answers.setupTime) : null;
  return {
    source: 'briefing',
    status: 'PENDING',
    eventTitle: answers.eventType,
    eventDate: start.toISOString(),
    eventEndDate: end.toISOString(),
    eventDuration: hours,
    location: known ? answers.venue.trim() || answers.street.trim() : NOT_DEFINED,
    street: known ? answers.street.trim() : NOT_DEFINED,
    neighborhood: known ? answers.neighborhood.trim() : NOT_DEFINED,
    city: answers.city.trim(),
    state: answers.state.trim().toUpperCase(),
    zipCode: known && answers.zipCode.trim() ? answers.zipCode.trim() : NOT_DEFINED,
    addressNumber: known ? answers.addressNumber.trim() : 'S/N',
    ...(known && answers.addressComplement.trim() ? { addressComplement: answers.addressComplement.trim() } : {}),
    // "Não sei" não afirma nada contra: a logística usa o caso comum, e o texto do briefing mostra a dúvida.
    requiresStairs: answers.stairs === 'Sim',
    isCovered: answers.environment !== 'Ao ar livre',
    hasParking: answers.parking !== 'Não',
    ...(setup ? { setupTime: setup.toISOString() } : {}),
    clientName: answers.name.trim(),
    clientContact: answers.phone.trim(),
    ...(!options.loggedIn ? { clientEmail: answers.email.trim() } : {}),
    specialRequests: buildBriefingText(answers, options.acceptedAt),
  };
}

// Auditoria do orçamento (12/11/2026), O27: o teste da Home e a página de painel de LED por cidade abrem o briefing
// com respostas no endereço (?tipo=...&publico=...&ambiente=...&precisa=...). Só vale o que é uma das opções da página;
// o resto é ignorado.
const PREFILL_KEYS = { eventType: 'tipo', guests: 'publico', environment: 'ambiente', needs: 'precisa' } as const;

export interface BriefingPrefill {
  eventType?: string;
  guests?: string;
  environment?: string;
  needs?: string[];
}

/** O endereço do briefing com as respostas já escolhidas. */
export function briefingHref(prefill: BriefingPrefill): string {
  const params = new URLSearchParams();
  if (prefill.eventType) params.set(PREFILL_KEYS.eventType, prefill.eventType);
  if (prefill.guests) params.set(PREFILL_KEYS.guests, prefill.guests);
  if (prefill.environment) params.set(PREFILL_KEYS.environment, prefill.environment);
  for (const need of prefill.needs ?? []) params.append(PREFILL_KEYS.needs, need);
  const query = params.toString();
  return query ? `/briefing?${query}` : '/briefing';
}

/** As respostas que vieram no endereço, só as que são opções da página. */
export function briefingPrefill(search: string): BriefingPrefill {
  const params = new URLSearchParams(search);
  const option = (key: string, options: readonly string[]) => {
    const value = params.get(key);
    return value && options.includes(value) ? value : undefined;
  };
  const prefill: BriefingPrefill = {};
  const eventType = option(PREFILL_KEYS.eventType, EVENT_TYPES);
  const guests = option(PREFILL_KEYS.guests, GUEST_RANGES);
  const environment = option(PREFILL_KEYS.environment, ENVIRONMENTS);
  const needs = [...new Set(params.getAll(PREFILL_KEYS.needs).filter((need) => NEEDS.includes(need)))];
  if (eventType) prefill.eventType = eventType;
  if (guests) prefill.guests = guests;
  if (environment) prefill.environment = environment;
  if (needs.length > 0) prefill.needs = needs;
  return prefill;
}

export interface CepAddress {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

/** Endereço pelo CEP (ViaCEP, grátis). Qualquer falha devolve null: a pessoa preenche à mão. */
export async function lookupCep(cep: string, signal?: AbortSignal): Promise<CepAddress | null> {
  try {
    const response = await fetch(`https://viacep.com.br/ws/${digitsOf(cep)}/json/`, { signal });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || data.erro) return null;
    return {
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
    };
  } catch {
    return null;
  }
}
