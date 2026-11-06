import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildBookingContactText, buildUrgentAlertText, buildWhatsAppUrl } from '../whatsapp';

// D20 + P19 (aprovadas em 02/11/2026): textos prontos do WhatsApp sobre uma reserva, usados no cartão
// "Fale com a equipe" do cliente e no "Alertar produção" do Roteiro (e reaproveitáveis no lote 13). Data e
// hora no horário de Brasília qualquer que seja o fuso do aparelho: aqui o processo roda em UTC, e 01:30
// UTC do dia 11 é 22:30 do dia 10 em Brasília.
describe('textos do WhatsApp da reserva', () => {
  beforeEach(() => {
    vi.stubEnv('TZ', 'UTC');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('cliente: nome, código inteiro e data do evento em Brasília', () => {
    expect(buildBookingContactText({ clientName: ' Ana Souza ', bookingId: 'XP-ANA-20261210-2230-K4Q', eventDate: '2026-12-11T01:30:00.000Z' }))
      .toBe('Olá! Sou Ana Souza e quero falar sobre a reserva XP-ANA-20261210-2230-K4Q, do evento de 10/12/2026.');
  });

  it('cliente sem nome e sem data: o texto continua certo', () => {
    expect(buildBookingContactText({ clientName: null, bookingId: 'XP-ANA-1', eventDate: null }))
      .toBe('Olá! Quero falar sobre a reserva XP-ANA-1.');
  });

  it('alerta da equipe: quem, qual evento, código, data e hora de Brasília e local', () => {
    expect(buildUrgentAlertText({
      collaboratorName: 'Bruno Técnico',
      eventTitle: 'Casamento Silva',
      bookingId: 'XP-ANA-20261210-2230-K4Q',
      eventDate: '2026-12-11T01:30:00.000Z',
      address: 'Rua A, 10 – Belo Horizonte/MG',
    })).toBe([
      '*Alerta urgente da equipe:* preciso de suporte da produção agora.',
      '*Colaborador:* Bruno Técnico',
      '*Evento:* Casamento Silva',
      '*Reserva:* XP-ANA-20261210-2230-K4Q',
      '*Data e hora:* 10/12/2026 às 22:30',
      '*Local:* Rua A, 10 – Belo Horizonte/MG',
    ].join('\n'));
  });

  it('alerta sem nome, título, data ou local: só o que existe', () => {
    expect(buildUrgentAlertText({ bookingId: 'XP-ANA-1' })).toBe([
      '*Alerta urgente da equipe:* preciso de suporte da produção agora.',
      '*Evento:* sem título',
      '*Reserva:* XP-ANA-1',
    ].join('\n'));
  });

  it('link do wa.me: número só com dígitos e o texto codificado', () => {
    expect(buildWhatsAppUrl('+55 (31) 98925-2272', 'Olá & até já'))
      .toBe('https://wa.me/5531989252272?text=Ol%C3%A1%20%26%20at%C3%A9%20j%C3%A1');
  });
});
