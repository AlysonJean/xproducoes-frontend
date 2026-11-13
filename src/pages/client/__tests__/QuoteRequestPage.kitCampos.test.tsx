import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { post, apiFetch, useCart, useAuth, addNotification } = vi.hoisted(() => ({
  post: vi.fn(),
  apiFetch: vi.fn(),
  useCart: vi.fn(),
  useAuth: vi.fn(),
  addNotification: vi.fn(),
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

const subtotalDoCupom = async (kit: object, inicio: string, termino: string) => {
  useCart.mockReturnValue({ cart: { kit, equipments: [{ id: 'eq1', name: 'Caixa de som', pricePerHour: 10 }], services: [] }, isLoading: false, clearCart: vi.fn() });
  apiFetch.mockResolvedValue({ equipmentPriceUnit: 'hour', kitPrice: 'PER_EVENT' });
  render(
    <MemoryRouter initialEntries={['/orcamento']}>
      <Routes><Route path="/orcamento" element={<QuoteRequestPage />} /></Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/equipments/pricing-rules'));
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  fireEvent.change(screen.getByLabelText('Início do evento *'), { target: { value: inicio } });
  fireEvent.change(screen.getByLabelText('Término do evento *'), { target: { value: termino } });
  fireEvent.change(screen.getByLabelText('Código do cupom'), { target: { value: 'BEMVINDO10' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
  await waitFor(() => expect(post).toHaveBeenCalledWith('/coupons/validate', expect.anything()));
  return post.mock.calls.find((c) => c[0] === '/coupons/validate')![1].subtotal as number;
};

// Lote 13, campos do kit (aprovados pelo dono em 06/11/2026): o kit com horas incluídas e valor de hora extra
// cobra as horas cheias além das incluídas. A estimativa do orçamento do site (usada para validar o cupom)
// tem de dar o mesmo que o servidor: antes ela contava só o preço do evento.
// Auditoria do orçamento (12/11/2026), O6: o /orcamento pede o início e o término do evento (antes, o "Tempo de Operação"
// em horas); as horas da estimativa saem deles. Um evento cabe num dia (o término antes do início é o dia seguinte),
// como no briefing.
describe('QuoteRequestPage — estimativa do cupom com a hora extra do kit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: null, setAuthenticatedUser: vi.fn(), isLoading: false });
    post.mockResolvedValue({ data: { valid: false, reason: 'Cupom inválido.' } });
  });

  it('4 h incluídas e evento de 6,5 h: 3 horas extras de R$ 50 no kit, além do equipamento por 7 h', async () => {
    const kit = { id: 'kit-1', name: 'Kit Festa', price: 1200, minimumRentalDuration: 4, extraHourPrice: '50.00', fulfillment: 'CLIENT_PICKUP' };
    expect(await subtotalDoCupom(kit, '16:30', '23:00')).toBe(1200 + 3 * 50 + 10 * 7);
  });

  it('evento dentro das horas incluídas: só o preço do evento', async () => {
    const kit = { id: 'kit-1', name: 'Kit Festa', price: 1200, minimumRentalDuration: 4, extraHourPrice: 50 };
    expect(await subtotalDoCupom(kit, '19:00', '23:00')).toBe(1200 + 10 * 4);
  });
});
