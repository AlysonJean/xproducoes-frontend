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

// Frete por km (decisões do dono de 06/11/2026, item frete-km do lote 13). O botão Frete da Proposta Rápida
// acrescentava sempre a linha "Frete (dentro de BH)" de R$ 0, e o valor era digitado à mão. Agora ele pede ao
// servidor o frete do endereço do evento (POST /admin/freight/quote, só admin; o site nunca fala com o Google) e
// acrescenta as linhas do frete e do pedágio, que continuam editáveis. Decisão de 07/11/2026: clicar de novo em
// Frete troca as linhas que o botão pôs antes, sem repetir o frete.
// Auditoria do orçamento (12/11/2026), E4 e O17/C9: o botão manda a regra da proposta (mode: kit de entrega ou
// equipamento avulso), não calcula quando a proposta só tem serviços ou só kit de retirada, e trocar o endereço (ou a
// regra) depois de calcular deixa as linhas "Desatualizado": Salvar pede para recalcular.
const MESA = { id: 'eq-mesa', name: 'Mesa de Som', pricePerHour: 50, minimumRentalDuration: 1 };
const ROADIE = { id: 'sv-roadie', name: 'Roadie / Auxiliar de Montagem', description: 'Montagem', price: '100.00', duration: 180, coversWholeEvent: false, status: 'ACTIVE' };
const DJ = { id: 'sv-dj', name: 'DJ Profissional', description: 'DJ', price: '800.00', duration: 180, coversWholeEvent: false, status: 'ACTIVE' };
const KIT_ENTREGA = { id: 'kit-som', name: 'Kit Som', price: '1200.00', minimumRentalDuration: 4, extraHourPrice: null, fulfillment: 'DELIVERY_SETUP', items: [] };
const KIT_RETIRADA = { ...KIT_ENTREGA, id: 'kit-festa', name: 'Kit Festa', fulfillment: 'CLIENT_PICKUP' };
const LINHAS_BETIM = [
  { description: 'Frete (2 viagens, 4 trechos; 40 km por trecho, 25 km cobrados por trecho)', quantity: 1, unitPrice: 350, discount: 0, totalPrice: 350, itemType: 'CUSTOM' },
  { description: 'Pedágio estimado (2 viagens de ida e volta)', quantity: 1, unitPrice: 25.2, discount: 0, totalPrice: 25.2, itemType: 'CUSTOM' },
];
const LINHA_CONTAGEM = { description: 'Frete (2 viagens, 4 trechos; 30 km por trecho, 15 km cobrados por trecho)', quantity: 1, unitPrice: 210, discount: 0, totalPrice: 210, itemType: 'CUSTOM' };

const renderPage = (frete: () => Promise<unknown>) => {
  apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
    if (url === '/bookings' && opts?.method === 'POST') return Promise.resolve({ id: 'XP-NOVA' });
    if (url === '/admin/freight/quote' && opts?.method === 'POST') return frete();
    if (url === '/equipments/pricing-rules') return Promise.resolve({ equipmentPriceUnit: 'hour', kitPrice: 'PER_EVENT' });
    if (url === '/equipments') return Promise.resolve([MESA]);
    if (url === '/services') return Promise.resolve([ROADIE, DJ]);
    if (url === '/kits') return Promise.resolve([KIT_ENTREGA, KIT_RETIRADA]);
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

// O formulário só aparece depois que o catálogo carrega.
const carregado = () => screen.findByRole('button', { name: 'Adicionar Mesa de Som' });
const adicionar = (aba: 'Equipamentos' | 'Kits' | 'Serviços', nome: string) => {
  fireEvent.click(screen.getByRole('button', { name: aba }));
  fireEvent.click(screen.getByRole('button', { name: `Adicionar ${nome}` }));
};

const preencher = () => {
  const campos: Array<[string, string]> = [
    ['Nome Completo *', 'Ana Souza'], ['WhatsApp / Celular *', '31988887777'], ['Local / Salão *', 'Espaço Betim'],
    ['Início Previsto *', '2027-01-10T18:00'], ['Término Previsto *', '2027-01-10T22:00'], ['CEP *', '32600-000'], ['Rua *', 'Av. Amazonas'],
    ['Número *', '1000'], ['Bairro *', 'Centro'], ['Cidade *', 'Betim'], ['UF *', 'MG'],
  ];
  for (const [label, value] of campos) fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

const chamadasDoFrete = () => apiFetch.mock.calls.filter((c) => c[0] === '/admin/freight/quote');
const corpoDoFrete = (i = 0) => JSON.parse(chamadasDoFrete()[i][1].body as string);
const descricoes = () => screen.getAllByLabelText('Descrição do item').map((campo) => (campo as HTMLInputElement).value);
const postsDaReserva = () => apiFetch.mock.calls.filter((c) => c[0] === '/bookings' && c[1]?.method === 'POST');
const corpoDaReserva = () => JSON.parse(postsDaReserva()[0][1].body as string);
const ENDERECO = { street: 'Av. Amazonas', addressNumber: '1000', neighborhood: 'Centro', city: 'Betim', state: 'MG', zipCode: '32600-000' };

describe('Proposta Rápida — botão Frete calcula pelo endereço do evento', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  });

  it('com o endereço: pede o frete ao servidor com a regra do avulso e acrescenta frete e pedágio, que vão para a reserva com o preço usado', async () => {
    renderPage(() => Promise.resolve({ status: 'OK', items: LINHAS_BETIM }));
    fireEvent.click(await carregado());
    preencher();

    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));

    expect(await screen.findByDisplayValue(LINHAS_BETIM[0].description)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pedágio estimado (2 viagens de ida e volta)')).toBeInTheDocument();
    const [url, init] = chamadasDoFrete()[0];
    expect(url).toBe('/admin/freight/quote');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ ...ENDERECO, mode: 'EQUIPMENT' });

    fireEvent.click(screen.getByRole('button', { name: /salvar proposta/i }));
    await waitFor(() => expect(postsDaReserva()).toHaveLength(1));
    expect(corpoDaReserva().items.map((i: Record<string, unknown>) => [i.description, i.unitPrice, i.totalPrice, i.itemType])).toEqual([
      ['Mesa de Som (4 h)', 200, 200, 'EQUIPMENT'],
      ['Frete (2 viagens, 4 trechos; 40 km por trecho, 25 km cobrados por trecho)', 350, 350, 'CUSTOM'],
      ['Pedágio estimado (2 viagens de ida e volta)', 25.2, 25.2, 'CUSTOM'],
    ]);
  });

  it('o valor do frete continua editável', async () => {
    renderPage(() => Promise.resolve({ status: 'OK', items: LINHAS_BETIM.slice(0, 1) }));
    fireEvent.click(await carregado());
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));
    await screen.findByDisplayValue(LINHAS_BETIM[0].description);

    fireEvent.change(screen.getAllByLabelText('Preço unit.')[1], { target: { value: '300' } });

    expect((screen.getAllByLabelText('Preço unit.')[1] as HTMLInputElement).value).toBe('300');
  });

  it('clicar de novo em Frete troca as linhas do frete anterior (mesmo editadas), sem repetir; as outras linhas ficam', async () => {
    const respostas = [{ status: 'OK', items: LINHAS_BETIM }, { status: 'OK', items: [LINHA_CONTAGEM] }];
    renderPage(() => Promise.resolve(respostas.shift()));
    fireEvent.click(await carregado());
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Montagem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));
    await screen.findByDisplayValue(LINHAS_BETIM[0].description);
    // O admin mexe no valor do frete calculado; o próximo cálculo troca a linha mesmo assim.
    const precos = screen.getAllByLabelText('Preço unit.');
    fireEvent.change(precos[precos.length - 2], { target: { value: '300' } });

    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));

    expect(await screen.findByDisplayValue(LINHA_CONTAGEM.description)).toBeInTheDocument();
    expect(descricoes()).toEqual(['Mesa de Som', 'Roadie / Auxiliar de Montagem', LINHA_CONTAGEM.description]);
    expect(chamadasDoFrete()).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: /salvar proposta/i }));
    await waitFor(() => expect(postsDaReserva()).toHaveLength(1));
    expect(corpoDaReserva().items.map((i: Record<string, unknown>) => [i.description, i.totalPrice])).toEqual([
      ['Mesa de Som (4 h)', 200],
      ['Roadie / Auxiliar de Montagem', 100],
      [LINHA_CONTAGEM.description, 210],
    ]);
  });

  it('falha no segundo clique: "Frete a combinar" troca as linhas do frete anterior', async () => {
    const respostas: Array<() => Promise<unknown>> = [() => Promise.resolve({ status: 'OK', items: LINHAS_BETIM }), () => Promise.reject(new Error('Erro 500'))];
    renderPage(() => respostas.shift()!());
    fireEvent.click(await carregado());
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));
    await screen.findByDisplayValue(LINHAS_BETIM[0].description);

    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));

    expect(await screen.findByDisplayValue('Frete a combinar')).toBeInTheDocument();
    expect(descricoes()).toEqual(['Mesa de Som', 'Frete a combinar']);
  });

  it('endereço incompleto: avisa o que falta e não chama o servidor', async () => {
    renderPage(() => Promise.resolve({ status: 'OK', items: LINHAS_BETIM }));
    fireEvent.click(await carregado());

    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));

    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', message: expect.stringContaining('endereço do evento') }));
    expect(chamadasDoFrete()).toHaveLength(0);
    expect(descricoes()).toEqual(['Mesa de Som']);
  });

  it('servidor sem cálculo (Google fora, teto do dia): a linha "Frete a combinar" e um aviso para digitar o valor', async () => {
    renderPage(() => Promise.resolve({
      status: 'UNAVAILABLE', reason: 'limite_diario',
      items: [{ description: 'Frete a combinar', quantity: 1, unitPrice: 0, discount: 0, totalPrice: 0, itemType: 'CUSTOM' }],
    }));
    fireEvent.click(await carregado());
    preencher();

    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));

    expect(await screen.findByDisplayValue('Frete a combinar')).toBeInTheDocument();
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', title: 'Frete a combinar' }));
  });

  it('erro na chamada: a linha "Frete a combinar" para digitar à mão e um aviso de erro', async () => {
    renderPage(() => Promise.reject(new Error('Erro 500')));
    fireEvent.click(await carregado());
    preencher();

    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));

    expect(await screen.findByDisplayValue('Frete a combinar')).toBeInTheDocument();
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', title: 'Frete não calculado' }));
  });
});

describe('Proposta Rápida — regra do frete (auditoria do orçamento, 12/11/2026, E4 e O17/C9)', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  });

  it('só serviços: avisa que não há frete e não chama o servidor', async () => {
    renderPage(() => Promise.resolve({ status: 'OK', items: LINHAS_BETIM }));
    await carregado();
    adicionar('Serviços', 'DJ Profissional');
    preencher();

    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));

    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', title: 'Sem frete', message: expect.stringContaining('só serviços') }));
    expect(chamadasDoFrete()).toHaveLength(0);
    expect(descricoes()).toEqual(['DJ Profissional']);
  });

  it('só kit de retirada: avisa e não calcula; com equipamento avulso junto, calcula pela regra do avulso', async () => {
    renderPage(() => Promise.resolve({ status: 'OK', items: LINHAS_BETIM.slice(0, 1) }));
    await carregado();
    adicionar('Kits', 'Kit Festa');
    preencher();

    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));

    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', title: 'Sem frete', message: expect.stringContaining('O kit "Kit Festa" é de retirada') }));
    expect(chamadasDoFrete()).toHaveLength(0);

    adicionar('Equipamentos', 'Mesa de Som');
    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));

    await screen.findByDisplayValue(LINHAS_BETIM[0].description);
    expect(corpoDoFrete()).toEqual({ ...ENDERECO, mode: 'EQUIPMENT' });
  });

  it('kit de entrega (mesmo com equipamento): manda a regra do kit', async () => {
    renderPage(() => Promise.resolve({ status: 'OK', items: [{ ...LINHAS_BETIM[0], description: 'Frete (12 km por trecho; até 15 km incluso no kit)', unitPrice: 0, totalPrice: 0 }] }));
    fireEvent.click(await carregado());
    adicionar('Kits', 'Kit Som');
    preencher();

    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));

    expect(await screen.findByDisplayValue('Frete (12 km por trecho; até 15 km incluso no kit)')).toBeInTheDocument();
    expect(corpoDoFrete()).toEqual({ ...ENDERECO, mode: 'KIT_DELIVERY' });
  });

  it('trocar o número depois de calcular: as linhas do frete ficam "Desatualizado" e Salvar pede para recalcular; recalcular libera', async () => {
    renderPage(() => Promise.resolve({ status: 'OK', items: LINHAS_BETIM }));
    fireEvent.click(await carregado());
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));
    await screen.findByDisplayValue(LINHAS_BETIM[0].description);
    expect(screen.queryByText('Desatualizado')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Número *'), { target: { value: '2000' } });

    expect(screen.getAllByText('Desatualizado')).toHaveLength(2);
    expect(screen.getByRole('alert')).toHaveTextContent('O endereço ou os itens mudaram depois do cálculo do frete');
    expect(screen.getByRole('button', { name: 'Frete' }).getAttribute('aria-describedby')).toContain('frete-desatualizado');
    fireEvent.click(screen.getByRole('button', { name: /salvar proposta/i }));
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: expect.stringContaining('Clique em Frete para recalcular') }));
    expect(postsDaReserva()).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));
    await waitFor(() => expect(chamadasDoFrete()).toHaveLength(2));
    await waitFor(() => expect(screen.queryByText('Desatualizado')).not.toBeInTheDocument());
    expect(corpoDoFrete(1)).toEqual({ ...ENDERECO, addressNumber: '2000', mode: 'EQUIPMENT' });

    fireEvent.click(screen.getByRole('button', { name: /salvar proposta/i }));
    await waitFor(() => expect(postsDaReserva()).toHaveLength(1));
  });

  it.each([
    ['rua', 'Rua *', 'Av. Brasil'],
    ['bairro', 'Bairro *', 'Funcionários'],
    ['cidade', 'Cidade *', 'Contagem'],
    ['CEP', 'CEP *', '32000-000'],
  ])('trocar %s depois de calcular também desatualiza', async (_campo, label, valor) => {
    renderPage(() => Promise.resolve({ status: 'OK', items: LINHAS_BETIM.slice(0, 1) }));
    fireEvent.click(await carregado());
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));
    await screen.findByDisplayValue(LINHAS_BETIM[0].description);

    fireEvent.change(screen.getByLabelText(label), { target: { value: valor } });

    expect(screen.getByText('Desatualizado')).toBeInTheDocument();
  });

  it('a regra muda depois de calcular (entra um kit de entrega): desatualiza; remover as linhas do frete libera o Salvar', async () => {
    renderPage(() => Promise.resolve({ status: 'OK', items: LINHAS_BETIM.slice(0, 1) }));
    fireEvent.click(await carregado());
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));
    await screen.findByDisplayValue(LINHAS_BETIM[0].description);

    adicionar('Kits', 'Kit Som');

    expect(screen.getByText('Desatualizado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `Remover ${LINHAS_BETIM[0].description}` }));
    expect(screen.queryByText('Desatualizado')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /salvar proposta/i }));
    await waitFor(() => expect(postsDaReserva()).toHaveLength(1));
  });

  it('sem o que entregar depois de calcular: o Frete tira as linhas do cálculo anterior, com o aviso', async () => {
    renderPage(() => Promise.resolve({ status: 'OK', items: LINHAS_BETIM }));
    fireEvent.click(await carregado());
    adicionar('Serviços', 'DJ Profissional');
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));
    await screen.findByDisplayValue(LINHAS_BETIM[0].description);

    fireEvent.click(screen.getByRole('button', { name: 'Remover Mesa de Som' }));
    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));

    expect(descricoes()).toEqual(['DJ Profissional']);
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sem frete', message: expect.stringContaining('As linhas do frete calculado antes saíram.') }));
    expect(chamadasDoFrete()).toHaveLength(1);
  });
});
