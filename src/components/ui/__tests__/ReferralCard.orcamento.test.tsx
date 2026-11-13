import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { getReferral } = vi.hoisted(() => ({ getReferral: vi.fn() }));
vi.mock('../../../services/api', () => ({ authAPI: { getReferral } }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));

import { ReferralCard } from '../ReferralCard';

// Auditoria do orçamento (12/11/2026), O9, D4 e E7: o cartão prometia "10% de desconto na primeira locação" e o link
// levava a /orcamento, que sem carrinho manda ao briefing (sem campo de cupom). O servidor limita a R$ 150, não
// desconta frete nem pedágio e vale uma vez por cliente; a recompensa de quem indica vence em 90 dias.
describe('ReferralCard — a regra real da indicação (O9)', () => {
  let open: MockInstance<typeof window.open>;

  beforeEach(() => {
    vi.clearAllMocks();
    getReferral.mockResolvedValue({ data: { code: 'MARIAX7K2', discountPercent: 10, timesUsed: 0, rewardsEarned: 0 } });
    open = vi.spyOn(window, 'open').mockReturnValue(null);
  });

  afterEach(() => open.mockRestore());

  it('o cartão diz o teto, que não vale para frete nem pedágio, uma vez por cliente e a validade da recompensa', async () => {
    render(<ReferralCard />);
    const texto = (await screen.findByText(/Seu amigo ganha/)).textContent?.replace(/\s+/g, ' ');

    expect(texto).toContain('10% de desconto nos itens (até R$ 150; não vale para frete nem pedágio; uma vez por cliente)');
    expect(texto).toContain('válido por 90 dias');
    expect(texto).not.toContain('primeira locação');
  });

  it('a mensagem compartilhada leva aos kits, onde o código pode ser usado no pedido, com a mesma regra', async () => {
    render(<ReferralCard />);
    fireEvent.click(await screen.findByRole('button', { name: 'Compartilhar' }));

    const mensagem = new URL(String(open.mock.calls[0][0])).searchParams.get('text') ?? '';
    expect(mensagem).toContain('*MARIAX7K2*');
    expect(mensagem).toContain('10% de desconto nos itens (até R$ 150; não vale para frete nem pedágio; uma vez por cliente)');
    expect(mensagem).toContain(`Escolha os itens e use o código no pedido: ${window.location.origin}/kits`);
    expect(mensagem).not.toContain('/orcamento');
    expect(mensagem).not.toContain('primeira locação');
  });
});
