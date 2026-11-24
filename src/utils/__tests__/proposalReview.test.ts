import { describe, it, expect } from 'vitest';
import { briefingAnswerOf, distributeTargetTotal, parseMoneyInput, proposalAlerts, type TargetLine } from '../proposalReview';

// Pedido de Alyson de 24/11/2026: "Fechar no valor" (o código distribui o desconto, com a soma exata) e a conferência
// antes de enviar a proposta. Só conta e regra fixa, sem IA.
const linha = (id: string, unitPrice: number, quantity = 1, extra: Partial<TargetLine> = {}): TargetLine =>
  ({ id, unitPrice, quantity, totalPrice: Math.round(unitPrice * quantity * 100) / 100, ...extra });
const totalCom = (lines: TargetLine[], discounts: Record<string, number>) =>
  Math.round(lines.reduce((sum, l) => sum + (discounts[l.id] !== undefined ? l.unitPrice * l.quantity - discounts[l.id] : l.totalPrice), 0) * 100);

describe('distributeTargetTotal', () => {
  it('a soma fica exatamente no valor pedido, com o desconto proporcional ao preço de tabela', () => {
    const lines = [linha('kit', 1190), linha('dj', 300), linha('fumaca', 80, 2)];
    const r = distributeTargetTotal(lines, 100000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(totalCom(lines, r.discounts)).toBe(100000);
    // 1.650 de tabela para 1.000: 650 de desconto, uns 39,4% em cada linha
    expect(r.discounts.kit).toBeCloseTo(468.79, 1);
    expect(r.discounts.dj).toBeCloseTo(118.18, 1);
    for (const l of lines) expect(r.discounts[l.id]).toBeLessThanOrEqual(l.unitPrice * l.quantity);
  });

  it('valores que não dividem redondo: os centavos fecham no total', () => {
    const lines = [linha('a', 333.33), linha('b', 333.33), linha('c', 333.34)];
    for (const target of [100, 99_999, 12_345, 50_001]) {
      const r = distributeTargetTotal(lines, target);
      expect(r.ok && totalCom(lines, r.discounts)).toBe(target);
    }
  });

  it('frete e pedágio ficam como estão; linha sem preço não recebe desconto', () => {
    const lines = [linha('kit', 1000), linha('frete', 150, 1, { freight: true }), linha('combinar', 0)];
    const r = distributeTargetTotal(lines, 90000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.discounts).toEqual({ kit: 250 });
    expect(totalCom(lines, r.discounts)).toBe(90000);
  });

  it('recusa: abaixo do frete, acima da tabela, sem itens com preço, zero', () => {
    const lines = [linha('kit', 1000), linha('frete', 150, 1, { freight: true })];
    expect(distributeTargetTotal(lines, 10000)).toEqual({ ok: false, reason: expect.stringContaining('menor que o frete') });
    expect(distributeTargetTotal(lines, 120000)).toEqual({ ok: false, reason: expect.stringContaining('passa do preço de tabela') });
    expect(distributeTargetTotal([linha('frete', 150, 1, { freight: true })], 10000)).toEqual({ ok: false, reason: expect.stringContaining('não tem itens com preço') });
    expect(distributeTargetTotal(lines, 0).ok).toBe(false);
  });

  it('o valor de tabela exato: desconto zero', () => {
    const r = distributeTargetTotal([linha('kit', 1000)], 100000);
    expect(r).toEqual({ ok: true, discounts: { kit: 0 } });
  });
});

describe('parseMoneyInput', () => {
  it('aceita os jeitos de escrever reais', () => {
    expect(parseMoneyInput('1.000')).toBe(100000);
    expect(parseMoneyInput('1.000,50')).toBe(100050);
    expect(parseMoneyInput('R$ 2.500,00')).toBe(250000);
    expect(parseMoneyInput('999')).toBe(99900);
    expect(parseMoneyInput('1500.5')).toBe(150050);
    expect(parseMoneyInput('100reias')).toBeNull();
    expect(parseMoneyInput('')).toBeNull();
  });
});

describe('proposalAlerts', () => {
  const BRIEFING = [
    '— Briefing preenchido pelo cliente —',
    'Horário: A confirmar',
    'A banda tem rider técnico: Sim',
    'Durante o evento: Não sei',
    'Tensão da tomada: Não sei',
    'O local tem horário limite para som: Não sei',
    'Tem proteção em caso de chuva: Não',
    '',
    '— Ciência marcada em 24/11/2026 —',
  ].join('\n');
  const base = { clientName: 'Ana', lines: [linha('kit', 1000)], subtotal: 1000 };

  it('o que o cliente não soube responder', () => {
    expect(briefingAnswerOf(BRIEFING, 'Tensão da tomada')).toBe('Não sei');
    expect(proposalAlerts({ ...base, briefing: BRIEFING })).toEqual([
      'O cliente não sabia o horário: confirme o início e o término.',
      'Tensão da tomada (110V ou 220V) a confirmar com o cliente.',
      'A banda tem rider técnico: peça o rider antes do evento.',
      'Horário limite de som do local a confirmar.',
      'Confirme se o cliente quer técnico durante o evento ou montar e buscar depois.',
      'Evento ao ar livre sem proteção de chuva confirmada.',
    ]);
  });

  it('nada a conferir num pedido completo', () => {
    expect(proposalAlerts(base)).toEqual([]);
  });

  it('sem nome, desconto de mais da metade, total que parece faltar um zero, total mudado depois de fechar', () => {
    const lines = [{ ...linha('kit', 1000), totalPrice: 40 }];
    // O formatador de moeda põe espaço fixo depois do "R$".
    const alerts = proposalAlerts({ clientName: ' ', lines, subtotal: 40, closedTargetCents: 10000 }).map((a) => a.replace(/\u00a0/g, ' '));
    expect(alerts).toEqual([
      'Sem o nome do cliente.',
      'Desconto de 96% sobre o preço de tabela: confira se o valor está certo.',
      'Total de R$ 40,00: confira se não faltou um zero.',
      'O total mudou depois de fechar em R$ 100,00 (agora R$ 40,00): feche de novo ou confira.',
    ]);
  });

  it('outra reserva no mesmo dia; no mesmo horário quando as horas se cruzam', () => {
    const alerts = proposalAlerts({
      ...base,
      eventStart: '2026-12-12T22:00:00.000Z', eventEnd: '2026-12-13T03:00:00.000Z',
      sameDay: [
        { id: 'XP-DANIEL-1', eventDate: '2026-12-12T23:00:00.000Z', eventEndDate: '2026-12-13T02:00:00.000Z', status: 'CONFIRMED', clientName: 'Daniel' },
        { id: 'XP-MANHA-2', eventDate: '2026-12-12T12:00:00.000Z', eventEndDate: '2026-12-12T15:00:00.000Z', status: 'PENDING', client: { user: { name: 'Bia' } } },
      ],
    });
    expect(alerts).toEqual([
      'Outra reserva no mesmo horário: XP-DANIEL-1, Daniel, 20:00–23:00 (confirmada). Confira equipe e equipamentos.',
      'Outra reserva no mesmo dia: XP-MANHA-2, Bia, 09:00–12:00 (pendente). Confira equipe e equipamentos.',
    ]);

    // Evento de manhã e a outra reserva à noite: mesmo dia, horário diferente.
    const manha = proposalAlerts({
      ...base,
      eventStart: '2026-12-12T12:00:00.000Z', eventEnd: '2026-12-12T15:00:00.000Z',
      sameDay: [{ id: 'XP-NOITE-3', eventDate: '2026-12-12T22:00:00.000Z', eventEndDate: '2026-12-12T23:00:00.000Z', status: 'CONFIRMED', clientName: 'Caio' }],
    });
    expect(manha).toEqual(['Outra reserva no mesmo dia: XP-NOITE-3, Caio, 19:00–20:00 (confirmada). Confira equipe e equipamentos.']);
  });
});
