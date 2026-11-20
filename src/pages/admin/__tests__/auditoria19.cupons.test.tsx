import type React from 'react';
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';

// O fuso do processo vai para Tóquio antes dos imports: a lista mostrava a validade pelo fuso do aparelho
// (toLocaleDateString), e o dia tem de ser o de Brasília em qualquer aparelho. Volta ao fuso original no fim do arquivo.
const { ORIGINAL_TZ } = vi.hoisted(() => {
  const original = process.env.TZ;
  process.env.TZ = 'Asia/Tokyo';
  return { ORIGINAL_TZ: original };
});

const { api } = vi.hoisted(() => ({ api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../services/api', () => ({ api }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { CouponManagementPage } from '../CouponManagementPage';

afterAll(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

const cupom = (id: string, code: string, validUntil: string | null) => ({
  id, code, description: null, discountType: 'PERCENTAGE', discountValue: 10, minOrderValue: null, maxDiscountAmount: null,
  maxUses: null, maxUsesPerClient: null, validFrom: null, validUntil, active: true, usedCount: 0,
  createdAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-01T12:00:00.000Z',
});
const cartao = (code: string) => (screen.getByRole('heading', { name: code }).closest('.flex-col') as HTMLElement).textContent ?? '';

// Auditoria completa (19/11/2026): "Expira em" sai de couponDayBR, o mesmo dia do formulário e do servidor.
describe('Cupons no painel — "Expira em" no dia de Brasília (auditoria de 19/11/2026)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('fim do dia gravado pelo servidor e cupom antigo (meia-noite UTC): os dois expiram em 25/12/2026', async () => {
    api.get.mockResolvedValue({
      data: [
        cupom('c1', 'NATAL', '2026-12-26T02:59:59.999Z'),
        cupom('c2', 'ANTIGO', '2026-12-25T00:00:00.000Z'),
        cupom('c3', 'SEMPRE', null),
      ],
    });

    render(<CouponManagementPage />);

    await screen.findByRole('heading', { name: 'NATAL' });
    expect(api.get).toHaveBeenCalledWith('/coupons');
    expect(cartao('NATAL')).toContain('Expira em25/12/2026');
    expect(cartao('ANTIGO')).toContain('Expira em25/12/2026');
    expect(cartao('SEMPRE')).not.toContain('Expira em');
  });
});
