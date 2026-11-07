import { formatBrasiliaDate } from './whatsapp';

// P14 e D11 (aprovadas em 02/11/2026): "o WhatsApp ao cliente vira botões 'Enviar no WhatsApp' com texto pronto em
// cada etapa". Os textos que o painel manda ao cliente ficam aqui, um por etapa; o botão abre o WhatsApp com
// openWhatsAppUntracked (utils/whatsapp), sem o evento de conversão do GA. Por enquanto só a proposta (D11, "Enviar
// proposta" na ficha); a P14 parte 2 traz as outras etapas para cá.

/** Proposta pronta: o link seguro (/proposta#token=...) e a validade, com a data do evento no horário de Brasília. */
export const proposalWhatsAppText = (p: {
  clientName?: string | null;
  eventTitle?: string | null;
  eventDate?: string | Date | null;
  link: string;
  validUntil?: string | Date | null;
}): string => {
  const firstName = p.clientName?.trim().split(/\s+/)[0];
  const title = p.eventTitle?.trim();
  const date = formatBrasiliaDate(p.eventDate);
  const validUntil = formatBrasiliaDate(p.validUntil);
  return [
    `${firstName ? `Olá, ${firstName}!` : 'Olá!'} A proposta ${title ? `do seu evento "${title}"` : 'do seu evento'}${date ? ` (${date})` : ''} está pronta.`,
    `Veja os itens e o valor neste link: ${p.link}`,
    `${validUntil ? `A proposta vale até ${validUntil}. ` : ''}Qualquer dúvida, é só responder esta mensagem.`,
  ].join('\n');
};
