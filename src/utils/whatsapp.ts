
// Utilitários para integração com WhatsApp
// - Centraliza normalização de telefone, construção de mensagens e abertura do WhatsApp

import ReactGA from 'react-ga4';
import { createAndClickAnchor } from './dom';
import type { QuoteMessageParams } from '@/types/forms';
import { logger } from './logger';

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
  if (!digits) return '5531989252272';

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

  const cleaned = normalizePhone(phone);
  const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
  // Tenta abrir em nova aba sem sair do site
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) {
    // Fallback para casos de bloqueio de popup: cria um link e clica programaticamente
      try {
        createAndClickAnchor({ href: url, target: '_blank', rel: 'noopener noreferrer' });
            } catch {
        logger.warn('Não foi possível abrir o WhatsApp automaticamente.', 'whatsapp');
      }
  }
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
    (p.bookingId ? `\n*Nº do Pedido:* ${p.bookingId.substring(0, 8)}` : '') +
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