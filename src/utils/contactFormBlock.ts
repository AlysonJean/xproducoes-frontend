// D24 (aprovada em 02/11/2026): o formulário de contato do site guarda telefone, assunto, tipo de evento, data e
// orçamento num bloco no fim da mensagem (o modelo Contact não tem colunas para eles):
//
//   <texto digitado>\n\n— Dados do formulário —\nTelefone: ...\nAssunto: ...
//
// O servidor troca o marcador digitado por quem escreve por "- Dados do formulário -" (contactController), então o
// bloco que conta é o ÚLTIMO, e só os rótulos conhecidos valem. Daqui saem o botão "Responder no WhatsApp" e o
// "Transformar em proposta" da tela de contatos.
import { toWhatsAppNumber } from './bookingContact';

export const CONTACT_FORM_MARKER = '— Dados do formulário —';
const BLOCK_SEPARATOR = `\n\n${CONTACT_FORM_MARKER}\n`;
const KNOWN_FIELDS = ['Telefone', 'Assunto', 'Tipo de evento', 'Data do evento', 'Orçamento aproximado'] as const;
export type ContactFormField = (typeof KNOWN_FIELDS)[number];

export function parseContactFormBlock(message: string): { text: string; fields: Partial<Record<ContactFormField, string>> } {
  const normalized = (message || '').replace(/\r\n/g, '\n');
  const at = normalized.lastIndexOf(BLOCK_SEPARATOR);
  if (at < 0) return { text: normalized, fields: {} };
  const fields: Partial<Record<ContactFormField, string>> = {};
  for (const line of normalized.slice(at + BLOCK_SEPARATOR.length).split('\n')) {
    const sep = line.indexOf(': ');
    if (sep <= 0) continue;
    const label = line.slice(0, sep) as ContactFormField;
    const value = line.slice(sep + 2).trim();
    if (KNOWN_FIELDS.includes(label) && value && !(label in fields)) fields[label] = value;
  }
  return { text: normalized.slice(0, at), fields };
}

interface ContactLike {
  name: string;
  email: string;
  message: string;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || '';

/** wa.me com uma saudação pronta, ou null quando o formulário não trouxe telefone com DDD. */
export function contactWhatsAppReplyHref(contact: ContactLike): string | null {
  const number = toWhatsAppNumber(parseContactFormBlock(contact.message).fields.Telefone);
  if (!number) return null;
  const name = firstName(contact.name);
  const text = `Olá${name ? `, ${name}` : ''}! Aqui é da X Produções, recebemos sua mensagem pelo site.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/** O que a Proposta Rápida recebe pelo estado da navegação (nunca pela URL: são dados pessoais). */
export interface ContactProposalPrefill {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  eventType?: string;
  eventDate?: string; // dd/mm/aaaa, como o formulário grava
  budget?: string;
  text: string;
}

export function contactProposalPrefill(contact: ContactLike): ContactProposalPrefill {
  const { text, fields } = parseContactFormBlock(contact.message);
  return {
    name: contact.name,
    email: contact.email,
    phone: fields.Telefone,
    subject: fields.Assunto,
    eventType: fields['Tipo de evento'],
    eventDate: fields['Data do evento'],
    budget: fields['Orçamento aproximado'],
    text: text.trim(),
  };
}

/** "Casamento — Ana Souza" (sem o tipo, só o nome). */
export const contactEventTitle = (prefill: ContactProposalPrefill) =>
  prefill.eventType ? `${prefill.eventType} — ${prefill.name}` : prefill.name;

/** Observações internas da proposta: o que o contato informou, para conferir antes de enviar. */
export function proposalNotesFromContact(prefill: ContactProposalPrefill): string {
  return [
    'Pedido pelo formulário de contato do site.',
    prefill.subject && `Assunto: ${prefill.subject}`,
    prefill.eventType && `Tipo de evento: ${prefill.eventType}`,
    prefill.eventDate && `Data informada: ${prefill.eventDate}`,
    prefill.budget && `Orçamento aproximado: ${prefill.budget}`,
    prefill.text && `Mensagem: ${prefill.text}`,
  ].filter(Boolean).join('\n');
}
