import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { api, addNotification, onSuccess } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  addNotification: vi.fn(),
  onSuccess: vi.fn(),
}));
// O couponService de verdade (o couponDay e as chamadas), sobre o api simulado.
vi.mock('../../../services/api', () => ({ api }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));

import { CouponForm } from '../CouponForm';
import type { Coupon } from '../../../services/couponService';

// Auditoria completa (19/11/2026), formulário de cupom:
// - "Teto de desconto" e "Pedido mínimo" em branco viravam 0 (o coerce transformava '' em 0) e iam ao servidor como
//   teto R$ 0, o que zerava o desconto. Agora o branco é "sem valor": undefined na criação e null na edição;
// - na edição, apagar a validade ou os limites mandava undefined, e o servidor mantinha o valor gravado;
// - o dia mostrado vinha dos 10 primeiros caracteres do ISO: o fim da validade aparecia um dia depois.
const CUPOM: Coupon = {
  id: 'cp1',
  code: 'NATAL',
  description: 'Campanha de Natal',
  discountType: 'FIXED',
  discountValue: 100,
  minOrderValue: 800,
  maxDiscountAmount: null,
  maxUses: 50,
  maxUsesPerClient: 1,
  validFrom: '2026-11-20T03:00:00.000Z',
  validUntil: '2026-12-26T02:59:59.999Z',
  active: true,
  usedCount: 3,
  createdAt: '2026-11-19T12:00:00.000Z',
  updatedAt: '2026-11-19T12:00:00.000Z',
};

const valor = (rotulo: string) => (screen.getByLabelText(rotulo) as HTMLInputElement).value;
const preencher = (rotulo: string, value: string) => fireEvent.change(screen.getByLabelText(rotulo), { target: { value } });
// O corpo do POST /coupons ou do PUT /coupons/:id (o segundo argumento do api.post/api.put).
const enviado = (mock: typeof api.post) => mock.mock.calls[0][1] as Record<string, unknown>;

describe('CouponForm — campos em branco e o dia da validade (auditoria de 19/11/2026)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    api.post.mockResolvedValue({ data: { id: 'novo' } });
    api.put.mockResolvedValue({ data: CUPOM });
  });

  it('criação com "Teto de desconto" e "Pedido mínimo" em branco: vão sem valor (undefined), não como R$ 0', async () => {
    render(<CouponForm onSuccess={onSuccess} onCancel={vi.fn()} />);

    preencher('Código *', 'BEMVINDO10');
    expect(valor('Teto de desconto (R$, opcional)')).toBe('');
    expect(valor('Pedido mínimo (R$)')).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Criar Cupom' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post.mock.calls[0][0]).toBe('/coupons');
    const payload = enviado(api.post);
    expect(payload).toMatchObject({ code: 'BEMVINDO10', discountType: 'PERCENTAGE', discountValue: 10, active: true });
    expect(payload.maxDiscountAmount).toBeUndefined();
    expect(payload.minOrderValue).toBeUndefined();
    expect(payload.maxUses).toBeUndefined();
    expect(payload.maxUsesPerClient).toBeUndefined();
    expect(payload.validFrom).toBeUndefined();
    expect(payload.validUntil).toBeUndefined();
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('criação com valores preenchidos: seguem como números', async () => {
    render(<CouponForm onSuccess={onSuccess} onCancel={vi.fn()} />);

    preencher('Código *', 'TETO50');
    preencher('Teto de desconto (R$, opcional)', '50');
    preencher('Pedido mínimo (R$)', '300');
    fireEvent.click(screen.getByRole('button', { name: 'Criar Cupom' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(enviado(api.post)).toMatchObject({ code: 'TETO50', maxDiscountAmount: 50, minOrderValue: 300 });
  });

  it('valor 0 no teto ou no pedido mínimo: o erro em português, e nada vai ao servidor', async () => {
    render(<CouponForm onSuccess={onSuccess} onCancel={vi.fn()} />);

    preencher('Código *', 'ZERO');
    preencher('Teto de desconto (R$, opcional)', '0');
    preencher('Pedido mínimo (R$)', '0');
    fireEvent.click(screen.getByRole('button', { name: 'Criar Cupom' }));

    expect(await screen.findByText('Use um valor maior que zero, ou deixe em branco para não ter teto.')).toBeInTheDocument();
    expect(screen.getByText('Use um valor maior que zero, ou deixe em branco para não ter pedido mínimo.')).toBeInTheDocument();
    expect(screen.queryByText(/Too small|expected number/i)).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('edição: o dia da validade é o de Brasília (o fim do dia não aparece como o dia seguinte)', () => {
    render(<CouponForm initialData={CUPOM} onSuccess={onSuccess} onCancel={vi.fn()} />);

    expect(valor('Válido a partir de')).toBe('2026-11-20');
    expect(valor('Válido até')).toBe('2026-12-25');
    expect(valor('Pedido mínimo (R$)')).toBe('800');
    expect(valor('Teto de desconto (R$, opcional)')).toBe('');
  });

  it('edição de cupom antigo (meia-noite UTC exata): o dia escrito', () => {
    render(<CouponForm initialData={{ ...CUPOM, validFrom: '2026-11-20T00:00:00.000Z', validUntil: '2026-12-25T00:00:00.000Z' }} onSuccess={onSuccess} onCancel={vi.fn()} />);

    expect(valor('Válido a partir de')).toBe('2026-11-20');
    expect(valor('Válido até')).toBe('2026-12-25');
  });

  it('edição: o que foi apagado vai como null (o servidor apaga o valor gravado); o resto segue igual', async () => {
    render(<CouponForm initialData={CUPOM} onSuccess={onSuccess} onCancel={vi.fn()} />);

    preencher('Pedido mínimo (R$)', '');
    preencher('Limite total de usos', '');
    preencher('Válido até', '');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
    expect(api.put.mock.calls[0][0]).toBe('/coupons/cp1');
    const payload = enviado(api.put);
    expect(payload).toMatchObject({
      code: 'NATAL',
      discountType: 'FIXED',
      discountValue: 100,
      maxUsesPerClient: 1,
      validFrom: '2026-11-20',
    });
    expect(payload.minOrderValue).toBeNull();
    expect(payload.maxDiscountAmount).toBeNull();
    expect(payload.maxUses).toBeNull();
    expect(payload.validUntil).toBeNull();
  });
});
