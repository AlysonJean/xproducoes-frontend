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

// O kit como a API devolve (o Decimal da hora extra chega como texto).
const RETIRADA = { id: 'kit-festa', name: 'Kit Festa', price: '1200.00', minimumRentalDuration: 4, extraHourPrice: '50.00', fulfillment: 'CLIENT_PICKUP' };
const ENTREGA = { ...RETIRADA, id: 'kit-som', name: 'Kit Som', fulfillment: 'DELIVERY_SETUP' };

const renderPage = (kits: object[]) => {
  apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
    if (url === '/bookings' && opts?.method === 'POST') return Promise.resolve({ id: 'XP-NOVA' });
    if (url === '/equipments/pricing-rules') return Promise.resolve({ equipmentPriceUnit: 'hour', kitPrice: 'PER_EVENT' });
    // Frete por km (item frete-km): o botão Frete pede o frete do endereço ao servidor.
    if (url === '/admin/freight/quote' && opts?.method === 'POST') {
      return Promise.resolve({ status: 'OK', items: [{ description: 'Frete (12 km por trecho; até 15 km incluso no kit)', quantity: 1, unitPrice: 0, discount: 0, totalPrice: 0, itemType: 'CUSTOM' }] });
    }
    if (url === '/kits') return Promise.resolve(kits);
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

const adicionarKit = async (nome: string) => {
  fireEvent.click(await screen.findByRole('button', { name: 'Kits' }));
  fireEvent.click(await screen.findByRole('button', { name: `Adicionar ${nome}` }));
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
  fireEvent.click(screen.getByRole('button', { name: /salvar proposta/i }));
  await waitFor(() => expect(apiFetch.mock.calls.some((c) => c[0] === '/bookings' && c[1]?.method === 'POST')).toBe(true));
  const call = apiFetch.mock.calls.find((c) => c[0] === '/bookings' && c[1]?.method === 'POST')!;
  return JSON.parse(call[1].body as string) as { items: Array<Record<string, unknown>>; [k: string]: unknown };
};

const precoDaLinha = () => (screen.getAllByLabelText('Preço unit.')[0] as HTMLInputElement).value;

// Lote 13, campos do kit (aprovados pelo dono em 06/11/2026). A linha do kit da Proposta Rápida era o preço do
// evento com "(N h incluídas)" fixo na descrição; a hora extra só entrava à mão. Agora a linha usa a mesma
// conta do servidor (kitPriceLine): quando as datas mudam, as horas extras são recalculadas, como a linha do
// equipamento. O tipo do kit aparece na linha, e com um kit de retirada o Frete avisa. Auditoria do orçamento
// (12/11/2026), E4: com só o kit de retirada (sem equipamento avulso), o Frete não calcula; o kit de entrega manda a
// regra do kit (mode KIT_DELIVERY).
describe('Proposta Rápida — linha do kit com horas extras e o tipo do kit', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  });

  it('as horas extras acompanham as datas do evento, e a linha vai com a descrição e o preço da conta do servidor', async () => {
    renderPage([RETIRADA]);
    await adicionarKit('Kit Festa');
    preencher('2027-01-10T18:00', '2027-01-10T23:00');

    expect(precoDaLinha()).toBe('1250');
    expect(screen.getByText('Na proposta: Kit Festa (4 h incluídas + 1 hora extra de R$ 50,00; retirada e montagem pelo cliente)')).toBeInTheDocument();

    // O evento passa a terminar 0h30: 6,5 h viram 7 h cheias, 3 horas extras.
    fireEvent.change(screen.getByLabelText('Término Previsto *'), { target: { value: '2027-01-11T00:30' } });
    expect(precoDaLinha()).toBe('1350');

    const corpo = await corpoDoPost();
    expect(corpo.items).toEqual([
      expect.objectContaining({
        description: 'Kit Festa (4 h incluídas + 3 horas extras de R$ 50,00; retirada e montagem pelo cliente)',
        quantity: 1, unitPrice: 1350, totalPrice: 1350, itemType: 'KIT', kitId: 'kit-festa',
      }),
    ]);
    expect(corpo).toMatchObject({ kitId: 'kit-festa' });
  });

  it('o tipo do kit aparece na linha; com só o kit de retirada, o Frete avisa e não calcula (E4)', async () => {
    renderPage([RETIRADA]);
    await adicionarKit('Kit Festa');

    expect(screen.getByText('Retirada e montagem pelo cliente')).toBeInTheDocument();
    const aviso = screen.getByRole('note');
    expect(aviso).toHaveTextContent('O kit "Kit Festa" é de retirada: o cliente busca e devolve na X Produções. O frete só entra se a proposta tiver equipamento avulso para entregar.');
    const frete = screen.getByRole('button', { name: 'Frete' });
    expect(frete).toHaveAttribute('aria-describedby', aviso.id);

    preencher('2027-01-10T18:00', '2027-01-10T23:00');
    fireEvent.click(frete);
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', title: 'Sem frete' }));
    expect(apiFetch.mock.calls.some((c) => c[0] === '/admin/freight/quote')).toBe(false);
  });

  it('kit de entrega: o tipo na linha, nenhum aviso no Frete, e o Frete manda a regra do kit', async () => {
    renderPage([ENTREGA]);
    await adicionarKit('Kit Som');

    expect(screen.getByText('Entrega e montagem pela equipe')).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Frete' })).not.toHaveAttribute('aria-describedby');

    preencher('2027-01-10T18:00', '2027-01-10T23:00');
    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));
    expect(await screen.findByDisplayValue('Frete (12 km por trecho; até 15 km incluso no kit)')).toBeInTheDocument();
    const chamada = apiFetch.mock.calls.find((c) => c[0] === '/admin/freight/quote')!;
    expect(JSON.parse(chamada[1].body as string)).toMatchObject({ mode: 'KIT_DELIVERY' });
  });

  it('preço digitado à mão vence: as datas não mudam o preço e a descrição fica sem hora extra', async () => {
    renderPage([ENTREGA]);
    await adicionarKit('Kit Som');
    fireEvent.change(screen.getByLabelText('Preço unit.'), { target: { value: '1100' } });
    preencher('2027-01-10T18:00', '2027-01-11T00:30');

    expect(precoDaLinha()).toBe('1100');
    const corpo = await corpoDoPost();
    expect(corpo.items).toEqual([expect.objectContaining({ description: 'Kit Som (4 h incluídas)', unitPrice: 1100, totalPrice: 1100 })]);
  });
});
