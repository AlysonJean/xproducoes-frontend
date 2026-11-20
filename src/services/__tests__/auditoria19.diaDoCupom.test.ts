import { describe, it, expect, vi, afterAll } from 'vitest';

// O fuso do processo vai para Tóquio antes de importar o serviço (vi.hoisted roda antes dos imports): o dia do cupom
// tem de sair pelo fuso de Brasília qualquer que seja o fuso do aparelho. Volta ao fuso original no fim do arquivo.
const { ORIGINAL_TZ } = vi.hoisted(() => {
  const original = process.env.TZ;
  process.env.TZ = 'Asia/Tokyo';
  return { ORIGINAL_TZ: original };
});

vi.mock('../api', () => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

import { couponDay, couponDayBR } from '../couponService';

afterAll(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

// Auditoria completa (19/11/2026): o servidor grava o início e o fim do dia de Brasília (o fim é 02:59:59.999Z do dia
// seguinte). O formulário pegava os 10 primeiros caracteres do ISO (um dia a mais no fim da validade) e a lista usava o
// fuso do aparelho. Os cupons gravados antes têm a meia-noite UTC exata e valem o dia escrito (regra do servidor).
describe('couponDay / couponDayBR — o dia da validade do cupom', () => {
  it('fim do dia de Brasília (02:59:59.999Z do dia seguinte): o dia de Brasília, não o do ISO', () => {
    expect(couponDay('2026-12-26T02:59:59.999Z')).toBe('2026-12-25');
    expect(couponDayBR('2026-12-26T02:59:59.999Z')).toBe('25/12/2026');
  });

  it('início do dia de Brasília (03:00Z): o mesmo dia', () => {
    expect(couponDay('2026-11-20T03:00:00.000Z')).toBe('2026-11-20');
    expect(couponDayBR('2026-11-20T03:00:00.000Z')).toBe('20/11/2026');
  });

  it('cupom antigo, com a meia-noite UTC exata: vale o dia escrito (não volta para a véspera em Brasília)', () => {
    expect(couponDay('2026-12-25T00:00:00.000Z')).toBe('2026-12-25');
    expect(couponDayBR('2026-12-25T00:00:00.000Z')).toBe('25/12/2026');
  });

  it('sem data ou com data inválida: vazio', () => {
    expect(couponDay(null)).toBe('');
    expect(couponDay(undefined)).toBe('');
    expect(couponDay('')).toBe('');
    expect(couponDay('não é data')).toBe('');
    expect(couponDayBR(null)).toBe('');
    expect(couponDayBR('não é data')).toBe('');
  });
});
