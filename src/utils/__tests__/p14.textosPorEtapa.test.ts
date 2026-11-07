import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  bookingCancelledWhatsAppText,
  bookingConfirmedWhatsAppText,
  crewOnTheWayWhatsAppText,
  eventReminderWhatsAppText,
  proposalPdfWhatsAppText,
  requestReceivedWhatsAppText,
  reviewRequestWhatsAppText,
  type StageBooking,
} from '../whatsappTemplates';

// P14 (aprovada em 02/11/2026), parte 2: utils/whatsappTemplates é a fonte única dos textos de WhatsApp de cada etapa
// (recebimento, proposta, confirmação, véspera e avaliação). Data e hora no horário de Brasília qualquer que seja o
// fuso do aparelho (aqui o processo roda em UTC: 01:00 UTC do dia 21 é 22:00 do dia 20 em Brasília), o código da
// reserva inteiro e o total da função de preço única (P16). Antes não havia texto de recebimento, véspera nem
// avaliação, e o de confirmação usava o código, o nome e o total de cada tela.
const RESERVA: StageBooking = {
  id: 'XP-ANA-20271220-2200-AB1',
  clientName: ' Ana Souza ',
  client: { user: { name: 'Conta da Ana' } },
  eventTitle: 'Formatura da Ana',
  eventDate: '2027-12-21T01:00:00.000Z',
  neighborhood: 'Savassi',
  city: 'Belo Horizonte',
  location: 'Salão Azul, Rua das Flores, 123',
  totalPrice: '900.00',
  // O resumo de preço que a ficha recebe da API: o total vem dele, não do totalPrice.
  pricing: { lines: [], itemsSubtotal: 1500, couponDiscount: { amount: 150, code: 'PROMO' }, adjustment: 0, total: 1350 },
};
const SEM_NADA: StageBooking = { id: 'XP-BRUNO-1' };

describe('P14 parte 2 — textos de WhatsApp de cada etapa', () => {
  beforeEach(() => {
    vi.stubEnv('TZ', 'UTC');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('recebimento: primeiro nome, código inteiro e data do evento em Brasília', () => {
    expect(requestReceivedWhatsAppText(RESERVA)).toBe([
      'Olá, Ana! Recebemos seu pedido XP-ANA-20271220-2200-AB1, do evento de 20/12/2027.',
      'Estamos conferindo a disponibilidade e logo mandamos a proposta por aqui.',
      'Qualquer dúvida, é só responder esta mensagem.',
    ].join('\n'));
    expect(requestReceivedWhatsAppText(SEM_NADA).split('\n')[0]).toBe('Olá! Recebemos seu pedido XP-BRUNO-1.');
  });

  it('confirmação: código inteiro, data e hora de Brasília e o total da função de preço', () => {
    expect(bookingConfirmedWhatsAppText(RESERVA)).toBe([
      'Olá, Ana! Sua reserva XP-ANA-20271220-2200-AB1 está confirmada.',
      'Evento "Formatura da Ana" no dia 20/12/2027, às 22:00.',
      'Valor total: R$ 1.350,00.',
      'Qualquer dúvida, é só responder esta mensagem.',
    ].join('\n'));
    // Sem o resumo da API, a mesma conta pelo totalPrice; sem valor, a linha do total não aparece.
    expect(bookingConfirmedWhatsAppText({ ...RESERVA, pricing: null })).toContain('Valor total: R$ 900,00.');
    expect(bookingConfirmedWhatsAppText(SEM_NADA)).toBe('Olá! Sua reserva XP-BRUNO-1 está confirmada.\nQualquer dúvida, é só responder esta mensagem.');
  });

  it('véspera: data e hora de Brasília e o bairro e a cidade, nunca a rua', () => {
    const texto = eventReminderWhatsAppText(RESERVA);
    expect(texto).toBe([
      'Olá, Ana! Passando para lembrar do seu evento "Formatura da Ana", no dia 20/12/2027, às 22:00, em Savassi, Belo Horizonte.',
      'Nossa equipe já está se preparando. Qualquer dúvida, é só responder esta mensagem.',
    ].join('\n'));
    expect(texto).not.toContain('Rua das Flores');
    // Sem bairro nem cidade: o nome do local da reserva.
    expect(eventReminderWhatsAppText({ ...RESERVA, neighborhood: null, city: null, location: 'Salão Azul' })).toContain(', em Salão Azul.');
    expect(eventReminderWhatsAppText(SEM_NADA).split('\n')[0]).toBe('Olá! Passando para lembrar do seu evento.');
  });

  it('avaliação: o link que veio da API, sem nada inventado', () => {
    expect(reviewRequestWhatsAppText(RESERVA, 'https://g.page/r/xproducoes/review')).toBe([
      'Olá, Ana! Obrigado por escolher a X Produções para o seu evento "Formatura da Ana".',
      'Se puder, conte como foi numa avaliação no Google. Leva menos de um minuto e ajuda muito o nosso trabalho:',
      'https://g.page/r/xproducoes/review',
    ].join('\n'));
  });

  it('"PDF + WhatsApp": o PDF, a data e o total, sem os links de /cliente/painel e /cadastro de antes', () => {
    const texto = proposalPdfWhatsAppText(RESERVA);
    expect(texto).toBe([
      'Olá, Ana! Segue em PDF a proposta do seu evento "Formatura da Ana" (20/12/2027).',
      'Valor total: R$ 1.350,00.',
      'Para ajustar algo ou confirmar, é só responder esta mensagem.',
    ].join('\n'));
    expect(texto).not.toMatch(/cadastro|painel|http/);
  });

  it('o nome da conta vale quando a reserva não traz nome; cancelamento e equipe a caminho mantêm o texto de antes, com o código inteiro', () => {
    expect(requestReceivedWhatsAppText({ ...RESERVA, clientName: null })).toMatch(/^Olá, Conta!/);
    expect(bookingCancelledWhatsAppText(RESERVA)).toBe(
      'Olá, Ana Souza. Informamos que sua reserva #XP-ANA-20271220-2200-AB1 foi CANCELADA em nosso sistema. Qualquer dúvida, estamos à disposição.',
    );
    expect(crewOnTheWayWhatsAppText(SEM_NADA)).toBe('Olá, Cliente! Nossa equipe operacional já está A CAMINHO para o evento #XP-BRUNO-1. Até breve!');
  });
});
