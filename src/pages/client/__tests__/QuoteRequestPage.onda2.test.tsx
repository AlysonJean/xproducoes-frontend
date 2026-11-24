import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Onda 2 da auditoria de 19/11 (F8-05): a chave de idempotência era nova a cada clique. Se a resposta do pedido se perdia
// (timeout com o Neon acordando) ou o carrinho não esvaziava depois do pedido criado, a tela dizia "Falha no envio" e o
// novo envio criava outra reserva e outro e-mail.
const { post, apiFetch, useCart, useAuth, addNotification, refreshCart } = vi.hoisted(() => ({
  post: vi.fn(), apiFetch: vi.fn(), useCart: vi.fn(), useAuth: vi.fn(), addNotification: vi.fn(), refreshCart: vi.fn(),
}));
vi.mock('../../../services/api', () => ({ api: { post }, apiFetch }));
vi.mock('@/services/api', () => ({ api: { post }, apiFetch }));
vi.mock('../../../hooks/useCart', () => ({ useCart }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../components/ui/BrandLoader', () => ({ BrandLoader: () => null }));
vi.mock('../../../components/ui/TrustStrip', () => ({ TrustStrip: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import { QuoteRequestPage } from '../QuoteRequestPage';

// Onda 2 da auditoria de 19/11 (F8-07): o pedido só sai com a caixa de ciência marcada (como no /briefing).
const marcarCiencia = () => {
  const caixa = screen.getByRole('checkbox', { name: /Estou ciente/ }) as HTMLInputElement;
  if (!caixa.checked) fireEvent.click(caixa);
};

const KIT = { id: 'kit-1', name: 'Kit Festa', price: 1200, minimumRentalDuration: 4, extraHourPrice: 50, fulfillment: 'DELIVERY_SETUP', status: 'ACTIVE', items: [] };
const USUARIO = { id: 'u-ana', name: 'Ana Souza', phone: '31988887777', email: 'ana@cliente.test' };

const abrir = async (clearCart = vi.fn().mockResolvedValue(undefined)) => {
  useAuth.mockReturnValue({ user: USUARIO, setAuthenticatedUser: vi.fn(), isLoading: false });
  useCart.mockReturnValue({ cart: { kit: KIT, equipments: [], services: [] }, isLoading: false, clearCart, refreshCart });
  render(
    <MemoryRouter initialEntries={['/orcamento']}>
      <Routes>
        <Route path="/orcamento" element={<QuoteRequestPage />} />
        <Route path="/orcamento-sucesso/:id" element={<p>Pedido enviado</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/services'));
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
};

const preencher = () => {
  const campos: Record<string, string> = {
    'Nome/Local do Evento *': 'Espaço VIP', 'Data do Evento *': '2030-01-10', 'Início do evento *': '19:00', 'Término do evento *': '23:00',
    'CEP *': '30110-000', 'Rua *': 'Av. Brasil', 'Número *': '123', 'Bairro *': 'Centro', 'Cidade *': 'Belo Horizonte', 'Estado *': 'MG',
  };
  for (const [label, value] of Object.entries(campos)) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  for (const grupo of ['Local com escadas? *', 'Local coberto? *', 'Tem estacionamento? *']) {
    fireEvent.click(within(screen.getByRole('group', { name: grupo })).getByLabelText(grupo === 'Local com escadas? *' ? 'Não' : 'Sim'));
  }
};
const confirmar = () => {
  marcarCiencia();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar Pedido de Orçamento' }));
};
const chaves = () => post.mock.calls.filter((c) => c[0] === '/bookings').map((c) => (c[2] as { headers: Record<string, string> }).headers['Idempotency-Key']);

describe('QuoteRequestPage — onda 2 (F8-05)', { timeout: 30000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshCart.mockResolvedValue(undefined);
    apiFetch.mockImplementation((url: string) => {
      if (url === '/equipments/pricing-rules') return Promise.resolve({ equipmentPriceUnit: 'hour', kitPrice: 'PER_EVENT' });
      if (url === '/services') return Promise.resolve([]);
      return Promise.resolve(null);
    });
  });

  it('a resposta se perdeu e a pessoa tenta de novo: o novo envio leva a mesma chave (o servidor devolve a reserva já criada)', async () => {
    post.mockRejectedValueOnce(new Error('timeout of 30000ms exceeded')).mockResolvedValue({ data: { id: 'XP-NOVA' } });
    await abrir();
    preencher();

    confirmar();
    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ title: 'Falha no envio' })));
    confirmar();

    expect(await screen.findByText('Pedido enviado')).toBeInTheDocument();
    const [primeira, segunda] = chaves();
    expect(primeira).toBeTruthy();
    expect(segunda).toBe(primeira);
  });

  it('mudar o pedido entre um envio e outro gera chave nova', async () => {
    post.mockRejectedValueOnce(new Error('timeout')).mockResolvedValue({ data: { id: 'XP-NOVA' } });
    await abrir();
    preencher();
    confirmar();
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByLabelText('Número *'), { target: { value: '456' } });
    confirmar();
    await screen.findByText('Pedido enviado');
    const [primeira, segunda] = chaves();
    expect(segunda).not.toBe(primeira);
  });

  it('F8-07: sem a caixa de ciência marcada, o pedido não sai e a tela pede a ciência', async () => {
    post.mockResolvedValue({ data: { id: 'XP-NOVA' } });
    await abrir();
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Pedido de Orçamento' }));
    expect(await screen.findByText('Marque a caixa de ciência para enviar o pedido.')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade');
  });

  it('F8-07: com a ciência marcada, o texto dela (com a versão) vai no pedido', async () => {
    post.mockResolvedValue({ data: { id: 'XP-NOVA' } });
    await abrir();
    preencher();
    confirmar();
    await screen.findByText('Pedido enviado');
    const corpo = post.mock.calls.find((c) => c[0] === '/bookings')![1] as { specialRequests: string };
    expect(corpo.specialRequests).toMatch(/— Ciência marcada em .+ \(texto 2026-11-13\) —/);
    expect(corpo.specialRequests).toContain('Este pedido ainda não é uma reserva');
  });

  it('o carrinho não esvaziou depois do pedido criado: segue para a tela de sucesso, sem "Falha no envio"', async () => {
    post.mockResolvedValue({ data: { id: 'XP-NOVA' } });
    await abrir(vi.fn().mockRejectedValue(new Error('POST /cart/clear falhou')));
    preencher();
    confirmar();

    expect(await screen.findByText('Pedido enviado')).toBeInTheDocument();
    expect(addNotification).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Falha no envio' }));
    expect(post).toHaveBeenCalledTimes(1);
  });
});
