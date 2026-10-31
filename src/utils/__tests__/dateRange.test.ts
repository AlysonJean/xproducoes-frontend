import { describe, it, expect } from 'vitest';

// Fuso da empresa: os testes simulam o navegador de quem usa o painel no Brasil.
process.env.TZ = 'America/Sao_Paulo';

import { isWithinLocalDateRange } from '../dateRange';

// O filtro de período da tela de Reservas fazia new Date('2026-10-31') — meia-noite UTC, ou seja,
// 21h do dia ANTERIOR no Brasil. "De 01/10 até 31/10" deixava de fora os eventos de 31/10 e
// incluía os de 30/09 depois das 21h: fechamento do mês errado.
describe('isWithinLocalDateRange (período em dias locais)', () => {
  it('evento de 31/10 às 20h entra em "até 31/10" (antes: ficava de fora)', () => {
    expect(isWithinLocalDateRange('2026-10-31T23:00:00.000Z', '2026-10-01', '2026-10-31')).toBe(true);
  });

  it('evento de 30/09 às 22h NÃO entra em "de 01/10" (antes: entrava)', () => {
    expect(isWithinLocalDateRange('2026-10-01T01:00:00.000Z', '2026-10-01', '2026-10-31')).toBe(false);
  });

  it('limites inclusivos: 01/10 00h30 e 31/10 23h59', () => {
    expect(isWithinLocalDateRange('2026-10-01T03:30:00.000Z', '2026-10-01', '2026-10-31')).toBe(true);
    expect(isWithinLocalDateRange('2026-11-01T02:59:00.000Z', '2026-10-01', '2026-10-31')).toBe(true);
  });

  it('sem início ou sem fim, só o lado informado limita', () => {
    expect(isWithinLocalDateRange('2020-01-01T12:00:00.000Z', undefined, '2026-10-31')).toBe(true);
    expect(isWithinLocalDateRange('2030-01-01T12:00:00.000Z', '2026-10-01', undefined)).toBe(true);
    expect(isWithinLocalDateRange('2026-09-30T12:00:00.000Z', '2026-10-01', undefined)).toBe(false);
  });
});
