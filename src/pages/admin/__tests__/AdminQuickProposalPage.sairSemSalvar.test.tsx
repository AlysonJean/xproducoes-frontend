import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';

const { apiFetch, useAuth, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));

import AdminQuickProposalPage from '../AdminQuickProposalPage';

// Teste de ponta a ponta (21/11/2026): sair do "Montar orçamento" sem salvar (Cancelar, um link do menu, recarregar)
// perdia as linhas montadas sem aviso nenhum. Com linhas na proposta, a página pergunta antes.
const CODIGO = 'XP-BIA-20261120-2000-7Q1';
const PEDIDO = {
  id: CODIGO, status: 'PENDING', eventTitle: 'Aniversário ou 15 anos', location: 'A definir',
  eventDate: '2027-04-18T23:00:00.000Z', eventEndDate: '2027-04-19T06:00:00.000Z',
  street: '', addressNumber: '', neighborhood: '', city: 'Betim', state: 'MG', zipCode: '',
  clientId: null, client: null, clientName: 'Bia Souza', clientContact: '31955554444', clientEmail: 'bia@cliente.test',
  specialRequests: '— Briefing preenchido pelo cliente —\nEvento: Aniversário ou 15 anos\nPrecisa de: DJ\n\n— Ciência —',
  items: [], contractSummary: null,
};
const SERVICOS = [{ id: 'svc-dj', name: 'DJ Profissional (Open Format)', price: '300.00', duration: 240, status: 'ACTIVE' }];
const SUGESTAO = { kit: null, services: [{ id: 'svc-dj', name: 'DJ Profissional (Open Format)', quantity: 1, reason: 'Pediu DJ.' }], equipment: [], observations: [] };
const URL_PAGINA = `/admin/orcamentos/novo?reserva=${encodeURIComponent(CODIGO)}`;

const renderPage = () => {
  apiFetch.mockImplementation((path: string, opts?: { method?: string }) => {
    if (path === `/bookings/${encodeURIComponent(CODIGO)}` && !opts?.method) return Promise.resolve(PEDIDO);
    if (path === `/admin/bookings/${encodeURIComponent(CODIGO)}/suggest-items`) return Promise.resolve(SUGESTAO);
    if (path === '/services') return Promise.resolve(SERVICOS);
    return Promise.resolve([]);
  });
  render(
    <MemoryRouter initialEntries={['/admin/reservas/anterior', URL_PAGINA]} initialIndex={1}>
      <Routes>
        <Route path="/admin/orcamentos/novo" element={<><AdminQuickProposalPage /><Link to="/admin/clientes">Link do menu</Link></>} />
        <Route path="/admin/reservas/anterior" element={<p>Página anterior</p>} />
        <Route path="/admin/clientes" element={<p>Página dos clientes</p>} />
      </Routes>
    </MemoryRouter>,
  );
};

const comUmaLinha = async () => {
  fireEvent.click(await screen.findByRole('button', { name: /Sugerir itens \(IA\)/ }));
  await waitFor(() => expect(screen.getByRole('note', { name: 'Sugestão da IA' })).toBeInTheDocument());
};
const aviso = () => screen.queryByRole('dialog', { name: 'Sair sem salvar?' });
const beforeUnloadBlocked = () => {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

describe('Proposta Rápida — sair sem salvar', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  });

  it('sem linhas: Cancelar e os links saem direto, e recarregar não avisa', async () => {
    renderPage();
    await screen.findByRole('button', { name: /Sugerir itens \(IA\)/ });
    expect(beforeUnloadBlocked()).toBe(false);

    fireEvent.click(screen.getByRole('link', { name: 'Link do menu' }));
    expect(await screen.findByText('Página dos clientes')).toBeInTheDocument();
    expect(aviso()).toBeNull();
  });

  it('com linha: Cancelar pergunta; "Continuar editando" fica com a linha; "Sair sem salvar" volta', async () => {
    renderPage();
    await comUmaLinha();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    const janela = within(aviso()!);
    expect(janela.getByText('A linha da proposta ainda não foi salva. Se sair agora, ela se perde.')).toBeInTheDocument();
    fireEvent.click(janela.getByRole('button', { name: 'Continuar editando' }));
    await waitFor(() => expect(aviso()).toBeNull());
    expect(screen.queryByText('Página anterior')).toBeNull();
    expect(screen.getByRole('note', { name: 'Sugestão da IA' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(within(aviso()!).getByRole('button', { name: 'Sair sem salvar' }));
    expect(await screen.findByText('Página anterior')).toBeInTheDocument();
  });

  it('com linha: um link do site não abre antes de confirmar; recarregar ou fechar a aba pede confirmação', async () => {
    renderPage();
    await comUmaLinha();
    // O aviso liga num efeito, logo depois de a linha aparecer (com a suíte inteira rodando, pode vir um instante depois).
    await waitFor(() => expect(beforeUnloadBlocked()).toBe(true));

    fireEvent.click(screen.getByRole('link', { name: 'Link do menu' }));
    expect(aviso()).not.toBeNull();
    expect(screen.queryByText('Página dos clientes')).toBeNull();

    fireEvent.click(within(aviso()!).getByRole('button', { name: 'Sair sem salvar' }));
    expect(await screen.findByText('Página dos clientes')).toBeInTheDocument();
    // Fora da página, o aviso do navegador some junto.
    await waitFor(() => expect(beforeUnloadBlocked()).toBe(false));
  });
});
