import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { apiFetch, useAuth } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn() }));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('../AuthContext', () => ({ useAuth }));

import { FavoritesProvider, useFavorites } from '../FavoritesContext';

const STORAGE_KEY = 'xproducoes-favorites';
const CLIENTE = { isAuthenticated: true, user: { id: 'u1', role: 'CLIENT' } };
const VISITANTE = { isAuthenticated: false, user: null };

const Tela = () => {
  const { favorites, toggleFavorite } = useFavorites();
  return (
    <div>
      <p data-testid="lista">{favorites.map((f) => `${f.type}:${f.id}`).join(',')}</p>
      <button onClick={() => toggleFavorite('eq1')}>alternar</button>
    </div>
  );
};
const renderTela = () =>
  render(
    <FavoritesProvider>
      <Tela />
    </FavoritesProvider>,
  );
const lista = () => screen.getByTestId('lista').textContent;
const chamadas = (metodo: string) => apiFetch.mock.calls.filter((c) => c[1]?.method === metodo);

describe('FavoritesProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // O que o apiFetch devolve de GET /user/favorites: o `data` do envelope, ou seja, a própria lista.
    apiFetch.mockResolvedValue({ equipments: [{ id: 'eq9' }], kits: [{ id: 'kit9' }], services: [{ id: 'sv9' }] });
  });

  // Achado (auditoria ponta a ponta): lia resp.data, que não existe depois do apiFetch, e a lista
  // do cliente logado ficava sempre vazia, mesmo com os favoritos salvos no servidor.
  it('cliente logado vê os favoritos salvos no servidor', async () => {
    useAuth.mockReturnValue(CLIENTE);
    renderTela();

    await waitFor(() => expect(lista()).toBe('equipment:eq9,kit:kit9,service:sv9'));
    expect(apiFetch).toHaveBeenCalledWith('/user/favorites');
  });

  it('cliente logado grava no servidor ao marcar e ao desmarcar', async () => {
    useAuth.mockReturnValue(CLIENTE);
    renderTela();
    await waitFor(() => expect(lista()).toContain('eq9'));

    fireEvent.click(screen.getByText('alternar'));
    expect(chamadas('POST')[0][1].body).toBe(JSON.stringify({ itemId: 'eq1', itemType: 'equipment' }));

    fireEvent.click(screen.getByText('alternar'));
    expect(chamadas('DELETE')[0][0]).toBe('/user/favorites/eq1?itemType=equipment');
  });

  it('ao entrar como cliente, leva os favoritos de visitante para a conta', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: 'eq1', type: 'equipment' }]));
    useAuth.mockReturnValue(VISITANTE);
    const tela = renderTela();

    useAuth.mockReturnValue(CLIENTE);
    tela.rerender(
      <FavoritesProvider>
        <Tela />
      </FavoritesProvider>,
    );

    await waitFor(() => expect(chamadas('POST')).toHaveLength(1));
    expect(chamadas('POST')[0][1].body).toBe(JSON.stringify({ itemId: 'eq1', itemType: 'equipment' }));
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toBeNull());
  });

  // Decisão D14 do guia: o servidor recusa favorito da equipe e não cria perfil de cliente para ela.
  it.each(['ADMIN', 'COLLABORATOR'])('%s: favoritos só neste navegador, sem chamar o servidor', async (role) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: 'kit1', type: 'kit' }]));
    useAuth.mockReturnValue({ isAuthenticated: true, user: { id: 'a1', role } });
    renderTela();

    expect(lista()).toBe('kit:kit1');
    fireEvent.click(screen.getByText('alternar'));

    expect(lista()).toBe('kit:kit1,equipment:eq1');
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toContain('eq1'));
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('visitante: favoritos no navegador, sem chamar o servidor', async () => {
    useAuth.mockReturnValue(VISITANTE);
    renderTela();

    fireEvent.click(screen.getByText('alternar'));

    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toContain('eq1'));
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
