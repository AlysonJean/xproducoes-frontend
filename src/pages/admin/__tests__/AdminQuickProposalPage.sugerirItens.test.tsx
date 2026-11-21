import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { apiFetch, useAuth, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));

import AdminQuickProposalPage from '../AdminQuickProposalPage';

// "Sugerir itens" (ideia aprovada por Alyson em 20/11/2026): no orçamento de um pedido do briefing, a IA propõe kit,
// serviços e equipamentos do catálogo. As linhas entram com o preço do catálogo e pelas mesmas regras da busca (um kit
// só, serviço que o kit traz não entra de novo, nada repetido), com o motivo à vista; nada é gravado sem Salvar.
const CODIGO = 'XP-BIA-20261120-2000-7Q1';
const BRIEFING = [
  '— Briefing preenchido pelo cliente —',
  'Evento: Aniversário ou 15 anos',
  'Convidados: 100 a 200',
  'Precisa de: Som, Iluminação, DJ',
  '',
  '— Ciência marcada em 20/11/2026 (texto 2026-11-13) —',
].join('\n');
const PEDIDO = {
  id: CODIGO, status: 'PENDING', eventTitle: 'Aniversário ou 15 anos', location: 'A definir',
  eventDate: '2027-04-18T23:00:00.000Z', eventEndDate: '2027-04-19T06:00:00.000Z',
  street: '', addressNumber: '', neighborhood: '', city: 'Betim', state: 'MG', zipCode: '',
  clientId: null, client: null, clientName: 'Bia Souza', clientContact: '31955554444', clientEmail: 'bia@cliente.test',
  specialRequests: BRIEFING, items: [], contractSummary: null,
};
const KIT_03 = {
  id: 'kit-03', name: 'Kit 03 · Balada & DJ (100 a 200 Pessoas)', price: '1190.00', minimumRentalDuration: 6, extraHourPrice: null, fulfillment: 'DELIVERY_SETUP',
  items: [{ serviceId: 'svc-roadie', service: { id: 'svc-roadie', name: 'Roadie / Auxiliar de Montagem' } }],
};
const KIT_02 = { id: 'kit-02', name: 'Kit 02 · Festa (60 a 120 Pessoas)', price: '650.00', minimumRentalDuration: 6, extraHourPrice: null, fulfillment: 'DELIVERY_SETUP', items: [] };
const SERVICOS = [
  { id: 'svc-dj', name: 'DJ Profissional (Open Format)', price: '300.00', duration: 240, status: 'ACTIVE' },
  { id: 'svc-roadie', name: 'Roadie / Auxiliar de Montagem', price: '100.00', duration: 180, status: 'ACTIVE' },
  { id: 'svc-foto', name: 'Registro Audiovisual (Foto e Filme)', price: '1000.00', duration: 240, status: 'COMING_SOON' },
];
const EQUIPAMENTOS = [{ id: 'eq-fumaca', name: 'Máquina de Fumaça', pricePerHour: '80.00', priceUnit: 'day', status: 'ACTIVE' }];

const SUGESTAO = {
  kit: { id: 'kit-03', name: KIT_03.name, reason: 'Festa de 100 a 200 pessoas com pista.' },
  services: [
    { id: 'svc-dj', name: 'DJ Profissional (Open Format)', quantity: 1, reason: 'Pediu DJ.' },
    { id: 'svc-roadie', name: 'Roadie / Auxiliar de Montagem', quantity: 1, reason: 'Montagem.' },
    { id: 'svc-foto', name: 'Registro Audiovisual (Foto e Filme)', quantity: 1, reason: 'Fotos.' },
  ],
  equipment: [
    { id: 'eq-fumaca', name: 'Máquina de Fumaça', quantity: 2, reason: 'Efeito na valsa.' },
    { id: 'eq-sumiu', name: 'Globo antigo', quantity: 1, reason: 'Pista.' },
  ],
  observations: ['Confirmar o horário: 7 h, além das 6 h do kit.'],
};

const renderPage = (reserva: object = PEDIDO, sugestao: object | Error = SUGESTAO, url = `/admin/orcamentos/novo?reserva=${encodeURIComponent(CODIGO)}`) => {
  apiFetch.mockImplementation((path: string, opts?: { method?: string }) => {
    if (path === `/bookings/${encodeURIComponent(CODIGO)}` && !opts?.method) return Promise.resolve(reserva);
    if (path === `/bookings/${encodeURIComponent(CODIGO)}` && opts?.method === 'PUT') return Promise.resolve({ id: CODIGO });
    if (path === `/admin/bookings/${encodeURIComponent(CODIGO)}/suggest-items`) return sugestao instanceof Error ? Promise.reject(sugestao) : Promise.resolve(sugestao);
    if (path === '/kits') return Promise.resolve([KIT_02, KIT_03]);
    if (path === '/services') return Promise.resolve(SERVICOS);
    if (path === '/equipments') return Promise.resolve(EQUIPAMENTOS);
    return Promise.resolve([]);
  });
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/admin/orcamentos/novo" element={<AdminQuickProposalPage />} />
        <Route path="/admin/reservas/:id" element={<p>Página da reserva</p>} />
      </Routes>
    </MemoryRouter>,
  );
};

const sugerir = async () => fireEvent.click(await screen.findByRole('button', { name: /Sugerir itens \(IA\)/ }));
const quadro = () => screen.getByRole('note', { name: 'Sugestão da IA' });
const chamadas = (method: string) => apiFetch.mock.calls.filter((c) => c[1]?.method === method);

describe('Proposta Rápida — "Sugerir itens" (IA)', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  });

  it('põe kit, serviço e equipamento do catálogo, com o motivo; o que o kit traz, o "Em breve" e o que sumiu ficam de fora', async () => {
    renderPage();
    await sugerir();

    await waitFor(() => expect(quadro()).toBeInTheDocument());
    const [caminho, opcoes] = apiFetch.mock.calls.find((c) => String(c[0]).endsWith('/suggest-items'))!;
    expect(caminho).toBe(`/admin/bookings/${encodeURIComponent(CODIGO)}/suggest-items`);
    expect(opcoes).toMatchObject({ method: 'POST', timeoutMs: 30_000 });

    const nota = within(quadro());
    expect(nota.getByText('A IA pôs 3 itens a partir do briefing. Confira cada linha antes de salvar: a IA pode errar.')).toBeInTheDocument();
    expect(nota.getByText(`${KIT_03.name}: Festa de 100 a 200 pessoas com pista.`)).toBeInTheDocument();
    expect(nota.getByText('DJ Profissional (Open Format): Pediu DJ.')).toBeInTheDocument();
    expect(nota.getByText('Máquina de Fumaça (2): Efeito na valsa.')).toBeInTheDocument();
    expect(nota.getByText(`O kit "${KIT_03.name}" já inclui "Roadie / Auxiliar de Montagem".`)).toBeInTheDocument();
    expect(nota.getByText('Registro Audiovisual (Foto e Filme): não está à venda no catálogo.')).toBeInTheDocument();
    expect(nota.getByText('Globo antigo: não está mais no catálogo.')).toBeInTheDocument();
    expect(nota.getByText('Confirmar o horário: 7 h, além das 6 h do kit.')).toBeInTheDocument();

    // As linhas entram na tabela, e salvar grava as do catálogo (com a quantidade sugerida).
    fireEvent.change(screen.getByLabelText('Local / Salão *'), { target: { value: 'Sítio em Betim' } });
    fireEvent.change(screen.getByLabelText('Rua *'), { target: { value: 'Rua A' } });
    fireEvent.change(screen.getByLabelText('Número *'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Bairro *'), { target: { value: 'Centro' } });
    fireEvent.change(screen.getByLabelText('CEP *'), { target: { value: '32600000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar na reserva' }));
    await waitFor(() => expect(chamadas('PUT')).toHaveLength(1));
    const corpo = JSON.parse(chamadas('PUT')[0][1].body as string);
    expect(corpo.items).toEqual([
      expect.objectContaining({ itemType: 'KIT', kitId: 'kit-03', quantity: 1 }),
      expect.objectContaining({ itemType: 'SERVICE', serviceId: 'svc-dj', quantity: 1, unitPrice: 300 }),
      expect.objectContaining({ itemType: 'EQUIPMENT', equipmentId: 'eq-fumaca', quantity: 2 }),
    ]);
  });

  it('com um kit já na proposta, o kit sugerido fica de fora (um kit por reserva)', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Kits' }));
    fireEvent.click(await screen.findByRole('button', { name: `Adicionar ${KIT_02.name}` }));
    await sugerir();

    await waitFor(() => expect(quadro()).toBeInTheDocument());
    expect(within(quadro()).getByText(`${KIT_03.name}: a proposta já tem o kit "${KIT_02.name}" (um kit por reserva).`)).toBeInTheDocument();
    // Sem o Kit 03, o roadie não está incluso em kit nenhum da proposta e entra.
    expect(within(quadro()).getByText('Roadie / Auxiliar de Montagem: Montagem.')).toBeInTheDocument();
  });

  it('o que a equipe já pôs não entra de novo; serviço avulso que o kit sugerido traz vira aviso para tirar a linha', async () => {
    renderPage();
    const adicionar = async (aba: string, nome: string) => {
      fireEvent.click(await screen.findByRole('button', { name: aba }));
      fireEvent.click(await screen.findByRole('button', { name: `Adicionar ${nome}` }));
    };
    await adicionar('Serviços', 'DJ Profissional (Open Format)');
    await adicionar('Serviços', 'Roadie / Auxiliar de Montagem');
    await adicionar('Equipamentos', 'Máquina de Fumaça');
    await sugerir();

    await waitFor(() => expect(quadro()).toBeInTheDocument());
    const nota = within(quadro());
    expect(nota.getByText('A IA pôs 1 item a partir do briefing. Confira cada linha antes de salvar: a IA pode errar.')).toBeInTheDocument();
    expect(nota.getByText('DJ Profissional (Open Format): já está na proposta.')).toBeInTheDocument();
    expect(nota.getByText('Máquina de Fumaça: já está na proposta.')).toBeInTheDocument();
    expect(nota.getByText(`O kit "${KIT_03.name}" já inclui "Roadie / Auxiliar de Montagem". Tire a linha desse serviço.`)).toBeInTheDocument();
  });

  it('IA indisponível: avisa com a mensagem do servidor e não põe nada', async () => {
    renderPage(PEDIDO, Object.assign(new Error('A IA não respondeu agora. Monte à mão ou tente de novo.'), { status: 503 }));
    await sugerir();

    await waitFor(() =>
      expect(addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'warning', title: 'Sem sugestão agora', message: 'A IA não respondeu agora. Monte à mão ou tente de novo.' }),
      ),
    );
    expect(screen.queryByRole('note', { name: 'Sugestão da IA' })).not.toBeInTheDocument();
  });

  it('sugestão vazia: diz para montar à mão; Fechar some com o quadro', async () => {
    renderPage(PEDIDO, { kit: null, services: [], equipment: [], observations: [] });
    await sugerir();

    await waitFor(() => expect(within(quadro()).getByText('A IA não achou itens novos para pôr. Monte à mão.')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Fechar a sugestão da IA' }));
    expect(screen.queryByRole('note', { name: 'Sugestão da IA' })).not.toBeInTheDocument();
  });

  it.each([
    ['pedido sem briefing (feito no painel)', { ...PEDIDO, specialRequests: 'Som para 150 pessoas.' }],
    ['reserva confirmada (itens travados)', { ...PEDIDO, status: 'CONFIRMED' }],
  ])('%s: sem o botão', async (_caso, reserva) => {
    renderPage(reserva);
    expect(await screen.findByRole('heading', { name: `Orçamento da reserva ${CODIGO}` })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sugerir itens/ })).not.toBeInTheDocument();
  });

  it('proposta nova, sem reserva: sem o botão', async () => {
    renderPage(PEDIDO, SUGESTAO, '/admin/orcamentos/novo');
    expect(await screen.findByRole('button', { name: 'Kits' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sugerir itens/ })).not.toBeInTheDocument();
  });
});
