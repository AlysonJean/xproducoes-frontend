import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../../services/api', () => ({ apiFetch: vi.fn() }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null, isLoading: false }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));

import { QuoteSuccessPage } from '../QuoteSuccessPage';

// Auditoria do orçamento (12/11/2026), O22, D10 e B9: a tela dizia só que "a reserva só fica confirmada depois dessa
// resposta". O pedido não é reserva: a equipe confere a disponibilidade e manda a proposta pelo link (com o frete e o
// pedágio); a data só fica confirmada depois do aceite e do sinal. Sem prometer o que só a política (escondida) traz.
describe('QuoteSuccessPage — o pedido recebido não é reserva (O22)', () => {
  it('diz o fluxo real: proposta pelo link, com frete e pedágio; data confirmada com aceite e sinal', () => {
    render(
      <MemoryRouter initialEntries={['/orcamento-sucesso/XP-ANA-1']}>
        <Routes>
          <Route path="/orcamento-sucesso/:bookingId" element={<QuoteSuccessPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const texto = screen.getByText(/Recebemos seu pedido/).textContent?.replace(/\s+/g, ' ');
    expect(texto).toContain('Ele ainda não é uma reserva');
    expect(texto).toContain('manda a proposta num link, por e-mail ou WhatsApp, com os itens, o frete e o pedágio, quando houver');
    expect(texto).toContain('A data só fica confirmada depois que você aceitar a proposta e pagar a parcela inicial.');
    expect(texto).not.toMatch(/50%|48 h|cancelamento/);
  });
});
