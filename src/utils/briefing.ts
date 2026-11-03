// Página /briefing: regras e textos, separados da tela. O cliente conta como é o evento sem escolher
// itens do catálogo; as respostas viram um texto legível em specialRequests, que o painel mostra na
// ficha da reserva, e o envio cria o cadastro dele (POST /bookings/guest).

export const BRIEFING_STEPS = ['O evento', 'O local', 'O que você precisa', 'Detalhes', 'Seus dados'] as const;

export const EVENT_TYPES = ['Casamento', 'Aniversário ou 15 anos', 'Corporativo', 'Formatura', 'Show ou festival', 'Evento religioso', 'Outro'];
export const GUEST_RANGES = ['Até 50', '50 a 100', '100 a 200', '200 a 500', 'Mais de 500', 'Ainda não sei'];
export const ENVIRONMENTS = ['Fechado', 'Coberto', 'Ao ar livre', 'Ainda não sei'];
export const YES_NO_UNKNOWN = ['Sim', 'Não', 'Não sei'];
export const VOLTAGES = ['110V', '220V', 'Não sei'];
export const NEEDS = ['Som', 'Iluminação', 'Palco', 'DJ', 'Banda ao vivo', 'Microfones', 'Ainda não sei, quero ajuda'];
export const DJ_OPTIONS = ['Preciso de um DJ', 'Já tenho DJ, com equipamento', 'Já tenho DJ, sem equipamento'];

export const NEED_BAND = 'Banda ao vivo';
export const NEED_DJ = 'DJ';

export const NOT_DEFINED = 'A definir';

// Quem preenche não vê este número; ele vai junto no registro, para saber qual texto a pessoa leu.
export const BRIEFING_TERMS_VERSION = '2026-11';
export const BRIEFING_TERMS =
  'Estou ciente de que o orçamento considera as informações acima e que mudanças no local, no horário, no público ou na energia podem alterar o valor. Energia adequada no local, licenças (como ECAD e prefeitura) e danos causados por convidados são de responsabilidade do contratante. Sinal, hora extra e cancelamento seguem as condições da proposta.';

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

// Hora local do navegador, como no /orcamento. Término menor ou igual ao início é madrugada do dia
// seguinte (festa que acaba às 2h). Sem horário definido, vale a faixa padrão só para a data existir;
// o texto do briefing avisa a equipe que o horário está a confirmar.
export function eventRange(answers: BriefingAnswers): { start: Date; end: Date; hours: number } {
  const startTime = answers.timeUnknown ? EMPTY_BRIEFING.startTime : answers.startTime;
  const endTime = answers.timeUnknown ? EMPTY_BRIEFING.endTime : answers.endTime;
  const start = new Date(`${answers.eventDate}T${startTime}:00`);
  const end = new Date(`${answers.eventDate}T${endTime}:00`);
  if (end <= start) end.setDate(end.getDate() + 1);
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
  const setup = answers.setupTime ? new Date(`${answers.eventDate}T${answers.setupTime}:00`) : null;
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
