import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { apiFetch, useAuth, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));

import AdminQuickProposalPage from '../AdminQuickProposalPage';

// Auditoria do orçamento (12/11/2026), E1, E3 e E5, na Proposta Rápida. Decisão da dona: serviço que já vem no kit
// nunca é cobrado de novo (os kits trazem Logística, Roadie / Auxiliar de Montagem e técnicos como itens), e a
// montagem do equipamento avulso é cobrada pelo serviço "Roadie / Auxiliar de Montagem" do catálogo. Achados: o atalho
// Técnico punha o Técnico de Som mesmo com o Kit 05 (que já o traz) na proposta, e o atalho Montagem punha uma linha à
// mão de R$ 0 ("Montagem e desmontagem") em vez do serviço do catálogo, sem conferir o kit.
const TECNICO = { id: 'sv-tec', name: 'Técnico de Som e Operação Profissional', description: 'Som', price: '300.00', duration: 180, coversWholeEvent: true, status: 'ACTIVE' };
const ROADIE = { id: 'sv-roadie', name: 'Roadie / Auxiliar de Montagem', description: 'Montagem', price: '100.00', duration: 180, coversWholeEvent: false, status: 'ACTIVE' };
const LOGISTICA = { id: 'sv-log', name: 'Logística de Entrega e Retirada Especializada', description: 'Logística', price: '50.00', duration: 180, coversWholeEvent: false, status: 'ACTIVE' };
const DJ = { id: 'sv-dj', name: 'DJ Profissional', description: 'DJ', price: '800.00', duration: 180, coversWholeEvent: false, status: 'ACTIVE' };
const MESA = { id: 'eq-mesa', name: 'Mesa de Som', pricePerHour: 50, minimumRentalDuration: 1, priceUnit: 'hour' };
// A composição como o GET /kits do admin devolve: itens com serviceId (e o serviço) ou com equipamento.
const item = (kitId: string, serviceId: string | null) => ({ id: `${kitId}-${serviceId ?? 'eq'}`, kitId, quantity: 1, ...(serviceId ? { serviceId } : { equipmentId: 'eq-caixa' }) });
const KIT_05 = { id: 'kit-05', name: 'Kit 05', price: '990.00', minimumRentalDuration: 3, extraHourPrice: '160.00', fulfillment: 'DELIVERY_SETUP', items: [item('kit-05', null), item('kit-05', 'sv-tec'), item('kit-05', 'sv-roadie'), item('kit-05', 'sv-log')] };
const KIT_01 = { id: 'kit-01', name: 'Kit 01', price: '350.00', minimumRentalDuration: 6, extraHourPrice: '50.00', fulfillment: 'DELIVERY_SETUP', items: [item('kit-01', null), item('kit-01', 'sv-log')] };

const renderPage = (services: object[] = [TECNICO, ROADIE, LOGISTICA, DJ], kits: object[] = [KIT_05, KIT_01]) => {
  apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
    if (url === '/bookings' && opts?.method === 'POST') return Promise.resolve({ id: 'XP-NOVA' });
    if (url === '/equipments/pricing-rules') return Promise.resolve({ equipmentPriceUnit: 'hour', kitPrice: 'PER_EVENT' });
    if (url === '/equipments') return Promise.resolve([MESA]);
    if (url === '/services') return Promise.resolve(services);
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

const carregado = () => screen.findByRole('button', { name: 'Adicionar Mesa de Som' });
const adicionar = (aba: 'Equipamentos' | 'Kits' | 'Serviços', nome: string) => {
  fireEvent.click(screen.getByRole('button', { name: aba }));
  fireEvent.click(screen.getByRole('button', { name: `Adicionar ${nome}` }));
};
const preencher = () => {
  const campos: Array<[string, string]> = [
    ['Nome Completo *', 'Ana Souza'], ['WhatsApp / Celular *', '31988887777'], ['Local / Salão *', 'Espaço VIP'],
    ['Início Previsto *', '2027-01-10T18:00'], ['Término Previsto *', '2027-01-10T21:00'], ['CEP *', '30110-000'], ['Rua *', 'Av. Brasil'],
    ['Número *', '123'], ['Bairro *', 'Centro'], ['Cidade *', 'Belo Horizonte'], ['UF *', 'MG'],
  ];
  for (const [label, value] of campos) fireEvent.change(screen.getByLabelText(label), { target: { value } });
};
const descricoes = () => screen.queryAllByLabelText('Descrição do item').map((campo) => (campo as HTMLInputElement).value);
const postsDaReserva = () => apiFetch.mock.calls.filter((c) => c[0] === '/bookings' && c[1]?.method === 'POST');
const corpoDaReserva = () => JSON.parse(postsDaReserva()[0][1].body as string);
const avisou = (message: string) => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', message }));

describe('Proposta Rápida — serviço que o kit já traz não entra de novo (E1/E3)', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  });

  it('Técnico com o Kit 05 na proposta: avisa que o kit já inclui e não põe a linha', async () => {
    renderPage();
    await carregado();
    adicionar('Kits', 'Kit 05');

    fireEvent.click(screen.getByRole('button', { name: 'Técnico' }));

    avisou('O kit "Kit 05" já inclui "Técnico de Som e Operação Profissional".');
    expect(descricoes()).toEqual(['Kit 05']);
  });

  it('pela composição do kit: com o Kit 01 (sem técnico) o Técnico entra; o Kit 05 posto depois avisa e Salvar pede para tirar a linha', async () => {
    renderPage();
    await carregado();
    adicionar('Kits', 'Kit 01');
    fireEvent.click(screen.getByRole('button', { name: 'Técnico' }));
    expect(descricoes()).toEqual(['Kit 01', 'Técnico de Som e Operação Profissional']);

    // Uma reserva leva um kit só (auditoria do orçamento, C13/O24): troca o Kit 01 pelo Kit 05.
    fireEvent.click(screen.getByRole('button', { name: 'Remover Kit 01' }));
    adicionar('Kits', 'Kit 05');
    avisou('O kit "Kit 05" já inclui "Técnico de Som e Operação Profissional". Tire a linha desse serviço.');
    preencher();
    fireEvent.click(screen.getByRole('button', { name: /salvar proposta/i }));
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: expect.stringContaining('já inclui "Técnico de Som e Operação Profissional". Tire a linha desse serviço da proposta.') }));
    expect(postsDaReserva()).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Remover Técnico de Som e Operação Profissional' }));
    fireEvent.click(screen.getByRole('button', { name: /salvar proposta/i }));
    await waitFor(() => expect(postsDaReserva()).toHaveLength(1));
    expect(corpoDaReserva().items.map((i: Record<string, unknown>) => i.itemType)).toEqual(['KIT']);
    expect(corpoDaReserva()).toMatchObject({ kitId: 'kit-05' });
    expect(corpoDaReserva()).not.toHaveProperty('serviceIds');
  });

  it('busca do catálogo: o serviço que o kit traz (logística) não entra de novo; o que ele não traz (DJ) entra', async () => {
    renderPage();
    await carregado();
    adicionar('Kits', 'Kit 05');

    adicionar('Serviços', 'Logística de Entrega e Retirada Especializada');
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar DJ Profissional' }));

    avisou('O kit "Kit 05" já inclui "Logística de Entrega e Retirada Especializada".');
    expect(descricoes()).toEqual(['Kit 05', 'DJ Profissional']);
  });
});

describe('Proposta Rápida — atalho Montagem usa o serviço de montagem do catálogo (E3/E5)', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  });

  it('equipamento avulso: Montagem põe o "Roadie / Auxiliar de Montagem" com o preço do cadastro (não a linha à mão de R$ 0); o 2º clique troca a linha', async () => {
    renderPage();
    fireEvent.click(await carregado());

    fireEvent.click(screen.getByRole('button', { name: 'Montagem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Montagem' }));

    expect(descricoes()).toEqual(['Mesa de Som', 'Roadie / Auxiliar de Montagem']);
    expect((screen.getAllByLabelText('Preço unit.')[1] as HTMLInputElement).value).toBe('100');
    preencher();
    fireEvent.click(screen.getByRole('button', { name: /salvar proposta/i }));
    await waitFor(() => expect(postsDaReserva()).toHaveLength(1));
    expect(corpoDaReserva().items[1]).toEqual(expect.objectContaining({ description: 'Roadie / Auxiliar de Montagem', unitPrice: 100, totalPrice: 100, itemType: 'SERVICE', serviceId: 'sv-roadie' }));
    expect(corpoDaReserva()).toMatchObject({ serviceIds: ['sv-roadie'] });
  });

  it('kit que já traz a montagem (Kit 05): avisa e não põe a linha', async () => {
    renderPage();
    await carregado();
    adicionar('Kits', 'Kit 05');

    fireEvent.click(screen.getByRole('button', { name: 'Montagem' }));

    avisou('O kit "Kit 05" já inclui "Roadie / Auxiliar de Montagem".');
    expect(descricoes()).toEqual(['Kit 05']);
  });

  it('acha o serviço pelo nome sem depender do texto exato, de acento ou de maiúsculas', async () => {
    renderPage([{ ...ROADIE, id: 'sv-aux', name: 'AUXILIAR DE MONTAGEM' }, DJ], []);
    fireEvent.click(await carregado());

    fireEvent.click(screen.getByRole('button', { name: 'Montagem' }));

    expect(descricoes()).toEqual(['Mesa de Som', 'AUXILIAR DE MONTAGEM']);
  });

  it('com mais de um candidato, o que os kits trazem dentro; inativo e técnico do evento todo não contam', async () => {
    renderPage(
      [
        { ...ROADIE, id: 'sv-palco', name: 'Montagem de palco e estrutura' },
        { ...ROADIE, id: 'sv-velho', name: 'Montagem (antigo)', status: 'INACTIVE' },
        { ...TECNICO, id: 'sv-tec-montagem', name: 'Técnico de montagem e operação' },
        ROADIE,
      ],
      [KIT_05],
    );
    fireEvent.click(await carregado());

    fireEvent.click(screen.getByRole('button', { name: 'Montagem' }));

    expect(descricoes()).toEqual(['Mesa de Som', 'Roadie / Auxiliar de Montagem']);
  });

  it('sem serviço de montagem ativo no catálogo: avisa e não põe linha nenhuma', async () => {
    renderPage([{ ...ROADIE, status: 'INACTIVE' }, DJ]);
    fireEvent.click(await carregado());

    fireEvent.click(screen.getByRole('button', { name: 'Montagem' }));

    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', title: 'Sem serviço de montagem' }));
    expect(descricoes()).toEqual(['Mesa de Som']);
  });
});
