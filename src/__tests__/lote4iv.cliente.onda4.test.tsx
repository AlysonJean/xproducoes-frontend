import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Onda 4 da auditoria de 19/11, lote 4-IV, área do cliente: "esqueci a senha" sem afirmar o envio (F8-14), hora e
// endereço na reserva (F8-17), reservas recentes e avaliação (F8-15, F8-16), favoritos sem rebuscar tudo (F8-19),
// "Cancelar" do perfil (F8-11) e o caminho para quem não tem senha (F8-12).
const { apiFetch, api, addNotification, bookingAPI, authAPI, kitAPI, favoritesState } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  api: { post: vi.fn(), get: vi.fn() },
  addNotification: vi.fn(),
  bookingAPI: { getMyBookings: vi.fn(), getUpcoming: vi.fn() },
  authAPI: { getStats: vi.fn(), getFavorites: vi.fn() },
  kitAPI: { getRecommended: vi.fn() },
  favoritesState: { favorites: [] as Array<{ id: string; type: string }> },
}));
vi.mock('../services/api', () => ({ apiFetch, api, bookingAPI, authAPI, kitAPI }));
vi.mock('@/services/api', () => ({ apiFetch, api, bookingAPI, authAPI, kitAPI }));
vi.mock('../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Ana Souza', email: 'ana@cliente.test', role: 'CLIENT' }, setAuthenticatedUser: vi.fn() }),
}));
vi.mock('../contexts/FavoritesContext', () => ({ useFavorites: () => favoritesState }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));
vi.mock('../hooks/useRecommendations', () => {
  const vazio = { recommendations: [], loading: false };
  return { useRecommendations: () => vazio, useMultipleRecommendations: () => ({ personalized: vazio, trending: vazio, newItems: vazio }) };
});
vi.mock('../components/ui/RecommendationSection', () => ({ RecommendationSection: () => null }));
vi.mock('../components/ui/ReferralCard', () => ({ ReferralCard: () => null }));
vi.mock('../components/modals/ReviewModal', () => ({
  ReviewModal: ({ onSuccess }: { onSuccess: () => void }) => <button type="button" onClick={onSuccess}>Enviar avaliação (teste)</button>,
}));
vi.mock('../components/ui/EquipmentCard', () => ({ EquipmentCard: ({ equipment }: { equipment: { name: string } }) => <p>{equipment.name}</p> }));
vi.mock('../components/ui/KitCard', () => ({ KitCard: ({ kit }: { kit: { name: string } }) => <p>{kit.name}</p> }));
vi.mock('../components/ui/ServiceCard', () => ({ ServiceCard: ({ service }: { service: { name: string } }) => <p>{service.name}</p> }));

import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import { BookingDetailsPage } from '../pages/client/BookingDetailsPage';
import { ClientDashboardPage } from '../pages/client/ClientDashboardPage';
import { FavoritesPage } from '../pages/client/FavoritesPage';
import { ProfilePage } from '../pages/client/ProfilePage';
import { SecurityTab } from '../pages/client/profile/SecurityTab';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('F8-14: esqueci a senha', () => {
  it('não afirma que o e-mail foi enviado (o servidor responde igual com ou sem conta)', async () => {
    api.post.mockResolvedValue({ data: { success: true } });
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'quem@t.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar instruções' }));
    const texto = 'Se houver uma conta com este e-mail, enviamos o link. Confira também o spam e se o e-mail está certo.';
    expect(await screen.findByText(texto)).toBeInTheDocument();
    expect(addNotification).toHaveBeenCalledWith({ type: 'success', title: 'Pedido recebido', message: texto });
    expect(screen.queryByText(/E-mail enviado com sucesso/)).not.toBeInTheDocument();
  });
});

describe('F8-17: reserva do cliente', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('início e término com hora de Brasília, e o endereço de entrega', async () => {
    vi.stubEnv('TZ', 'UTC');
    apiFetch.mockResolvedValue({
      id: 'XP-ANA-1', status: 'CONFIRMED', eventDate: '2026-12-11T01:30:00.000Z', eventEndDate: '2026-12-11T05:00:00.000Z',
      totalPrice: '1200', attachments: [], eventCollaborators: [], clientName: 'Ana Souza', location: 'Salão Azul',
      street: 'Rua A', addressNumber: '10', neighborhood: 'Savassi', city: 'Belo Horizonte', state: 'MG', zipCode: '30140-000',
    });
    render(
      <MemoryRouter initialEntries={['/cliente/reservas/XP-ANA-1']}>
        <Routes><Route path="/cliente/reservas/:id" element={<BookingDetailsPage />} /></Routes>
      </MemoryRouter>,
    );
    const inicio = (await screen.findByText('Início do Evento')).nextElementSibling;
    expect(inicio?.textContent).toMatch(/10\/12\/2026,?\s*22:30/);
    expect(screen.getByText('Término').nextElementSibling?.textContent).toMatch(/11\/12\/2026,?\s*02:00/);
    expect(screen.getByText('Endereço de entrega').nextElementSibling).toHaveTextContent('Rua A, 10, Savassi, Belo Horizonte - MG, CEP 30140-000');
  });

  it('sem endereço: "Não informado"', async () => {
    apiFetch.mockResolvedValue({ id: 'XP-ANA-2', status: 'PENDING', eventDate: '2026-12-11T01:30:00.000Z', totalPrice: '0', attachments: [], eventCollaborators: [] });
    render(
      <MemoryRouter initialEntries={['/cliente/reservas/XP-ANA-2']}>
        <Routes><Route path="/cliente/reservas/:id" element={<BookingDetailsPage />} /></Routes>
      </MemoryRouter>,
    );
    expect((await screen.findByText('Endereço de entrega')).nextElementSibling).toHaveTextContent('Não informado');
  });
});

describe('F8-15 e F8-16: painel do cliente', () => {
  const reserva = (id: string, createdAt: string, extra: object = {}) => ({
    id, createdAt, eventTitle: id, status: 'CONFIRMED', totalPrice: '100', eventDate: '2027-01-10T21:00:00.000Z', equipments: [], ...extra,
  });

  beforeEach(() => {
    authAPI.getStats.mockResolvedValue({ data: { totalBookings: 4, activeBookings: 1, completedBookings: 1, totalSpent: 0, averageBookingValue: 0 } });
    authAPI.getFavorites.mockResolvedValue({ data: [] });
    kitAPI.getRecommended.mockResolvedValue({ data: [] });
    bookingAPI.getUpcoming.mockResolvedValue({ data: [] });
  });

  it('"Reservas Recentes" mostra as 3 mais recentes (a lista chega da mais antiga para a mais nova)', async () => {
    bookingAPI.getMyBookings.mockResolvedValue({ data: [
      reserva('XP-ANTIGA', '2026-01-01T12:00:00.000Z'),
      reserva('XP-MEIO', '2026-06-01T12:00:00.000Z'),
      reserva('XP-NOVA', '2026-11-20T12:00:00.000Z'),
      reserva('XP-ONTEM', '2026-11-23T12:00:00.000Z'),
    ] });
    render(<MemoryRouter><ClientDashboardPage /></MemoryRouter>);
    const recentes = (await screen.findByRole('heading', { name: 'Reservas Recentes' })).parentElement!.parentElement as HTMLElement;
    await waitFor(() => expect(within(recentes).getAllByText(/^XP-/).length).toBeGreaterThan(0));
    expect(within(recentes).getAllByText(/^XP-(ANTIGA|MEIO|NOVA|ONTEM)$/).map((el) => el.textContent)).toEqual(['XP-ONTEM', 'XP-NOVA', 'XP-MEIO']);
  });

  it('depois de avaliar, o botão some e aparece o agradecimento', async () => {
    bookingAPI.getMyBookings.mockResolvedValue({ data: [reserva('XP-FEITA', '2026-11-01T12:00:00.000Z', { status: 'COMPLETED' })] });
    render(<MemoryRouter><ClientDashboardPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Deixar Avaliação' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar avaliação (teste)' }));
    expect(screen.queryByRole('button', { name: 'Deixar Avaliação' })).not.toBeInTheDocument();
    expect(addNotification).toHaveBeenCalledWith({ type: 'success', title: 'Obrigado!', message: 'Sua avaliação foi registrada.' });
  });
});

describe('F8-19: favoritos', () => {
  it('desfavoritar tira o item sem buscar os outros de novo; o novo favorito é o único buscado', async () => {
    apiFetch.mockImplementation(async (url: string) => {
      const [, tipo, id] = url.split('/');
      return { id, name: `${tipo}:${id}` };
    });
    favoritesState.favorites = [{ id: 'e1', type: 'equipment' }, { id: 'k1', type: 'kit' }, { id: 's1', type: 'service' }];
    const { rerender } = render(<MemoryRouter><FavoritesPage /></MemoryRouter>);
    expect(await screen.findByText('equipments:e1')).toBeInTheDocument();
    expect(screen.getByText('kits:k1')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(3);

    favoritesState.favorites = [{ id: 'e1', type: 'equipment' }, { id: 's1', type: 'service' }];
    await act(async () => { rerender(<MemoryRouter><FavoritesPage /></MemoryRouter>); });
    await waitFor(() => expect(screen.queryByText('kits:k1')).not.toBeInTheDocument());
    expect(screen.getByText('equipments:e1')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(3);

    favoritesState.favorites = [{ id: 'e1', type: 'equipment' }, { id: 's1', type: 'service' }, { id: 'e2', type: 'equipment' }];
    await act(async () => { rerender(<MemoryRouter><FavoritesPage /></MemoryRouter>); });
    expect(await screen.findByText('equipments:e2')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(4);
    expect(apiFetch).toHaveBeenLastCalledWith('/equipments/e2');
    expect(screen.queryByText(/Carregando/)).not.toBeInTheDocument();

    // O desfavoritado sai da memória: favoritado de novo, é buscado de novo (pode ter mudado).
    favoritesState.favorites = [{ id: 'e1', type: 'equipment' }, { id: 's1', type: 'service' }, { id: 'e2', type: 'equipment' }, { id: 'k1', type: 'kit' }];
    await act(async () => { rerender(<MemoryRouter><FavoritesPage /></MemoryRouter>); });
    expect(await screen.findByText('kits:k1')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(5);
    expect(apiFetch).toHaveBeenLastCalledWith('/kits/k1');
  });
});

describe('F8-11: "Cancelar" do perfil', () => {
  it('desfaz o que foi digitado', async () => {
    apiFetch.mockResolvedValue({ id: 'u1', name: 'Ana Souza', email: 'ana@cliente.test', phone: '31999990000', jobTitle: 'Gerente', companyName: 'Acme', verified: true, createdAt: '2024-03-01T12:00:00.000Z', totalBookings: 0, totalSpent: 0 });
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Editar Perfil/ }));
    fireEvent.change(screen.getByLabelText('Cargo'), { target: { value: 'Diretora' } });
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/ }));
    fireEvent.click(screen.getByRole('button', { name: /Editar Perfil/ }));
    expect(screen.getByLabelText('Cargo')).toHaveValue('Gerente');
  });
});

describe('F8-12: quem não tem senha', () => {
  it('a aba de segurança leva a "Defina pelo e-mail"', () => {
    render(
      <MemoryRouter>
        <SecurityTab passwordForm={{ currentPassword: '', newPassword: '', confirmPassword: '' }} setPasswordForm={vi.fn()} saving={false} handleChangePassword={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Não tem senha ou esqueceu a atual\?/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Defina pelo e-mail' })).toHaveAttribute('href', '/recuperar-senha');
  });
});

