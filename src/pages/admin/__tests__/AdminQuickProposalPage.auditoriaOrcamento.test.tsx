import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const { apiFetch, useAuth, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));

import AdminQuickProposalPage from '../AdminQuickProposalPage';

// Auditoria do orçamento (12/11/2026), onda 2, na Proposta Rápida: E8 (a proposta vai pelo link, não por PDF),
// O18/A4/C11 (unidade do preço do equipamento), O31/C12 (quantidade inteira), C13/O24 (um kit só; técnico sem somar em
// dobro) e as linhas do frete sem valor ("a combinar"/"à parte").
// O catálogo como o GET do admin devolve: o equipamento traz o preço da unidade (pricePerHour) e a unidade (priceUnit).
const CAIXA = { id: 'eq-caixa', name: 'Caixa de Som', pricePerHour: 180, minimumRentalDuration: 1, priceUnit: 'day' };
const TECNICO = { id: 'sv-tec', name: 'Técnico de Som e Operação Profissional', description: 'Som', price: '300.00', duration: 180, coversWholeEvent: true, status: 'ACTIVE' };
const DJ = { id: 'sv-dj', name: 'DJ Profissional', description: 'DJ', price: '800.00', duration: 180, coversWholeEvent: false, status: 'ACTIVE' };
const KIT_01 = { id: 'kit-01', name: 'Kit 01', price: '350.00', minimumRentalDuration: 6, extraHourPrice: '50.00', fulfillment: 'DELIVERY_SETUP', items: [] };
const KIT_05 = { id: 'kit-05', name: 'Kit 05', price: '990.00', minimumRentalDuration: 3, extraHourPrice: '160.00', fulfillment: 'DELIVERY_SETUP', items: [] };
const linha = (description: string, unitPrice: number) => ({ description, quantity: 1, unitPrice, discount: 0, totalPrice: unitPrice, itemType: 'CUSTOM' });

let frete: () => Promise<unknown> = () => Promise.resolve({ status: 'OK', items: [] });

const PaginaDaReserva = () => {
  const { pathname, state } = useLocation();
  return <p>{`Página da reserva ${pathname} ${JSON.stringify(state)}`}</p>;
};

const renderPage = ({ equipments = [CAIXA], services = [TECNICO, DJ], kits = [KIT_01, KIT_05] }: { equipments?: object[]; services?: object[]; kits?: object[] } = {}) => {
  apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
    if (url === '/bookings' && opts?.method === 'POST') return Promise.resolve({ id: 'XP-NOVA' });
    if (url === '/admin/freight/quote' && opts?.method === 'POST') return frete();
    // A consulta da chave da unidade falha: antes a tela caía para "hora" em silêncio (O18).
    if (url === '/equipments/pricing-rules') return Promise.reject(new Error('Erro 500'));
    if (url === '/equipments') return Promise.resolve(equipments);
    if (url === '/services') return Promise.resolve(services);
    if (url === '/kits') return Promise.resolve(kits);
    return Promise.resolve([]);
  });
  render(
    <MemoryRouter initialEntries={['/admin/orcamentos/novo']}>
      <Routes>
        <Route path="/admin/orcamentos/novo" element={<AdminQuickProposalPage />} />
        <Route path="/admin/reservas/:id" element={<PaginaDaReserva />} />
      </Routes>
    </MemoryRouter>,
  );
};

// As abas do catálogo só aparecem depois que ele carrega.
const carregado = () => screen.findByRole('button', { name: 'Kits' });
const adicionar = (aba: 'Equipamentos' | 'Kits' | 'Serviços', nome: string) => {
  fireEvent.click(screen.getByRole('button', { name: aba }));
  fireEvent.click(screen.getByRole('button', { name: `Adicionar ${nome}` }));
};
const preencher = (inicio = '2027-01-10T18:00', termino = '2027-01-10T23:00') => {
  const campos: Array<[string, string]> = [
    ['Nome Completo *', 'Ana Souza'], ['WhatsApp / Celular *', '31988887777'], ['Local / Salão *', 'Espaço VIP'],
    ['Início Previsto *', inicio], ['Término Previsto *', termino], ['CEP *', '30110-000'], ['Rua *', 'Av. Brasil'],
    ['Número *', '123'], ['Bairro *', 'Centro'], ['Cidade *', 'Belo Horizonte'], ['UF *', 'MG'],
  ];
  for (const [label, value] of campos) fireEvent.change(screen.getByLabelText(label), { target: { value } });
};
const salvar = () => fireEvent.click(screen.getByRole('button', { name: /salvar proposta/i }));
const descricoes = () => screen.queryAllByLabelText('Descrição do item').map((campo) => (campo as HTMLInputElement).value);
const precos = () => screen.getAllByLabelText('Preço unit.') as HTMLInputElement[];
const postsDaReserva = () => apiFetch.mock.calls.filter((c) => c[0] === '/bookings' && c[1]?.method === 'POST');
const corpoDaReserva = () => JSON.parse(postsDaReserva()[0][1].body as string) as { items: Array<Record<string, unknown>>; [k: string]: unknown };
const erroComTexto = (texto: string) =>
  expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: expect.stringContaining(texto) }));

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  frete = () => Promise.resolve({ status: 'OK', items: [] });
});

// E8: "PDF + WhatsApp" mandava o PDF e a mensagem "Acabei de gerar o PDF…" com um total parado; o PDF trazia a
// "Mensagem sugerida para WhatsApp". Decisão de 12/11: o cliente visita o link, que mostra sempre a reserva atual.
// Orçamento em PDF (13/11/2026): saiu também o "Baixar PDF" de uso interno; o orçamento em PDF sai da ficha da reserva,
// depois de salvar, gerado pelo servidor.
describe('Proposta Rápida — a proposta vai pelo link; o PDF sai da ficha (E8)', { timeout: 20000 }, () => {
  it('o "PDF + WhatsApp" e o "Baixar PDF" saíram: nenhum botão da tela abre o WhatsApp nem gera PDF', async () => {
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);
    renderPage();
    await carregado();
    adicionar('Equipamentos', 'Caixa de Som');
    preencher();

    expect(screen.queryByRole('button', { name: /whatsapp/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pdf/i })).not.toBeInTheDocument();
    expect(abrir).not.toHaveBeenCalled();
    abrir.mockRestore();
  });

  it('o topo diz onde fica o orçamento em PDF: na ficha da reserva, depois de salvar', async () => {
    renderPage();
    await carregado();

    expect(screen.getByText(/onde também se baixa o orçamento em PDF/)).toBeInTheDocument();
    expect(screen.queryByText(/uso interno/)).not.toBeInTheDocument();
  });

  it('Salvar leva à ficha da reserva pedindo o "Enviar proposta" (o link), sem mandar nada ao cliente daqui', async () => {
    renderPage();
    await carregado();
    adicionar('Equipamentos', 'Caixa de Som');
    preencher();

    salvar();

    expect(await screen.findByText('Página da reserva /admin/reservas/XP-NOVA {"sendProposal":true}')).toBeInTheDocument();
    expect(apiFetch.mock.calls.some((c) => String(c[0]).includes('/proposal/send'))).toBe(false);
  });
});

// O18/A4/C11: a unidade vinha de GET /equipments/pricing-rules e valia "hora" enquanto carregava ou se falhasse: a
// proposta gravava por hora com o servidor em diária.
describe('Proposta Rápida — unidade do preço do equipamento vem do servidor (O18)', { timeout: 20000 }, () => {
  it('servidor em diária: o catálogo e a linha usam a diária do equipamento mesmo com a consulta da chave falhando', async () => {
    renderPage();
    await carregado();

    expect(within(screen.getByRole('button', { name: 'Adicionar Caixa de Som' })).getByText(/\/diária/)).toBeInTheDocument();
    adicionar('Equipamentos', 'Caixa de Som');
    preencher('2027-01-10T18:00', '2027-01-11T23:00');

    expect(screen.getByText(/× 2 diárias/)).toBeInTheDocument();
    salvar();
    await waitFor(() => expect(postsDaReserva()).toHaveLength(1));
    expect(corpoDaReserva().items).toEqual([expect.objectContaining({ description: 'Caixa de Som (2 diárias)', unitPrice: 360, totalPrice: 360, equipmentId: 'eq-caixa' })]);
  });

  it('equipamento sem a unidade: a linha avisa, Salvar fica travado; o preço digitado à mão libera', async () => {
    renderPage({ equipments: [{ id: 'eq-caixa', name: 'Caixa de Som', pricePerHour: 180, minimumRentalDuration: 1 }] });
    await carregado();
    adicionar('Equipamentos', 'Caixa de Som');
    preencher('2027-01-10T18:00', '2027-01-11T23:00');

    expect(screen.getByText('Sem a unidade do preço')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('por diária ou por hora');
    salvar();
    erroComTexto('por diária ou por hora');
    expect(postsDaReserva()).toHaveLength(0);

    fireEvent.change(precos()[0], { target: { value: '400' } });

    expect(screen.queryByText('Sem a unidade do preço')).not.toBeInTheDocument();
    salvar();
    await waitFor(() => expect(postsDaReserva()).toHaveLength(1));
    expect(corpoDaReserva().items).toEqual([expect.objectContaining({ description: 'Caixa de Som', unitPrice: 400, totalPrice: 400 })]);
  });
});

// O31/C12: a quantidade aceitava fração e vazio; a linha calculava com 1,5 e a reserva gravava 2 (2 × R$ 600 = R$ 900).
// Revisão: no navegador, o clique em Salvar tira o foco do campo antes do clique; se sair do campo descartasse o texto
// inválido, a reserva gravaria a quantidade anterior sem aviso. O userEvent faz essa troca de foco.
describe('Proposta Rápida — quantidade inteira, a partir de 1 (O31)', { timeout: 20000 }, () => {
  it('fração ou vazio: o aviso fica mesmo fora do campo; o clique em Salvar recusa; o inteiro grava com a mesma conta', async () => {
    const user = userEvent.setup();
    renderPage({ equipments: [{ ...CAIXA, pricePerHour: 600 }] });
    await carregado();
    adicionar('Equipamentos', 'Caixa de Som');
    preencher();
    const qtd = screen.getByLabelText('Qtd');

    await user.click(qtd);
    fireEvent.change(qtd, { target: { value: '1.5' } });
    expect(screen.getByText('Inteiro, mín. 1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /salvar proposta/i }));
    erroComTexto('número inteiro, a partir de 1');
    expect(postsDaReserva()).toHaveLength(0);
    expect(screen.getByText('Inteiro, mín. 1')).toBeInTheDocument();
    expect(qtd).toHaveAttribute('aria-invalid', 'true');

    await user.click(qtd);
    fireEvent.change(qtd, { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: /salvar proposta/i }));
    expect(postsDaReserva()).toHaveLength(0);
    expect(screen.getByText('Inteiro, mín. 1')).toBeInTheDocument();

    fireEvent.change(qtd, { target: { value: '2' } });
    expect(screen.queryByText('Inteiro, mín. 1')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /salvar proposta/i }));
    await waitFor(() => expect(postsDaReserva()).toHaveLength(1));
    expect(corpoDaReserva().items).toEqual([expect.objectContaining({ quantity: 2, unitPrice: 600, totalPrice: 1200 })]);
  });

  it('zero não vale: o aviso fica e Salvar recusa até voltar a um inteiro', async () => {
    renderPage({ equipments: [{ ...CAIXA, pricePerHour: 600 }] });
    await carregado();
    adicionar('Equipamentos', 'Caixa de Som');
    preencher();

    fireEvent.change(screen.getByLabelText('Qtd'), { target: { value: '0' } });
    expect(screen.getByText('Inteiro, mín. 1')).toBeInTheDocument();
    fireEvent.blur(screen.getByLabelText('Qtd'));
    salvar();
    erroComTexto('número inteiro, a partir de 1');
    expect(postsDaReserva()).toHaveLength(0);

    fireEvent.change(screen.getByLabelText('Qtd'), { target: { value: '1' } });
    salvar();
    await waitFor(() => expect(postsDaReserva()).toHaveLength(1));
    expect(corpoDaReserva().items).toEqual([expect.objectContaining({ quantity: 1, totalPrice: 600 })]);
  });
});

// C13/O24: o 2º kit entrava na tela e o servidor ligava só o 1º à reserva; o técnico da busca e o do botão somavam.
describe('Proposta Rápida — um kit por reserva e o técnico sem somar em dobro (C13/O24)', { timeout: 20000 }, () => {
  it('o 2º kit não entra (aviso: troque o kit ou use itens avulsos); trocar o kit funciona e a reserva leva o kit da tela', async () => {
    renderPage();
    await carregado();
    adicionar('Kits', 'Kit 01');

    adicionar('Kits', 'Kit 05');

    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'warning',
      title: 'Um kit por reserva',
      message: expect.stringContaining('A proposta já tem o kit "Kit 01". Uma reserva leva um kit só: para trocar, remova o kit atual e adicione o outro; para somar, use equipamentos e serviços avulsos.'),
    }));
    expect(descricoes()).toEqual(['Kit 01']);

    fireEvent.click(screen.getByRole('button', { name: 'Remover Kit 01' }));
    adicionar('Kits', 'Kit 05');
    expect(descricoes()).toEqual(['Kit 05']);
    preencher();
    salvar();
    await waitFor(() => expect(postsDaReserva()).toHaveLength(1));
    expect(corpoDaReserva()).toMatchObject({ kitId: 'kit-05' });
    expect(corpoDaReserva().items.map((i) => i.itemType)).toEqual(['KIT']);
  });

  it('técnico pela busca e depois pelo botão Técnico: o botão troca a linha da busca; serviço de preço fixo (DJ) ainda repete', async () => {
    renderPage({ equipments: [] });
    await carregado();
    adicionar('Serviços', 'Técnico de Som e Operação Profissional');

    fireEvent.click(screen.getByRole('button', { name: 'Técnico' }));

    expect(descricoes()).toEqual(['Técnico de Som e Operação Profissional']);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar DJ Profissional' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar DJ Profissional' }));
    expect(descricoes()).toEqual(['Técnico de Som e Operação Profissional', 'DJ Profissional', 'DJ Profissional']);
  });

  it('técnico pelo botão e depois pela busca: avisa e não repete; a reserva leva um técnico pelas horas do evento', async () => {
    renderPage({ equipments: [] });
    await carregado();
    fireEvent.click(screen.getByRole('button', { name: 'Técnico' }));

    adicionar('Serviços', 'Técnico de Som e Operação Profissional');

    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', title: 'Já está na proposta', message: expect.stringContaining('mude a quantidade da linha') }));
    expect(descricoes()).toEqual(['Técnico de Som e Operação Profissional']);
    preencher('2027-01-10T18:00', '2027-01-11T00:00');
    salvar();
    await waitFor(() => expect(postsDaReserva()).toHaveLength(1));
    expect(corpoDaReserva().items).toEqual([expect.objectContaining({ serviceId: 'sv-tec', quantity: 1, totalPrice: 600 })]);
  });
});

// Decisão da onda 2: o frete que falhou aparece "a combinar"/"à parte", nunca "R$ 0,00", e Salvar avisa.
describe('Proposta Rápida — linha do frete sem valor: "a combinar"/"à parte"', { timeout: 20000 }, () => {
  it('"Frete a combinar": o preço mostra "a combinar" (não 0), o subtotal avisa e Salvar pede confirmação', async () => {
    frete = () => Promise.resolve({ status: 'UNAVAILABLE', items: [linha('Frete a combinar', 0)] });
    renderPage();
    await carregado();
    adicionar('Equipamentos', 'Caixa de Som');
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));
    await screen.findByDisplayValue('Frete a combinar');

    expect(precos()[1].value).toBe('');
    expect(precos()[1]).toHaveAttribute('placeholder', 'a combinar');
    expect(screen.getByText('+ frete a combinar')).toBeInTheDocument();

    salvar();
    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent('Salvar com valor a combinar?');
    expect(dialogo).toHaveTextContent('A proposta tem frete a combinar');
    expect(postsDaReserva()).toHaveLength(0);
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Voltar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(postsDaReserva()).toHaveLength(0);

    salvar();
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Salvar assim' }));
    await waitFor(() => expect(postsDaReserva()).toHaveLength(1));
    expect(corpoDaReserva().items[1]).toEqual(expect.objectContaining({ description: 'Frete a combinar', unitPrice: 0, itemType: 'CUSTOM' }));
  });

  it('"Pedágio à parte" junto do frete calculado: só o pedágio fica "à parte"; com o valor digitado, Salvar não pergunta', async () => {
    frete = () => Promise.resolve({ status: 'OK', items: [linha('Frete (2 viagens, 4 trechos; 40 km por trecho, 25 km cobrados por trecho)', 350), linha('Pedágio à parte', 0)] });
    renderPage();
    await carregado();
    adicionar('Equipamentos', 'Caixa de Som');
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));
    await screen.findByDisplayValue('Pedágio à parte');

    expect(precos()[1].value).toBe('350');
    expect(precos()[2].value).toBe('');
    expect(precos()[2]).toHaveAttribute('placeholder', 'à parte');
    expect(screen.getByText('+ pedágio à parte')).toBeInTheDocument();

    fireEvent.change(precos()[2], { target: { value: '30' } });

    expect(precos()[2].value).toBe('30');
    expect(screen.queryByText('+ pedágio à parte')).not.toBeInTheDocument();
    salvar();
    await waitFor(() => expect(postsDaReserva()).toHaveLength(1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(corpoDaReserva().items[2]).toEqual(expect.objectContaining({ description: 'Pedágio à parte', unitPrice: 30, totalPrice: 30 }));
  });

  it('kit de entrega: a linha de R$ 0 "incluso no kit" não é "a combinar"; se o recálculo falha, a linha nova é', async () => {
    const respostas: Array<() => Promise<unknown>> = [
      () => Promise.resolve({ status: 'OK', items: [linha('Frete (12 km por trecho; até 15 km incluso no kit)', 0)] }),
      () => Promise.reject(new Error('Erro 500')),
    ];
    frete = () => respostas.shift()!();
    renderPage();
    await carregado();
    adicionar('Kits', 'Kit 01');
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));
    await screen.findByDisplayValue('Frete (12 km por trecho; até 15 km incluso no kit)');

    expect(precos()[1].value).toBe('0');
    expect(precos()[1]).not.toHaveAttribute('placeholder');
    expect(screen.queryByText(/^\+ (frete|pedágio)/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Frete' }));
    await screen.findByDisplayValue('Frete a combinar');

    expect(precos()[1]).toHaveAttribute('placeholder', 'a combinar');
    expect(screen.getByText('+ frete a combinar')).toBeInTheDocument();
  });

  it('linha digitada que o servidor também marca ("Frete (a combinar com o cliente)", R$ 0): "a combinar" e Salvar pergunta; "Hora extra" de R$ 0 não', async () => {
    renderPage();
    await carregado();
    adicionar('Equipamentos', 'Caixa de Som');
    preencher();
    fireEvent.click(screen.getByRole('button', { name: 'Hora extra' }));
    fireEvent.click(screen.getByRole('button', { name: 'Item personalizado' }));
    fireEvent.change(screen.getAllByLabelText('Descrição do item')[2], { target: { value: 'Frete (a combinar com o cliente)' } });

    expect(precos()[1].value).toBe('0');
    expect(precos()[1]).not.toHaveAttribute('placeholder');
    expect(precos()[2].value).toBe('');
    expect(precos()[2]).toHaveAttribute('placeholder', 'a combinar');
    expect(screen.getByText('+ frete a combinar')).toBeInTheDocument();
    salvar();
    expect(await screen.findByRole('dialog')).toHaveTextContent('Salvar com valor a combinar?');
    expect(postsDaReserva()).toHaveLength(0);
  });

});
