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

// Lote 13, diária nas telas (decisão do dono de 06/11). A estimativa do orçamento contava as diárias sem o
// mínimo de diárias do equipamento (30 h com mínimo de 3 davam 2 diárias; o servidor cobra 3). Agora cada
// equipamento conta as unidades pela mesma conta do servidor (equipmentUnits), com o mínimo do cadastro.
// Auditoria do orçamento (12/11/2026), O6: o /orcamento pede o início e o término do evento (antes, o "Tempo de Operação"
// em horas); as horas da estimativa saem deles. O término antes do início é o dia seguinte; o evento de mais de um
// dia usa a data do término (30 h: das 18h do dia 10 à meia-noite do dia 12).
const TREZE_HORAS: [string, string] = ['10:00', '23:00'];
const CINCO_HORAS: [string, string] = ['18:00', '23:00'];
const KIT = { id: 'kit-1', name: 'Kit Festa', price: 1200 };

const estimativa = async (unidade: 'hour' | 'day', [inicio, termino]: [string, string], equipments: unknown[], dataDoTermino?: string) => {
  useCart.mockReturnValue({ cart: { kit: KIT, equipments, services: [] }, isLoading: false, clearCart: vi.fn() });
  apiFetch.mockResolvedValue({ equipmentPriceUnit: unidade, kitPrice: 'PER_EVENT' });
  render(
    <MemoryRouter initialEntries={['/orcamento']}>
      <Routes><Route path="/orcamento" element={<QuoteRequestPage />} /></Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/equipments/pricing-rules'));
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

describe('QuoteRequestPage — estimativa com a diária e o mínimo de diárias, como o servidor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: null, setAuthenticatedUser: vi.fn(), isLoading: false });
    post.mockResolvedValue({ data: { valid: false, reason: 'Cupom inválido.' } });
  });

  it('por hora: o mínimo do cadastro não entra (13 h = 13 h), como hoje', async () => {
    expect(await estimativa('hour', TREZE_HORAS, [{ id: 'eq1', name: 'Caixa', pricePerHour: 10, minimumRentalDuration: 3 }])).toBe(1200 + 10 * 13);
  });

  it('por diária: evento de 5 h com mínimo de 3 diárias no cadastro = 3 diárias (antes 1)', async () => {
    expect(await estimativa('day', CINCO_HORAS, [{ id: 'eq1', name: 'Caixa', pricePerHour: 10, minimumRentalDuration: 3 }])).toBe(1200 + 10 * 3);
  });

  it('por diária: cada equipamento com o seu mínimo (1 diária pelo evento; o de mínimo 3, 3 diárias)', async () => {
    const itens = [
      { id: 'eq1', name: 'Caixa', pricePerHour: 10, minimumRentalDuration: 1 },
      { id: 'eq2', name: 'Mesa', pricePerHour: 20, minimumRentalDuration: 3 },
    ];
    expect(await estimativa('day', CINCO_HORAS, itens)).toBe(1200 + 10 * 1 + 20 * 3);
  });

  it('por diária, carrinho no formato antigo da API ({ equipmentId, equipment }): o mínimo vem do equipamento', async () => {
    const itens = [{ equipmentId: 'eq2', equipment: { id: 'eq2', name: 'Mesa', pricePerHour: 20, minimumRentalDuration: 3 } }];
    expect(await estimativa('day', CINCO_HORAS, itens)).toBe(1200 + 20 * 3);
  });

  it('por diária, equipamento sem o mínimo no carrinho (guardado antes deste lote): conta só as diárias', async () => {
    expect(await estimativa('day', TREZE_HORAS, [{ id: 'eq1', name: 'Caixa', pricePerHour: 10 }])).toBe(1200 + 10 * 1);
  });

  it('mais de um dia, por diária: 30 h com mínimo de 3 diárias no cadastro = 3 diárias', async () => {
    expect(await estimativa('day', ['18:00', '00:00'], [{ id: 'eq1', name: 'Caixa', pricePerHour: 10, minimumRentalDuration: 3 }], '2030-01-12')).toBe(1200 + 10 * 3);
  });

  it('mais de um dia, por diária: cada equipamento com o seu mínimo (2 diárias por 30 h; o de mínimo 3, 3 diárias)', async () => {
    const itens = [
      { id: 'eq1', name: 'Caixa', pricePerHour: 10, minimumRentalDuration: 1 },
      { id: 'eq2', name: 'Mesa', pricePerHour: 20, minimumRentalDuration: 3 },
    ];
    expect(await estimativa('day', ['18:00', '00:00'], itens, '2030-01-12')).toBe(1200 + 10 * 2 + 20 * 3);
  });

  it('mais de um dia, por hora: 30 h = 30 h do equipamento', async () => {
    expect(await estimativa('hour', ['18:00', '00:00'], [{ id: 'eq1', name: 'Caixa', pricePerHour: 10 }], '2030-01-12')).toBe(1200 + 10 * 30);
  });

  it('o "Subtotal estimado" na tela é o mesmo valor', async () => {
    await estimativa('day', CINCO_HORAS, [{ id: 'eq1', name: 'Caixa', pricePerHour: 10, minimumRentalDuration: 3 }]);
    const linha = screen.getByText('Subtotal estimado').parentElement as HTMLElement;
    expect(linha.textContent).toMatch(/1\.230,00/);
  });
});
