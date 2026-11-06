import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { apiFetch, useAuth, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('jspdf', () => ({ jsPDF: vi.fn() }));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));

import AdminQuickProposalPage from '../AdminQuickProposalPage';

const MESA = { id: 'eq-mesa', name: 'Mesa de Som', pricePerHour: 50, minimumRentalDuration: 1 };
const KIT = { id: 'kit-festa', name: 'Kit Festa', price: 1200, minimumRentalDuration: 5 };

const renderPage = (unidade: 'hour' | 'day' = 'hour') => {
  apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
    if (url === '/bookings' && opts?.method === 'POST') return Promise.resolve({ id: 'XP-NOVA' });
    if (url === '/equipments/pricing-rules') return Promise.resolve({ equipmentPriceUnit: unidade, kitPrice: 'PER_EVENT' });
    if (url === '/equipments') return Promise.resolve([unidade === 'day' ? { ...MESA, pricePerHour: 180 } : MESA]);
    if (url === '/kits') return Promise.resolve([KIT]);
    return Promise.resolve([]);
  });
  render(
    <MemoryRouter initialEntries={['/admin/orcamentos/novo']}>
      <Routes>
        <Route path="/admin/orcamentos/novo" element={<AdminQuickProposalPage />} />
        <Route path="/admin/reservas/:id" element={<p>Página da reserva</p>} />
      </Routes>
    </MemoryRouter>,
  );
};

const preencher = (inicio: string, termino: string) => {
  const campos: Array<[string, string]> = [
    ['Nome Completo *', 'Ana Souza'], ['WhatsApp / Celular *', '31988887777'], ['Local / Salão *', 'Espaço VIP'],
    ['Início Previsto *', inicio], ['Término Previsto *', termino], ['CEP *', '30110-000'], ['Rua *', 'Av. Brasil'],
    ['Número *', '123'], ['Bairro *', 'Centro'], ['Cidade *', 'Belo Horizonte'], ['UF *', 'MG'],
  ];
  for (const [label, value] of campos) fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

const corpoDoPost = async () => {
  fireEvent.click(screen.getByRole('button', { name: /gerar link da proposta/i }));
  await waitFor(() => expect(apiFetch.mock.calls.some((c) => c[0] === '/bookings' && c[1]?.method === 'POST')).toBe(true));
  const call = apiFetch.mock.calls.find((c) => c[0] === '/bookings' && c[1]?.method === 'POST')!;
  return JSON.parse(call[1].body as string) as { items: Array<Record<string, unknown>>; [k: string]: unknown };
};

// D8a e P16 (aprovadas em 02/11/2026) e decisões do dono de 06/11. A Proposta Rápida mandava só o total da
// tela e os ids do catálogo; os itens personalizados (técnico, montagem, frete) iam como texto em `notes`, e
// o equipamento entrava com R$ 0 (dailyPrice, que não existe no cadastro). Agora os itens vão como itens da
// reserva, com o preço usado, e o servidor soma o total. Kit pelo preço do evento; equipamento por hora ou
// por diária, conforme o servidor.
describe('AdminQuickProposalPage — itens com o preço usado (D8a/P16)', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  });

  it('equipamento por hora × horas do evento, kit pelo preço do evento e técnico, frete de BH e hora extra como itens', async () => {
    renderPage('hour');
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar Mesa de Som' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kits' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar Kit Festa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Técnico' }));
    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hora extra' }));
    const precos = screen.getAllByLabelText('Preço unit.');
    fireEvent.change(precos[2], { target: { value: '300' } });
    fireEvent.change(precos[4], { target: { value: '150' } });
    preencher('2027-01-10T18:00', '2027-01-10T23:00');

    const corpo = await corpoDoPost();

    expect(corpo.items.map((i) => [i.description, i.unitPrice, i.totalPrice, i.itemType])).toEqual([
      ['Mesa de Som (5 h)', 250, 250, 'EQUIPMENT'],
      ['Kit Festa (5 h incluídas)', 1200, 1200, 'KIT'],
      ['Técnico', 300, 300, 'CUSTOM'],
      ['Frete (dentro de BH)', 0, 0, 'CUSTOM'],
      ['Hora extra', 150, 150, 'CUSTOM'],
    ]);
    expect(corpo.items[0]).toMatchObject({ equipmentId: MESA.id });
    expect(corpo.items[1]).toMatchObject({ kitId: KIT.id });
    expect(corpo).toMatchObject({ equipmentIds: [MESA.id], kitId: KIT.id });
    // O total é a conta do servidor (a mesma função das outras telas); nada vira texto em notes.
    expect(corpo).not.toHaveProperty('totalPrice');
    expect(corpo).not.toHaveProperty('notes');
  });

  it('preço digitado à mão vence as horas do evento', async () => {
    renderPage('hour');
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar Mesa de Som' }));
    fireEvent.change(screen.getByLabelText('Preço unit.'), { target: { value: '400' } });
    preencher('2027-01-10T18:00', '2027-01-10T23:00');

    const corpo = await corpoDoPost();

    expect(corpo.items).toEqual([expect.objectContaining({ description: 'Mesa de Som', unitPrice: 400, totalPrice: 400 })]);
  });

  it('servidor com equipamento por diária: 29 horas são 2 diárias', async () => {
    renderPage('day');
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar Mesa de Som' }));
    preencher('2027-01-10T18:00', '2027-01-11T23:00');

    await waitFor(() => expect(screen.getByText(/× 2 diárias/)).toBeInTheDocument());
    const corpo = await corpoDoPost();

    expect(corpo.items).toEqual([expect.objectContaining({ description: 'Mesa de Som (2 diárias)', unitPrice: 360, totalPrice: 360 })]);
  });
});
