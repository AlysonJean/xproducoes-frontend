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

// O catálogo do painel (GET /services do admin traz também os inativos; o Decimal chega como texto).
const TECNICO = { id: 'sv-tec', name: 'Técnico de Som e Operação Profissional', description: 'Som', price: '300.00', duration: 180, coversWholeEvent: true, status: 'ACTIVE' };
const LUZ = { id: 'sv-luz', name: 'Técnico de Iluminação', description: 'Luz', price: '250.00', duration: 180, coversWholeEvent: true, status: 'ACTIVE' };
const DJ = { id: 'sv-dj', name: 'DJ Profissional', description: 'DJ', price: '800.00', duration: 180, coversWholeEvent: false, status: 'ACTIVE' };

const renderPage = (services: object[]) => {
  apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
    if (url === '/bookings' && opts?.method === 'POST') return Promise.resolve({ id: 'XP-NOVA' });
    if (url === '/equipments/pricing-rules') return Promise.resolve({ equipmentPriceUnit: 'hour', kitPrice: 'PER_EVENT' });
    if (url === '/services') return Promise.resolve(services);
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

// Espera o catálogo carregar (a aba Serviços lista os serviços).
const catalogoCarregado = async (nome: string) => {
  fireEvent.click(await screen.findByRole('button', { name: 'Serviços' }));
  await screen.findByRole('button', { name: `Adicionar ${nome}` });
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

const precoDaLinha = (i = 0) => (screen.getAllByLabelText('Preço unit.')[i] as HTMLInputElement).value;

// Lote 13, técnico durante o evento (decisão do dono de 06/11/2026: "também na Proposta Rápida"). O botão Técnico
// punha um item à mão de R$ 0. Com um serviço marcado "Pode acompanhar o evento todo", ele põe esse serviço com o
// preço pelas horas do evento (R$ 300 por 180 min: 6 h = R$ 600), recalculado quando as datas mudam, como as linhas
// do kit e do equipamento; o preço digitado à mão vence. Sem serviço marcado, o item à mão de antes.
describe('Proposta Rápida — botão Técnico com o serviço que acompanha o evento todo', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  });

  it('põe o técnico marcado: R$ 300 sem as datas, R$ 600 em 6 h, R$ 800 quando o término muda para 8 h; o envio leva o serviço', async () => {
    renderPage([DJ, TECNICO]);
    await catalogoCarregado('Técnico de Som e Operação Profissional');
    fireEvent.click(screen.getByRole('button', { name: 'Técnico' }));

    expect(screen.getByDisplayValue('Técnico de Som e Operação Profissional')).toBeInTheDocument();
    expect(precoDaLinha()).toBe('300');
    expect(screen.getByText('Na proposta: Técnico de Som e Operação Profissional (até 3 h de evento)')).toBeInTheDocument();

    preencher('2027-01-10T18:00', '2027-01-11T00:00');
    expect(precoDaLinha()).toBe('600');
    expect(screen.getByText('Na proposta: Técnico de Som e Operação Profissional (6 h de evento: 3 h incluídas + 3 h a mais)')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Término Previsto *'), { target: { value: '2027-01-11T02:00' } });
    expect(precoDaLinha()).toBe('800');

    const corpo = await corpoDoPost();
    expect(corpo.items).toEqual([
      expect.objectContaining({
        description: 'Técnico de Som e Operação Profissional (8 h de evento: 3 h incluídas + 5 h a mais)',
        quantity: 1, unitPrice: 800, totalPrice: 800, itemType: 'SERVICE', serviceId: 'sv-tec',
      }),
    ]);
    expect(corpo).toMatchObject({ serviceIds: ['sv-tec'] });
  });

  it('preço digitado à mão vence as horas, e a descrição fica só com o nome', async () => {
    renderPage([TECNICO]);
    await catalogoCarregado('Técnico de Som e Operação Profissional');
    fireEvent.click(screen.getByRole('button', { name: 'Técnico' }));
    fireEvent.change(screen.getByLabelText('Preço unit.'), { target: { value: '450' } });
    preencher('2027-01-10T18:00', '2027-01-11T00:00');

    expect(precoDaLinha()).toBe('450');
    const corpo = await corpoDoPost();
    expect(corpo.items).toEqual([expect.objectContaining({ description: 'Técnico de Som e Operação Profissional', unitPrice: 450, totalPrice: 450, itemType: 'SERVICE' })]);
  });

  it('o mesmo serviço pelo catálogo (aba Serviços) segue a mesma regra; o DJ continua fixo', async () => {
    renderPage([DJ, TECNICO]);
    await catalogoCarregado('Técnico de Som e Operação Profissional');
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Técnico de Som e Operação Profissional' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar DJ Profissional' }));
    preencher('2027-01-10T18:00', '2027-01-11T00:00');

    expect(precoDaLinha(0)).toBe('600');
    expect(precoDaLinha(1)).toBe('800');
    const corpo = await corpoDoPost();
    expect(corpo.items.map((i) => [i.description, i.totalPrice])).toEqual([
      ['Técnico de Som e Operação Profissional (6 h de evento: 3 h incluídas + 3 h a mais)', 600],
      ['DJ Profissional', 800],
    ]);
  });

  it('dois serviços marcados: um botão por serviço, com o nome', async () => {
    renderPage([TECNICO, LUZ]);
    await catalogoCarregado('Técnico de Iluminação');

    expect(screen.queryByRole('button', { name: 'Técnico' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Técnico de Iluminação' }));
    preencher('2027-01-10T18:00', '2027-01-11T00:00');

    expect(precoDaLinha()).toBe('500');
    expect(screen.getByRole('button', { name: 'Técnico de Som e Operação Profissional' })).toBeInTheDocument();
  });

  it('quantidade 2 (dois técnicos): o dobro da linha pelas horas do evento', async () => {
    renderPage([TECNICO]);
    await catalogoCarregado('Técnico de Som e Operação Profissional');
    fireEvent.click(screen.getByRole('button', { name: 'Técnico' }));
    fireEvent.change(screen.getByLabelText('Qtd'), { target: { value: '2' } });
    preencher('2027-01-10T18:00', '2027-01-11T00:00');

    expect(precoDaLinha()).toBe('600');
    const corpo = await corpoDoPost();
    expect(corpo.items).toEqual([expect.objectContaining({ quantity: 2, unitPrice: 600, totalPrice: 1200, itemType: 'SERVICE', serviceId: 'sv-tec' })]);
  });

  it.each([
    ['nenhum serviço marcado', [DJ]],
    ['o marcado está inativo', [{ ...TECNICO, status: 'INACTIVE' }]],
  ])('%s: o Técnico continua o item à mão de antes', async (_caso, servicos) => {
    renderPage(servicos);
    // A aba Serviços aparece quando o catálogo carrega (o serviço inativo não aparece nela: E19, abaixo).
    fireEvent.click(await screen.findByRole('button', { name: 'Serviços' }));
    fireEvent.click(screen.getByRole('button', { name: 'Técnico' }));
    preencher('2027-01-10T18:00', '2027-01-11T00:00');

    expect(screen.getByDisplayValue('Técnico')).toBeInTheDocument();
    expect(precoDaLinha()).toBe('0');
  });
});

// Auditoria do orçamento (12/11/2026), E19: a busca do catálogo listava os serviços "Em breve" e inativos (o GET
// /services do admin traz todos), e a proposta podia vender o que a empresa não oferece.
describe('Proposta Rápida — a busca do catálogo só lista serviço ativo (E19)', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  });

  it('"Em breve" e inativo ficam fora da aba Serviços e da busca; o ativo aparece', async () => {
    renderPage([DJ, { ...TECNICO, id: 'sv-live', name: 'Transmissão ao Vivo', status: 'COMING_SOON' }, { ...LUZ, status: 'INACTIVE' }]);
    await catalogoCarregado('DJ Profissional');

    expect(screen.queryByRole('button', { name: 'Adicionar Transmissão ao Vivo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar Técnico de Iluminação' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar no catálogo'), { target: { value: 'trans' } });
    expect(screen.getByText('Nenhum item encontrado.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar no catálogo'), { target: { value: 'dj' } });
    expect(screen.getByRole('button', { name: 'Adicionar DJ Profissional' })).toBeInTheDocument();
  });
});

// Decisão do dono de 08/11/2026 (conferência do lote 13: "clicar duas vezes em Técnico cria duas linhas; no Frete, a
// linha é trocada"): o 2º clique troca a linha que o botão pôs, mesmo editada, como o Frete. Dois técnicos: quantidade 2.
describe('Proposta Rápida — clicar de novo em Técnico troca a linha, não repete', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  });

  const descricoes = () => (screen.getAllByLabelText('Descrição do item') as HTMLInputElement[]).map((i) => i.value);

  it('troca a linha do técnico (mesmo editada) e não repete, nem com clique duplo; as outras linhas ficam', async () => {
    renderPage([DJ, TECNICO]);
    await catalogoCarregado('Técnico de Som e Operação Profissional');
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar DJ Profissional' }));
    fireEvent.click(screen.getByRole('button', { name: 'Técnico' }));
    fireEvent.change(screen.getAllByLabelText('Qtd')[1], { target: { value: '3' } });

    fireEvent.click(screen.getByRole('button', { name: 'Técnico' }));
    fireEvent.click(screen.getByRole('button', { name: 'Técnico' }));
    preencher('2027-01-10T18:00', '2027-01-11T00:00');

    expect(descricoes()).toEqual(['DJ Profissional', 'Técnico de Som e Operação Profissional']);
    const corpo = await corpoDoPost();
    expect(corpo.items.map((i) => [i.description, i.quantity, i.totalPrice])).toEqual([
      ['DJ Profissional', 1, 800],
      ['Técnico de Som e Operação Profissional (6 h de evento: 3 h incluídas + 3 h a mais)', 1, 600],
    ]);
  });

  // Auditoria do orçamento (12/11/2026), C13/O24: antes o técnico da busca ficava e o do botão somava (duas linhas do
  // mesmo técnico). Agora o botão troca qualquer linha do serviço que acompanha o evento todo, venha de onde vier.
  it('o botão troca também o técnico posto pela busca do catálogo (uma linha só)', async () => {
    renderPage([TECNICO]);
    await catalogoCarregado('Técnico de Som e Operação Profissional');
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Técnico de Som e Operação Profissional' }));
    fireEvent.click(screen.getByRole('button', { name: 'Técnico' }));
    fireEvent.click(screen.getByRole('button', { name: 'Técnico' }));

    expect(descricoes()).toEqual(['Técnico de Som e Operação Profissional']);
  });

  it('dois serviços marcados: cada botão troca só a própria linha', async () => {
    renderPage([TECNICO, LUZ]);
    await catalogoCarregado('Técnico de Iluminação');
    fireEvent.click(screen.getByRole('button', { name: 'Técnico de Iluminação' }));
    fireEvent.click(screen.getByRole('button', { name: 'Técnico de Som e Operação Profissional' }));
    fireEvent.click(screen.getByRole('button', { name: 'Técnico de Iluminação' }));

    expect(descricoes()).toEqual(['Técnico de Som e Operação Profissional', 'Técnico de Iluminação']);
  });

  it('sem serviço marcado: o Técnico à mão também troca a linha, e o valor digitado volta a zero', async () => {
    renderPage([DJ]);
    await catalogoCarregado('DJ Profissional');
    fireEvent.click(screen.getByRole('button', { name: 'Técnico' }));
    fireEvent.change(screen.getByLabelText('Preço unit.'), { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: 'Técnico' }));

    expect(descricoes()).toEqual(['Técnico']);
    expect(precoDaLinha()).toBe('0');
  });

  it('remover a linha e clicar de novo põe o técnico outra vez', async () => {
    renderPage([TECNICO]);
    await catalogoCarregado('Técnico de Som e Operação Profissional');
    fireEvent.click(screen.getByRole('button', { name: 'Técnico' }));
    fireEvent.click(screen.getByRole('button', { name: /Remover/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Técnico' }));

    expect(descricoes()).toEqual(['Técnico de Som e Operação Profissional']);
  });
});
