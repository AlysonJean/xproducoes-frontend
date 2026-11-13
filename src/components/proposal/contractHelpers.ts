import { RESERVATION_POLICY_SECTIONS } from '@/data/reservationPolicyContent';
import type { StandardVariant } from '@/components/ui/StandardTypes';
import { isValidCnpj, isValidCpf, normalizeDocument, onlyDigits } from '@/utils/document';
import type {
  AdminContract,
  AdminContractEvent,
  ContractInstallment,
  ContractParty,
  ContractPersonType,
  ContractPurpose,
  ContractState,
} from '@/types/contract';

// Aceite online (13/11/2026): o que o fluxo de aceite da página da proposta, o cartão "Contrato" da área do cliente e o
// da ficha do painel usam em comum (datas, nomes dos estados, o formulário do contratante, as cláusulas em destaque e a
// leitura da resposta do painel). Datas sempre no horário de Brasília, qualquer que seja o fuso do aparelho.

const TZ = 'America/Sao_Paulo';
const dateFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
const dayMonthFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

const validDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** "20/12/2027" (vazio sem data válida). */
export const contractDate = (value?: string | null): string => {
  const date = validDate(value);
  return date ? dateFmt.format(date) : '';
};
/** "20/12/2027 às 22:00". */
export const contractDateTime = (value?: string | null): string => {
  const date = validDate(value);
  return date ? `${dateFmt.format(date)} às ${timeFmt.format(date)}` : '';
};
/** "20/12" (a desistência). */
export const contractDayMonth = (value?: string | null): string => {
  const date = validDate(value);
  return date ? dayMonthFmt.format(date) : '';
};
/** "20/12 às 22:00" (o prazo de desistência). */
export const contractDayMonthTime = (value?: string | null): string => {
  const date = validDate(value);
  return date ? `${dayMonthFmt.format(date)} às ${timeFmt.format(date)}` : '';
};

/** "22:10" (a validade do código). */
export const contractTime = (value?: string | null): string => {
  const date = validDate(value);
  return date ? timeFmt.format(date) : '';
};

/** A hora de agora (fora do corpo do componente, que não chama Date.now direto). */
export const currentTime = (): number => Date.now();

const LINK_INVALID = 'Este link não é válido. Peça um novo link à equipe.';
const LINK_GONE = 'Este link venceu ou foi trocado. Peça um novo link à equipe.';

/** A frase do servidor (já escrita para o cliente), ou vazio quando o erro não trouxe uma ("HTTP 409: ..."). */
export const serverMessage = (info: { message: string }): string =>
  info.message && !/^HTTP \d/.test(info.message) ? info.message : '';

/**
 * Respostas que dizem que o contrato já foi aceito (ALREADY_ACCEPTED) ou desistido (CONTRACT_WITHDRAWN): a página abre
 * a proposta de novo e mostra a confirmação ou "Contratação desistida".
 */
export const reopensProposal = (code: string | null): boolean => code === 'ALREADY_ACCEPTED' || code === 'CONTRACT_WITHDRAWN';

/**
 * A mensagem dos erros comuns às rotas do aceite: link inválido ou vencido, limitador, serviço fora do ar e, nos
 * 400/409/422 (proposta encerrada, sem valor, desistida...), a frase do servidor, que já é para o cliente.
 */
export function contractErrorMessage(info: { status: number | null; message: string }, fallback: string): string {
  const fromServer = serverMessage(info);
  if (info.status === 404) return LINK_INVALID;
  if (info.status === 410) return LINK_GONE;
  if (info.status === 429) return fromServer || 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
  if (info.status === 503) return 'O aceite pelo site está indisponível no momento. Tente de novo em alguns minutos ou fale com a equipe.';
  if ((info.status === 400 || info.status === 409 || info.status === 422) && fromServer) return fromServer;
  return fallback;
}

/** O prazo de desistência ainda está aberto (o servidor decide; aqui só não oferece o botão depois do prazo). */
export function withdrawalOpen(withdrawUntil?: string | null, canWithdraw?: boolean, now = Date.now()): boolean {
  const until = validDate(withdrawUntil);
  return Boolean(until) && canWithdraw !== false && (until as Date).getTime() > now;
}

export const CONTRACT_STATE_LABEL: Record<ContractState, string> = {
  NONE: 'Sem contrato',
  PREPARED: 'Aguardando aceite',
  ACCEPTED: 'Aceito',
  WITHDRAWN: 'Desistência registrada',
  SUPERSEDED: 'Substituído por outro',
};

export const CONTRACT_STATE_VARIANT: Record<ContractState, StandardVariant> = {
  NONE: 'ghost',
  PREPARED: 'warning',
  ACCEPTED: 'success',
  WITHDRAWN: 'destructive',
  SUPERSEDED: 'ghost',
};

export const contractStateLabel = (state?: string | null): string =>
  (state && CONTRACT_STATE_LABEL[state as ContractState]) || 'Sem contrato';
export const contractStateVariant = (state?: string | null): StandardVariant =>
  (state && CONTRACT_STATE_VARIANT[state as ContractState]) || 'ghost';

export const PURPOSE_LABEL: Record<ContractPurpose, string> = {
  OWN_EVENT: 'Evento próprio (cliente final)',
  RESALE: 'Revenda ou produção do evento de outra pessoa (revendedor)',
};

export const PERSON_TYPE_LABEL: Record<ContractPersonType, string> = {
  PF: 'Pessoa física',
  PJ: 'Pessoa jurídica',
};

// Os eventos da trilha do aceite (roteiro da leva B: gerado, código enviado, código conferido, aceito, e-mail enviado,
// desistiu), com os tipos do servidor. Tipo desconhecido aparece como veio.
const EVENT_LABEL: Record<string, string> = {
  GENERATED: 'Contrato gerado',
  OTP_SENT: 'Código enviado',
  OTP_REJECTED: 'Código recusado',
  OTP_VERIFIED: 'Código conferido',
  ACCEPTED: 'Aceito',
  EMAIL_SENT: 'E-mail do contrato enviado',
  WITHDRAWN: 'Desistiu',
  SUPERSEDED: 'Substituído por outro',
};
export const contractEventLabel = (type: string): string => EVENT_LABEL[type] ?? type;

// ── Cláusulas em destaque ─────────────────────────────────────────────────────
// O resumo antes do "Aceito" mostra em destaque as cláusulas que limitam direitos (Código de Defesa do Consumidor,
// art. 54, § 4º). O texto vem da política de reserva (data/reservationPolicyContent.ts, versão 2026-11-13, as mesmas
// regras do contrato): os parágrafos que ela já marca em destaque. O contrato completo (o PDF) vale sobre o resumo.

type PolicyParagraph = { kind: 'paragraph'; text: string; highlight?: boolean };
const paragraphsOf = (sectionId: string): PolicyParagraph[] =>
  (RESERVATION_POLICY_SECTIONS.find((section) => section.id === sectionId)?.blocks ?? []).filter(
    (block): block is PolicyParagraph => block.kind === 'paragraph',
  );
const highlightsOf = (sectionId: string): string[] =>
  paragraphsOf(sectionId)
    .filter((p) => p.highlight)
    .map((p) => p.text);

const LIMITING_SECTIONS = ['pagamento', 'local-energia-informacoes', 'danos', 'forca-maior', 'licencas-e-som'] as const;

/** As cláusulas em destaque, por assunto (o título da seção da política e os parágrafos marcados nela). */
export function limitingClauses(): Array<{ title: string; texts: string[] }> {
  return LIMITING_SECTIONS.map((id) => ({
    title: RESERVATION_POLICY_SECTIONS.find((section) => section.id === id)?.title ?? '',
    texts: highlightsOf(id),
  })).filter((clause) => clause.title && clause.texts.length > 0);
}

/**
 * Os parágrafos que acompanham a tabela de cancelamento: o limite da retenção (em destaque), a multa recíproca e, só
 * para o cliente final, a reparação de outros prejuízos (CDC, art. 6º, VI; revisão jurídica da leva A).
 */
export function cancellationNotes(purpose: ContractPurpose | null): { highlight: string[]; plain: string[] } {
  const company = paragraphsOf('cancelamento-pela-empresa').map((p) => p.text);
  const consumer = company.filter((text) => /6º, VI/.test(text));
  return {
    highlight: highlightsOf('cancelamento-pelo-cliente'),
    plain: [company[0], ...(purpose === 'OWN_EVENT' ? consumer : [])].filter((text): text is string => Boolean(text)),
  };
}

// ── Formulário do contratante (passo 1) ───────────────────────────────────────

export interface PartyForm {
  personType: ContractPersonType;
  name: string;
  document: string;
  email: string;
  phone: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  representativeName: string;
  representativeCpf: string;
  representativeRole: string;
  /** PJ: quem aceita declara ter poderes para representar a empresa. */
  powers: boolean;
  purpose: ContractPurpose | '';
}

export const EMPTY_PARTY_FORM: PartyForm = {
  personType: 'PF',
  name: '',
  document: '',
  email: '',
  phone: '',
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  representativeName: '',
  representativeCpf: '',
  representativeRole: '',
  powers: false,
  purpose: '',
};

/** O campo do formulário de cada chave do fieldErrors do servidor ("party.document"...; também sem o "party."). */
const FIELD_OF: Record<string, keyof PartyForm> = {
  personType: 'personType',
  name: 'name',
  document: 'document',
  email: 'email',
  phone: 'phone',
  'address.zipCode': 'zipCode',
  'address.street': 'street',
  'address.number': 'number',
  'address.complement': 'complement',
  'address.neighborhood': 'neighborhood',
  'address.city': 'city',
  'address.state': 'state',
  // "Informe nome, CPF e cargo de quem aceita pela empresa." (o representante inteiro faltando).
  representative: 'representativeName',
  'representative.name': 'representativeName',
  'representative.cpf': 'representativeCpf',
  'representative.role': 'representativeRole',
  purpose: 'purpose',
};

export type PartyFormErrors = Partial<Record<keyof PartyForm, string>>;

/** Os erros por campo do servidor no formulário; o que não for de um campo conhecido volta em "other". */
export function formErrorsFromServer(fieldErrors: Record<string, string>): { errors: PartyFormErrors; other: string[] } {
  const errors: PartyFormErrors = {};
  const other: string[] = [];
  Object.entries(fieldErrors).forEach(([key, reason]) => {
    const field = FIELD_OF[key.replace(/^party\./, '')];
    if (field) errors[field] = reason;
    else other.push(reason);
  });
  return { errors, other };
}

export const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A conferência do passo 1, antes de chamar o servidor (que confere de novo). */
export function validatePartyForm(form: PartyForm): PartyFormErrors {
  const errors: PartyFormErrors = {};
  const pj = form.personType === 'PJ';
  if (form.name.trim().length < 3) errors.name = pj ? 'Informe a razão social.' : 'Informe o seu nome completo.';
  if (pj ? !isValidCnpj(form.document) : !isValidCpf(form.document)) {
    errors.document = pj ? 'Informe um CNPJ válido.' : 'Informe um CPF válido.';
  }
  if (pj) {
    if (form.representativeName.trim().length < 3) errors.representativeName = 'Informe o nome de quem aceita pela empresa.';
    if (!isValidCpf(form.representativeCpf)) errors.representativeCpf = 'Informe um CPF válido.';
    if (!form.representativeRole.trim()) errors.representativeRole = 'Informe o cargo de quem aceita.';
    if (!form.powers) errors.powers = 'Confirme que você tem poderes para representar a empresa.';
  }
  if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Informe um e-mail válido.';
  const phone = onlyDigits(form.phone);
  if (phone.length < 10 || phone.length > 11) errors.phone = 'Informe um telefone com DDD.';
  if (onlyDigits(form.zipCode).length !== 8) errors.zipCode = 'Informe o CEP (8 números).';
  if (!form.street.trim()) errors.street = 'Informe a rua.';
  if (!form.number.trim()) errors.number = 'Informe o número (ou "s/n").';
  if (!form.neighborhood.trim()) errors.neighborhood = 'Informe o bairro.';
  if (!form.city.trim()) errors.city = 'Informe a cidade.';
  if (!(BRAZIL_STATES as readonly string[]).includes(form.state)) errors.state = 'Escolha o estado.';
  if (!form.purpose) errors.purpose = 'Responda para quem é a contratação.';
  return errors;
}

/** O corpo "party" do POST /proposals/contract/prepare: documento, telefone e CEP só com os números. */
export function partyFromForm(form: PartyForm): ContractParty {
  const party: ContractParty = {
    personType: form.personType,
    name: form.name.trim(),
    document: normalizeDocument(form.document),
    email: form.email.trim(),
    phone: onlyDigits(form.phone),
    address: {
      street: form.street.trim(),
      number: form.number.trim(),
      neighborhood: form.neighborhood.trim(),
      city: form.city.trim(),
      state: form.state,
      zipCode: onlyDigits(form.zipCode),
      ...(form.complement.trim() ? { complement: form.complement.trim() } : {}),
    },
    purpose: form.purpose as ContractPurpose,
  };
  if (form.personType === 'PJ') {
    party.representative = {
      name: form.representativeName.trim(),
      cpf: onlyDigits(form.representativeCpf),
      role: form.representativeRole.trim(),
    };
  }
  return party;
}

// ── Resposta do painel ────────────────────────────────────────────────────────

const rec = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
const str = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);
const installment = (value: unknown): ContractInstallment | null => {
  const v = rec(value);
  return typeof v.amount === 'number' && typeof v.dueDate === 'string' ? { amount: v.amount, dueDate: v.dueDate } : null;
};

/**
 * GET /admin/bookings/:id/contract, com os nomes combinados com o servidor. O que faltar fica vazio (a linha some da
 * ficha), nunca derruba o cartão.
 */
export function normalizeAdminContract(raw: unknown): AdminContract {
  const r = rec(raw);
  const p = rec(r.party);
  const rep = rec(p.representative);
  const address = rec(p.address);
  const events: AdminContractEvent[] = (Array.isArray(r.events) ? r.events : [])
    .map((item) => ({ type: str(rec(item).type) ?? '', createdAt: str(rec(item).createdAt) ?? '' }))
    .filter((e) => e.type);
  return {
    state: (str(r.state) as ContractState) ?? 'PREPARED',
    purpose: r.purpose === 'OWN_EVENT' || r.purpose === 'RESALE' ? r.purpose : null,
    templateVersion: str(r.templateVersion),
    sha256: str(r.sha256),
    acceptedAt: str(r.acceptedAt),
    withdrawUntil: str(r.withdrawUntil),
    withdrawnAt: str(r.withdrawnAt),
    withdrawReason: str(r.withdrawReason),
    ip: str(r.ip),
    userAgent: str(r.userAgent),
    otpEmail: str(r.otpEmail),
    party: str(p.name)
      ? {
          personType: p.personType === 'PJ' ? 'PJ' : 'PF',
          name: str(p.name) ?? '',
          document: str(p.document) ?? '',
          email: str(p.email) ?? '',
          phone: str(p.phone) ?? '',
          address: str(address.street) ? (address as unknown as ContractParty['address']) : null,
          representative: str(rep.name) ? { name: str(rep.name) ?? '', cpf: str(rep.cpf) ?? '', role: str(rep.role) ?? '' } : null,
        }
      : null,
    initialPayment: installment(r.initialPayment),
    balance: installment(r.balance),
    events,
  };
}

/** Copia um texto para a área de transferência; false quando o navegador não deixa. */
export async function copyText(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
