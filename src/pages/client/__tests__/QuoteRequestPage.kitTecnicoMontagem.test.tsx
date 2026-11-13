import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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

// O catálogo de serviços como GET /services devolve.
const TECNICO = { id: 'sv-tec', name: 'Técnico de Som e Operação Profissional', description: 'Som', price: '300.00', duration: 180, coversWholeEvent: true, status: 'ACTIVE' };
const ROADIE = { id: 'sv-roadie', name: 'Roadie / Auxiliar de Montagem', description: 'Montagem', price: '100.00', duration: 180, coversWholeEvent: false, status: 'ACTIVE' };
const LOGISTICA = { id: 'sv-log', name: 'Logística de Entrega e Retirada Especializada', description: 'Entrega', price: '50.00', duration: 180, coversWholeEvent: false, status: 'ACTIVE' };
const USUARIO = { id: 'u-ana', name: 'Ana Souza', phone: '31988887777', email: 'ana@cliente.test' };

// Kit 05: entrega e montagem, com o Técnico de Som dentro (o kit da API traz os itens com o serviço).
const KIT_COM_TECNICO = {
  id: 'kit-05', name: 'Kit 05', price: 990, fulfillment: 'DELIVERY_SETUP', status: 'ACTIVE',
  items: [
    { id: 'i1', kitId: 'kit-05', serviceId: 'sv-tec', quantity: 1, service: TECNICO },
    { id: 'i2', kitId: 'kit-05', serviceId: 'sv-roadie', quantity: 1, service: ROADIE },
    { id: 'i3', kitId: 'kit-05', serviceId: 'sv-log', quantity: 1, service: LOGISTICA },
  ],
};
const KIT_SEM_TECNICO = { id: 'kit-02', name: 'Kit 02', price: 650, fulfillment: 'DELIVERY_SETUP', status: 'ACTIVE', items: [{ id: 'i4', kitId: 'kit-02', serviceId: 'sv-roadie', quantity: 1 }] };
const KIT_RETIRADA = { id: 'kit-r', name: 'Kit Retirada', price: 300, fulfillment: 'CLIENT_PICKUP', status: 'ACTIVE', items: [] };
const CAIXA = { id: 'eq1', name: 'Caixa de som', pricePerHour: 10, status: 'ACTIVE' };

const CAIXA_TECNICO = 'Quero um técnico durante todo o evento';
const CAIXA_MONTAGEM = 'Montagem no local pela equipe';
const FRASE_KIT = 'Sem técnico, a equipe monta antes do evento e busca depois que ele termina.';
const FRASE_AVULSO = /A montagem do equipamento avulso é cobrada à parte/;

const abrir = async (carrinho: Record<string, unknown>, servicos: object[] = [TECNICO, ROADIE, LOGISTICA]) => {
  useAuth.mockReturnValue({ user: USUARIO, setAuthenticatedUser: vi.fn(), isLoading: false });
  useCart.mockReturnValue({ cart: { kit: null, equipments: [], services: [], ...carrinho }, isLoading: false, clearCart: vi.fn().mockResolvedValue(undefined) });
  apiFetch.mockImplementation((url: string) => {
    if (url === '/equipments/pricing-rules') return Promise.resolve({ equipmentPriceUnit: 'hour', kitPrice: 'PER_EVENT' });
    if (url === '/services') return Promise.resolve(servicos);
    return Promise.resolve(null);
  });
  render(
    <MemoryRouter initialEntries={['/orcamento']}>
      <Routes>
        <Route path="/orcamento" element={<QuoteRequestPage />} />
        <Route path="/orcamento-sucesso/:id" element={<p>Pedido enviado</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/services'));
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
};

const subtotal = () => (screen.getByText('Subtotal estimado').parentElement as HTMLElement).textContent ?? '';

const enviar = async () => {
  const campos: Array<[string, string]> = [
    ['Nome/Local do Evento *', 'Espaço VIP'], ['Data do Evento *', '2030-01-10'], ['Início do evento *', '19:00'], ['Término do evento *', '23:00'],
    ['CEP *', '30110-000'], ['Rua *', 'Av. Brasil'], ['Número *', '123'], ['Bairro *', 'Centro'], ['Cidade *', 'Belo Horizonte'], ['Estado *', 'MG'],
  ];
  for (const [label, value] of campos) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  for (const grupo of ['Local com escadas? *', 'Local coberto? *', 'Tem estacionamento? *']) {
    fireEvent.click(within(screen.getByRole('group', { name: grupo })).getByLabelText('Sim'));
  }
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar Pedido de Orçamento' }));
  await waitFor(() => expect(post.mock.calls.some((c) => c[0] === '/bookings')).toBe(true));
  return post.mock.calls.find((c) => c[0] === '/bookings')![1] as { serviceIds?: string[] };
};

const horario = (inicio: string, termino: string) => {
  fireEvent.change(screen.getByLabelText('Início do evento *'), { target: { value: inicio } });
  fireEvent.change(screen.getByLabelText('Término do evento *'), { target: { value: termino } });
};

// Auditoria do orçamento (12/11/2026). E1: a caixa "Quero um técnico durante todo o evento" só excluía o serviço do
// carrinho, não o de dentro do kit: nos Kits 05–08 o Técnico de Som era cobrado em dobro. Serviço que já vem no kit nunca
// é cobrado de novo (decisão da dona), nem pelo carrinho. E5: a montagem do equipamento avulso é cobrada à parte, pelo
// serviço de montagem do catálogo; o kit de entrega já traz a montagem.
describe('QuoteRequestPage — técnico que o kit já traz e montagem do equipamento avulso', { timeout: 30000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    post.mockImplementation((url: string) => Promise.resolve(url === '/bookings' ? { data: { id: 'XP-NOVA' } } : { data: { valid: false } }));
  });

  it('E1: kit com o Técnico de Som dentro: sem a caixa, com "incluso no kit", e o pedido não leva o técnico de novo', async () => {
    await abrir({ kit: KIT_COM_TECNICO });
    expect(screen.queryByLabelText(CAIXA_TECNICO)).not.toBeInTheDocument();
    expect(screen.getByText('Técnico de Som e Operação Profissional incluso no kit.')).toBeInTheDocument();
    expect(screen.queryByText(FRASE_KIT)).not.toBeInTheDocument();
    expect(await enviar()).not.toHaveProperty('serviceIds');
  });

  it('E1: o carrinho da conta traz só o serviceId dos itens do kit: vale igual', async () => {
    await abrir({ kit: { ...KIT_COM_TECNICO, items: [{ serviceId: 'sv-tec' }] } });
    expect(screen.queryByLabelText(CAIXA_TECNICO)).not.toBeInTheDocument();
    expect(screen.getByText('Técnico de Som e Operação Profissional incluso no kit.')).toBeInTheDocument();
  });

  it('E1: o técnico posto no carrinho junto com o kit que já o traz não é cobrado nem enviado', async () => {
    await abrir({ kit: KIT_COM_TECNICO, services: [{ id: 'sv-tec', name: TECNICO.name, price: 300, duration: 180, coversWholeEvent: true, status: 'ACTIVE' }] });
    horario('19:00', '23:00');
    expect(subtotal()).toMatch(/990,00/);
    expect(await enviar()).not.toHaveProperty('serviceIds');
  });

  it('E1: kit sem o técnico continua com a caixa e a frase da montagem pela equipe', async () => {
    await abrir({ kit: KIT_SEM_TECNICO });
    expect(screen.getByLabelText(CAIXA_TECNICO)).toBeInTheDocument();
    expect(screen.getByText(FRASE_KIT)).toBeInTheDocument();
    expect(screen.queryByText(/incluso no kit/)).not.toBeInTheDocument();
  });

  it('E5: equipamento avulso sem kit: caixa "Montagem no local pela equipe" com o serviço e o preço do catálogo; marcada, soma e vai no pedido', async () => {
    await abrir({ equipments: [CAIXA] });
    const caixa = screen.getByLabelText(CAIXA_MONTAGEM) as HTMLInputElement;
    expect(caixa).toHaveAccessibleDescription(/^Roadie \/ Auxiliar de Montagem: R\$\s100,00\.$/);
    expect(screen.getByText(FRASE_AVULSO)).toBeInTheDocument();
    // A frase de quem tem kit de entrega não vale para o avulso.
    expect(screen.queryByText(FRASE_KIT)).not.toBeInTheDocument();

    horario('19:00', '23:00');
    expect(subtotal()).toMatch(/40,00/);
    fireEvent.click(caixa);
    expect(subtotal()).toMatch(/140,00/);
    expect((await enviar()).serviceIds).toEqual(['sv-roadie']);
  });

  it('E5: desmarcada, a montagem não vai', async () => {
    await abrir({ equipments: [CAIXA] });
    expect(await enviar()).not.toHaveProperty('serviceIds');
  });

  it('E5: com kit de entrega, a caixa da montagem não aparece (a montagem já vem no kit)', async () => {
    await abrir({ kit: KIT_SEM_TECNICO, equipments: [CAIXA] });
    expect(screen.queryByRole('heading', { name: 'Montagem' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(CAIXA_MONTAGEM)).not.toBeInTheDocument();
    expect(screen.queryByText(FRASE_AVULSO)).not.toBeInTheDocument();
    expect(screen.getByText(FRASE_KIT)).toBeInTheDocument();
  });

  it('E5: com kit de retirada e equipamento, a caixa aparece (o equipamento é entregue; o kit, o cliente monta)', async () => {
    await abrir({ kit: KIT_RETIRADA, equipments: [CAIXA] });
    expect(screen.getByLabelText(CAIXA_MONTAGEM)).toBeInTheDocument();
  });

  it('E1/E5: kit de retirada que já traz o serviço de montagem: sem a caixa, com "incluso no kit", e o pedido não leva a montagem', async () => {
    await abrir({ kit: { ...KIT_RETIRADA, items: [{ id: 'i5', kitId: 'kit-r', serviceId: 'sv-roadie', quantity: 1 }] }, equipments: [CAIXA] });
    expect(screen.queryByLabelText(CAIXA_MONTAGEM)).not.toBeInTheDocument();
    expect(screen.getByText('Roadie / Auxiliar de Montagem incluso no kit.')).toBeInTheDocument();
    expect(screen.queryByText(FRASE_AVULSO)).not.toBeInTheDocument();
    expect(await enviar()).not.toHaveProperty('serviceIds');
  });

  it('E5: o serviço de montagem é achado pela palavra, não pelo nome exato (renomeado, sem acento, no endereço da página)', async () => {
    await abrir({ equipments: [CAIXA] }, [TECNICO, LOGISTICA, { ...ROADIE, id: 'sv-aux', name: 'Auxiliar de MONTAGEM', price: '120.00' }]);
    expect(screen.getByLabelText(CAIXA_MONTAGEM)).toHaveAccessibleDescription(/^Auxiliar de MONTAGEM: R\$\s120,00\.$/);
  });

  it('E5: serviço de montagem inativo (ou ausente do catálogo): sem a caixa, mas o aviso de que a montagem é à parte fica', async () => {
    await abrir({ equipments: [CAIXA] }, [TECNICO, { ...ROADIE, status: 'COMING_SOON' }]);
    expect(screen.queryByLabelText(CAIXA_MONTAGEM)).not.toBeInTheDocument();
    expect(screen.getByText(FRASE_AVULSO)).toBeInTheDocument();
  });

  it('E5: a montagem já no carrinho: sem a caixa, com o aviso; vai uma vez só', async () => {
    await abrir({ equipments: [CAIXA], services: [{ id: 'sv-roadie', name: ROADIE.name, price: 100, duration: 180, status: 'ACTIVE' }] });
    expect(screen.queryByLabelText(CAIXA_MONTAGEM)).not.toBeInTheDocument();
    expect(screen.getByText('A montagem pela equipe (Roadie / Auxiliar de Montagem) já está no seu carrinho.')).toBeInTheDocument();
    expect((await enviar()).serviceIds).toEqual(['sv-roadie']);
  });
});
