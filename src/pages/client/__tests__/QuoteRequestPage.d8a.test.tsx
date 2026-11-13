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

const CARRINHO = {
  kit: { id: 'kit-1', name: 'Kit Festa', price: 1200 },
  equipments: [{ id: 'eq1', name: 'Caixa de som', pricePerHour: 10 }],
  services: [],
};

const subtotalDoCupom = async (unidade: 'hour' | 'day', inicio: string, termino: string, dataDoTermino?: string) => {
  apiFetch.mockResolvedValue({ equipmentPriceUnit: unidade, kitPrice: 'PER_EVENT' });
  render(
    <MemoryRouter initialEntries={['/orcamento']}>
      <Routes><Route path="/orcamento" element={<QuoteRequestPage />} /></Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/equipments/pricing-rules'));
  // A unidade chega do servidor depois da primeira pintura.
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  fireEvent.change(screen.getByLabelText('Início do evento *'), { target: { value: inicio } });
  fireEvent.change(screen.getByLabelText('Término do evento *'), { target: { value: termino } });
  if (dataDoTermino) {
    fireEvent.change(screen.getByLabelText('Data do Evento *'), { target: { value: '2030-01-10' } });
    fireEvent.change(screen.getByLabelText('Data do término (opcional)'), { target: { value: dataDoTermino } });
  }
  fireEvent.change(screen.getByLabelText('Código do cupom'), { target: { value: 'BEMVINDO10' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
  await waitFor(() => expect(post).toHaveBeenCalledWith('/coupons/validate', expect.anything()));
  return post.mock.calls.find((c) => c[0] === '/coupons/validate')![1].subtotal as number;
};

// Decisões do dono de 06/11 (P16): o kit tem preço por evento e o equipamento avulso custa por hora ou por
// diária, conforme o servidor. A estimativa usada para validar o cupom multiplicava o kit pelas horas
// (Kit de R$ 1.200 em 5 horas virava R$ 6.000).
// Auditoria do orçamento (12/11/2026), O6: o /orcamento pede o início e o término do evento (antes, o "Tempo de Operação"
// em horas); as horas da estimativa saem deles. O término antes do início é o dia seguinte; o evento de mais de um
// dia usa a data do término.
describe('QuoteRequestPage — estimativa do cupom com a regra do servidor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: null, setAuthenticatedUser: vi.fn(), isLoading: false });
    useCart.mockReturnValue({ cart: CARRINHO, isLoading: false, clearCart: vi.fn() });
    post.mockResolvedValue({ data: { valid: false, reason: 'Cupom inválido.' } });
  });

  it('por hora (padrão): kit pelo preço do evento + equipamento × horas', async () => {
    expect(await subtotalDoCupom('hour', '18:00', '23:00')).toBe(1200 + 10 * 5);
  });

  it('meia hora a mais conta a hora cheia, como o servidor (4,5 h = 5 h do equipamento)', async () => {
    expect(await subtotalDoCupom('hour', '18:30', '23:00')).toBe(1200 + 10 * 5);
  });

  it('por diária: o evento de 5 h é 1 diária do equipamento; o kit continua pelo preço do evento', async () => {
    expect(await subtotalDoCupom('day', '18:00', '23:00')).toBe(1200 + 10 * 1);
  });

  it('por diária: 30 horas (com a data do término) são 2 diárias do equipamento; o kit continua pelo preço do evento', async () => {
    expect(await subtotalDoCupom('day', '18:00', '00:00', '2030-01-12')).toBe(1200 + 10 * 2);
  });

  it('por hora: a festa que vira a meia-noite (20h às 2h) conta 6 h', async () => {
    expect(await subtotalDoCupom('hour', '20:00', '02:00')).toBe(1200 + 10 * 6);
  });
});
