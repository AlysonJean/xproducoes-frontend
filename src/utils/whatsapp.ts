
// Utilitários para integração com WhatsApp
// - Centraliza normalização de telefone, construção de mensagens e abertura do WhatsApp

import ReactGA from 'react-ga4';
import { createAndClickAnchor } from './dom';
import type { QuoteMessageParams } from '@/types/forms';
import { logger } from './logger';
import { formatBookingCode } from './bookingCode';
import { clientEventTitle } from './eventTitle';

export const normalizePhone = (phone: string): string => phone.replace(/\D/g, '');

export const getWhatsAppPhone = (opts?: { countryCode?: string }): string => {
  // .env (frontend):
  // VITE_WHATSAPP_PHONE -> número destino (pode conter +, espaços, etc.)
  // VITE_WHATSAPP_DDI   -> DDI para prefixar quando o número parecer local (ex.: 55 BR, 351 PT)
  // Achado (dev SSR): acessar import.meta.env via uma variável intermediária quebra o
  // Module Runner do Vite em dev ("Dynamic access of import.meta.env is not supported"),
  // forçando fallback para client-only rendering. Acesso estático (import.meta.env.CHAVE)
  // é exigido para funcionar tanto em dev SSR quanto em build de produção.
  const raw = import.meta.env.VITE_WHATSAPP_PHONE || '';
  const ddi = (opts?.countryCode || import.meta.env.VITE_WHATSAPP_DDI || '55').replace(/\D/g, '');
  const digits = normalizePhone(raw);

  // Se não veio nada, usa fallback conhecido (BR)
  // Telefone comercial desde 13/11/2026 (decisão de Alyson): (31) 99976-0416.
  if (!digits) return '5531999760416';

  // Se já começa com DDI, mantém
  if (digits.startsWith(ddi)) return digits;

  // Heurística: números locais no BR/Portugal têm 9-11 dígitos sem DDI.
  // Se tamanho parecer local, prefixa o DDI configurado.
  if (digits.length <= 11) {
    return `${ddi}${digits}`;
  }

  // Caso contrário, retorna os dígitos como estão
  return digits;
};

// P15 e D11 (aprovadas em 02/11/2026): abre o WhatsApp sem o evento de conversão do GA. É o abridor dos botões do
// painel (o clique do admin não é conversão de cliente) e o que a P14 parte 2 reaproveita nos botões de cada etapa.
// Tem de rodar dentro do clique, não depois de um await: fora do gesto do clique o bloqueador de pop-up segura a aba.
export const openWhatsAppUntracked = (phone: string, message: string): void => {
  const cleaned = normalizePhone(phone);
  const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
  // Tenta abrir em nova aba sem sair do site. Achado (revisão): com "noopener" o window.open
  // devolve sempre null (é o que a especificação manda), então o fallback abaixo rodava sempre e,
  // com pop-ups liberados, abriam duas abas do WhatsApp. Sem a flag, corta o opener à mão.
  const win = window.open(url, '_blank');
  if (win) {
    win.opener = null;
  } else {
    // Fallback para casos de bloqueio de popup: cria um link e clica programaticamente
      try {
        createAndClickAnchor({ href: url, target: '_blank', rel: 'noopener noreferrer' });
            } catch {
        logger.warn('Não foi possível abrir o WhatsApp automaticamente.', 'whatsapp');
      }
  }
};

export const openWhatsApp = (phone: string, message: string): void => {
  // GA4 Event Tracking
  try {
    ReactGA.event({
      category: 'Conversion',
      action: 'whatsapp_click',
      label: 'whatsapp_contact',
    });
  } catch (error) {
    logger.warn('GA4 Event Error:', 'whatsapp', error);
  }

  openWhatsAppUntracked(phone, message);
};

// D20 + P19 (aprovadas em 02/11/2026): textos prontos do WhatsApp sobre uma reserva, para o cartão "Fale
// com a equipe" do cliente e o "Alertar produção" do Roteiro, e para reaproveitar nos botões do lote 13.
// Data e hora no horário de Brasília (o do evento), qualquer que seja o fuso do aparelho de quem clica.
const brasiliaDate = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
});
const brasiliaTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

const validDate = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Link do WhatsApp com o texto já escrito (o número vai só com os dígitos, já com o DDI).
export const buildWhatsAppUrl = (phone: string, text: string): string =>
  `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(text)}`;

// Cliente → equipe, na página da reserva: nome, código inteiro e data do evento.
export const buildBookingContactText = (p: {
  clientName?: string | null;
  bookingId: string;
  eventDate?: string | Date | null;
}): string => {
  const name = p.clientName?.trim();
  const date = validDate(p.eventDate);
  return (
    (name ? `Olá! Sou ${name} e quero falar sobre a reserva ` : 'Olá! Quero falar sobre a reserva ') +
    formatBookingCode(p.bookingId) +
    (date ? `, do evento de ${brasiliaDate.format(date)}.` : '.')
  );
};

// "10/11/2026" no horário de Brasília; '' para data vazia ou inválida.
export const formatBrasiliaDate = (value?: string | Date | null): string => {
  const date = validDate(value);
  return date ? brasiliaDate.format(date) : '';
};

// P15 (aprovada em 02/11/2026): cliente → equipe, na página da proposta. Título e data do evento, nunca o link nem o
// código dele (a mensagem fica no histórico do WhatsApp do cliente e da empresa).
export const buildProposalReplyText = (p: { eventTitle?: string | null; eventDate?: string | Date | null }): string => {
  // Reserva sem título grava "Evento": vale como sem título (utils/eventTitle).
  const title = clientEventTitle(p.eventTitle);
  const date = formatBrasiliaDate(p.eventDate);
  return (
    'Olá! Vi a proposta ' +
    (title ? `do evento "${title}"` : 'do meu evento') +
    (date ? `, de ${date},` : '') +
    ' e quero falar com a equipe.'
  );
};

// Colaborador → plantão da produção ("Alertar produção" no Roteiro): quem, qual evento, quando e onde.
export const buildUrgentAlertText = (p: {
  collaboratorName?: string | null;
  eventTitle?: string | null;
  bookingId: string;
  eventDate?: string | Date | null;
  address?: string | null;
}): string => {
  const date = validDate(p.eventDate);
  return [
    '*Alerta urgente da equipe:* preciso de suporte da produção agora.',
    p.collaboratorName?.trim() && `*Colaborador:* ${p.collaboratorName.trim()}`,
    `*Evento:* ${p.eventTitle?.trim() || 'sem título'}`,
    `*Reserva:* ${formatBookingCode(p.bookingId)}`,
    date && `*Data e hora:* ${brasiliaDate.format(date)} às ${brasiliaTime.format(date)}`,
    p.address?.trim() && `*Local:* ${p.address.trim()}`,
  ].filter(Boolean).join('\n');
};

export const buildQuoteMessage = (p: QuoteMessageParams): string => {
  const equipamentos = (p.items || [])
    .map((eq) => {
            const name = (eq as { name?: string })?.name || (eq as { equipment?: { name?: string } })?.equipment?.name;
      return name ? `- ${name}` : '';
    })
    .filter(Boolean)
    .join('\n');

  const locale = p.locale || 'pt-BR';
  const when = p.eventDate.toLocaleString(locale);

  return (
    `\n*Pedido de Orçamento*` +
    (p.bookingId ? `\n*Nº do Pedido:* ${formatBookingCode(p.bookingId)}` : '') +
    `\n\n*Cliente:* ${p.user?.name || '-'}\n*Contato:* ${p.user?.phone || '-'}\n\n` +
    `*Local do Evento:* ${p.venue}\n*Data:* ${when}\n*Duração:* ${p.durationHours}h\n\n` +
    `*Endereço de Entrega:*\n` +
    `${p.address.street || ''}, ${p.address.number || ''} - ${p.address.neighborhood || ''}, ` +
  `${p.address.city || ''} - ${p.address.state || ''}, CEP: ${p.address.zipCode || ''}\n` +
  `*Complemento:* ${p.address.complement || '-'}\n\n` +
    `*Itens Solicitados:*\n${equipamentos}\n\n` +
    `*Observações:* ${p.notes || '-'}\n\n` +
    `*Detalhes Logísticos:*\n` +
    `- Tem escadas? ${p.logistics.requiresStairs ? 'Sim' : 'Não'}\n` +
    `- Local coberto? ${p.logistics.isCovered ? 'Sim' : 'Não'}\n` +
    `- Tem estacionamento? ${p.logistics.hasParking ? 'Sim' : 'Não'}`
  )
    .trim()
    .replace(/\n\s*\n/g, '\n\n');
};