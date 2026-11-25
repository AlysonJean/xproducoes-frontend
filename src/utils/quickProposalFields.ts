// Teste do painel de 25/11/2026 (A-09 e A-11): a Proposta rápida aceitava e-mail "abc@", telefone "123", data de ontem e
// CEP 00000-000, e mostrava os erros um por vez, só num aviso flutuante com o título "Campo obrigatório" (até para as
// datas). Agora cada campo tem a regra dele, todos os erros aparecem juntos, ao lado do campo, como no aceite do cliente
// e no cadastro de equipamentos. As regras dos itens (kit, quantidades, frete) continuam em validate() da página.
import { BRAZIL_STATES } from '../components/proposal/contractHelpers';

export type ProposalField =
  | 'clientName'
  | 'clientContact'
  | 'clientEmail'
  | 'location'
  | 'eventDate'
  | 'eventEndDate'
  | 'zipCode'
  | 'street'
  | 'addressNumber'
  | 'neighborhood'
  | 'city'
  | 'state';

export type ProposalFieldErrors = Partial<Record<ProposalField, string>>;

export interface ProposalFieldValues {
  clientName: string;
  clientContact: string;
  clientEmail: string;
  location: string;
  /** "AAAA-MM-DDTHH:mm" do campo de data e hora (horário do aparelho, como o resto da tela). */
  eventDate: string;
  eventEndDate: string;
  zipCode: string;
  street: string;
  addressNumber: string;
  neighborhood: string;
  city: string;
  state: string;
}

/** A ordem da tela: o foco vai para o primeiro campo com erro. */
export const PROPOSAL_FIELD_ORDER: ProposalField[] = [
  'clientName', 'clientContact', 'clientEmail', 'location', 'eventDate', 'eventEndDate',
  'zipCode', 'street', 'addressNumber', 'neighborhood', 'city', 'state',
];

const digits = (value: string) => value.replace(/\D/g, '');

/** Celular ou fixo do Brasil com DDD: 10 ou 11 números (o +55 na frente pode vir). */
export function isBrazilPhone(value: string): boolean {
  let d = digits(value);
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return false;
  return Number(d.slice(0, 2)) >= 11; // DDD de 11 a 99
}

// O mesmo formato que o servidor aceita (um @, domínio com ponto e final de 2 letras ou mais), sem espaço.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function proposalFieldErrors(
  values: ProposalFieldValues,
  options: { manualClient: boolean; now?: Date },
): ProposalFieldErrors {
  const errors: ProposalFieldErrors = {};
  const now = options.now ?? new Date();

  if (options.manualClient) {
    if (!values.clientName.trim()) errors.clientName = 'Informe o nome do cliente.';
    if (!values.clientContact.trim()) errors.clientContact = 'Informe o WhatsApp do cliente.';
    else if (!isBrazilPhone(values.clientContact)) errors.clientContact = 'Telefone inválido. Digite com o DDD, por exemplo (31) 98888-7777.';
    const email = values.clientEmail.trim();
    if (email && !EMAIL_RE.test(email)) errors.clientEmail = 'E-mail inválido. Confira, por exemplo: nome@gmail.com.';
  }

  if (!values.location.trim()) errors.location = 'Informe o local do evento.';

  const start = values.eventDate ? new Date(values.eventDate) : null;
  const end = values.eventEndDate ? new Date(values.eventEndDate) : null;
  if (!start || Number.isNaN(start.getTime())) errors.eventDate = 'Informe o início do evento (data e hora).';
  else if (start.getTime() < now.getTime()) errors.eventDate = 'O início já passou. Confira a data e a hora do evento.';
  if (!end || Number.isNaN(end.getTime())) errors.eventEndDate = 'Informe o término do evento (data e hora).';
  else if (start && !Number.isNaN(start.getTime()) && end.getTime() <= start.getTime()) errors.eventEndDate = 'O término precisa ser depois do início.';

  const cep = digits(values.zipCode);
  if (!cep) errors.zipCode = 'Informe o CEP.';
  else if (cep.length !== 8 || /^0+$/.test(cep)) errors.zipCode = 'CEP inválido. Digite os 8 números, por exemplo 30130-010.';
  if (!values.street.trim()) errors.street = 'Informe a rua.';
  if (!values.addressNumber.trim()) errors.addressNumber = 'Informe o número (ou "s/n").';
  if (!values.neighborhood.trim()) errors.neighborhood = 'Informe o bairro.';
  if (!values.city.trim()) errors.city = 'Informe a cidade.';
  const uf = values.state.trim().toUpperCase();
  if (!uf) errors.state = 'Informe a UF.';
  else if (!(BRAZIL_STATES as readonly string[]).includes(uf)) errors.state = 'Use a sigla do estado, por exemplo MG.';

  return errors;
}

/** "1 campo para corrigir" / "3 campos para corrigir". */
export function fieldErrorsSummary(errors: ProposalFieldErrors): string {
  const count = Object.keys(errors).length;
  return count === 1 ? '1 campo para corrigir, marcado em vermelho.' : `${count} campos para corrigir, marcados em vermelho.`;
}
