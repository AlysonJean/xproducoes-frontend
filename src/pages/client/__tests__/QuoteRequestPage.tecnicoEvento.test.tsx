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

// O catálogo como GET /services devolve (o Decimal do preço chega como texto).
const TECNICO = { id: 'sv-tec', name: 'Técnico de Som e Operação Profissional', description: 'Som', price: '300.00', duration: 180, coversWholeEvent: true, status: 'ACTIVE' };
const LUZ = { id: 'sv-luz', name: 'Técnico de Iluminação', description: 'Luz', price: '250.00', duration: 180, coversWholeEvent: true, status: 'ACTIVE' };
const DJ = { id: 'sv-dj', name: 'DJ Profissional', description: 'DJ', price: '800.00', duration: 180, coversWholeEvent: false, status: 'ACTIVE' };
const KIT_ENTREGA = { id: 'kit-1', name: 'Kit Festa', price: 1200, fulfillment: 'DELIVERY_SETUP' };
const KIT_RETIRADA = { ...KIT_ENTREGA, fulfillment: 'CLIENT_PICKUP' };
const CAIXA = { id: 'eq1', name: 'Caixa de som', pricePerHour: 10 };
const USUARIO = { id: 'u-ana', name: 'Ana Souza', phone: '31988887777', email: 'ana@cliente.test' };

const CAIXA_UNICA = 'Quero um técnico durante todo o evento';
// Sem "tudo": com kit de retirada e equipamento, o kit de retirada o cliente monta (revisão do lote 13).
const FRASE_SEM_TECNICO = 'Sem técnico, a equipe monta antes do evento e busca depois que ele termina.';

const abrir = async (carrinho: Record<string, unknown>, servicos: object[] = [TECNICO, DJ]) => {
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

const duracao = (horas: string) => fireEvent.change(screen.getByLabelText('Tempo de Operação (horas) *'), { target: { value: horas } });

const subtotalDoCupom = async () => {
  fireEvent.change(screen.getByLabelText('Código do cupom'), { target: { value: 'BEMVINDO10' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
  await waitFor(() => expect(post).toHaveBeenCalledWith('/coupons/validate', expect.anything()));
  return post.mock.calls.find((c) => c[0] === '/coupons/validate')![1].subtotal as number;
};

const enviar = async () => {
  const campos: Array<[string, string]> = [
    ['Nome/Local do Evento *', 'Espaço VIP'], ['Data do Evento *', '2027-01-10'], ['CEP *', '30110-000'], ['Rua *', 'Av. Brasil'],
    ['Número *', '123'], ['Bairro *', 'Centro'], ['Cidade *', 'Belo Horizonte'], ['Estado *', 'MG'],
  ];
  for (const [label, value] of campos) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar Pedido de Orçamento' }));
  await waitFor(() => expect(post.mock.calls.some((c) => c[0] === '/bookings')).toBe(true));
  return post.mock.calls.find((c) => c[0] === '/bookings')![1] as { serviceIds?: string[]; kitId?: string; equipmentIds?: string[] };
};

// Lote 13, técnico durante o evento (decisão do dono de 06/11/2026): numa entrega há duas opções, "a equipe monta e
// busca depois" ou "um técnico responsável durante todo o evento". A caixa "Quero um técnico durante todo o evento"
// aparece quando o pedido tem kit de entrega ou equipamento, nunca no pedido só com kit de retirada, e oferece o
// serviço que o dono marcou "Pode acompanhar o evento todo". A cobrança é pelas horas do evento (R$ 300 por 180 min:
// 6 h = R$ 600), igual no servidor e na estimativa do site.
describe('QuoteRequestPage — caixa do técnico durante todo o evento', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: USUARIO, setAuthenticatedUser: vi.fn(), isLoading: false });
    post.mockImplementation((url: string) =>
      Promise.resolve(url === '/bookings' ? { data: { id: 'XP-NOVA' } } : { data: { valid: false, reason: 'Cupom inválido.' } }));
  });

  it('kit de entrega: a caixa com o nome e a regra; desmarcada, a frase da montagem; 6 h: R$ 600 na caixa e na estimativa; o envio leva o técnico', async () => {
    await abrir({ kit: KIT_ENTREGA });

    const caixa = screen.getByLabelText(CAIXA_UNICA) as HTMLInputElement;
    expect(caixa.checked).toBe(false);
    expect(caixa).toHaveAccessibleDescription(/^Técnico de Som e Operação Profissional: R\$\s300,00 até 3 h de evento; cada hora a mais sai proporcional\.$/);
    expect(screen.getByText(FRASE_SEM_TECNICO)).toBeInTheDocument();
    expect(screen.queryByLabelText(/DJ Profissional/)).not.toBeInTheDocument();

    fireEvent.click(caixa);
    duracao('6');

    expect(screen.queryByText(FRASE_SEM_TECNICO)).not.toBeInTheDocument();
    expect(caixa).toHaveAccessibleDescription(/No seu evento de 6 h: R\$\s600,00\.$/);
    expect(await subtotalDoCupom()).toBe(1200 + 600);
    const corpo = await enviar();
    expect(corpo).toMatchObject({ kitId: 'kit-1', serviceIds: ['sv-tec'] });
    expect(await screen.findByText('Pedido enviado')).toBeInTheDocument();
  });

  it('desmarcada: o pedido não leva o técnico e a estimativa não o soma', async () => {
    await abrir({ kit: KIT_ENTREGA });
    duracao('6');

    expect(await subtotalDoCupom()).toBe(1200);
    const corpo = await enviar();
    expect(corpo).not.toHaveProperty('serviceIds');
  });

  it('marcar e desmarcar: volta ao pedido sem técnico', async () => {
    await abrir({ kit: KIT_ENTREGA });
    const caixa = screen.getByLabelText(CAIXA_UNICA);
    fireEvent.click(caixa);
    fireEvent.click(caixa);
    duracao('4');

    expect(screen.getByText(FRASE_SEM_TECNICO)).toBeInTheDocument();
    expect(await subtotalDoCupom()).toBe(1200);
  });

  it('só equipamento: a caixa aparece e o técnico de 8 h sai R$ 800', async () => {
    await abrir({ equipments: [CAIXA] });
    fireEvent.click(screen.getByLabelText(CAIXA_UNICA));
    duracao('8');

    expect(await subtotalDoCupom()).toBe(10 * 8 + 800);
    expect((await enviar()).serviceIds).toEqual(['sv-tec']);
  });

  it('kit de retirada com equipamento: a caixa aparece (o equipamento é entregue)', async () => {
    await abrir({ kit: KIT_RETIRADA, equipments: [CAIXA] });
    expect(screen.getByLabelText(CAIXA_UNICA)).toBeInTheDocument();
  });

  it('só kit de retirada: nem caixa nem frase da montagem', async () => {
    await abrir({ kit: KIT_RETIRADA });
    expect(screen.queryByLabelText(CAIXA_UNICA)).not.toBeInTheDocument();
    expect(screen.queryByText(FRASE_SEM_TECNICO)).not.toBeInTheDocument();
    expect(screen.queryByText('Técnico no evento')).not.toBeInTheDocument();
  });

  it('nenhum serviço marcado pelo dono: sem caixa', async () => {
    await abrir({ kit: KIT_ENTREGA }, [DJ]);
    expect(screen.queryByText('Técnico no evento')).not.toBeInTheDocument();
    expect(screen.queryByText(FRASE_SEM_TECNICO)).not.toBeInTheDocument();
  });

  it('serviço marcado mas inativo, em manutenção ou "em breve": sem caixa (o servidor recusaria)', async () => {
    await abrir({ kit: KIT_ENTREGA }, [{ ...TECNICO, status: 'COMING_SOON' }, { ...LUZ, status: 'MAINTENANCE' }, { ...TECNICO, id: 'sv-x', status: 'INACTIVE' }]);
    expect(screen.queryByText('Técnico no evento')).not.toBeInTheDocument();
  });

  it('dois serviços marcados: uma caixa por serviço, com o nome; marcar os dois manda os dois', async () => {
    await abrir({ kit: KIT_ENTREGA }, [TECNICO, LUZ, DJ]);

    const som = screen.getByLabelText(`${CAIXA_UNICA}: Técnico de Som e Operação Profissional`);
    const luz = screen.getByLabelText(`${CAIXA_UNICA}: Técnico de Iluminação`);
    expect(luz).toHaveAccessibleDescription(/^R\$\s250,00 até 3 h de evento; cada hora a mais sai proporcional\.$/);
    fireEvent.click(som);
    fireEvent.click(luz);
    duracao('6');

    expect(await subtotalDoCupom()).toBe(1200 + 600 + 500);
    expect((await enviar()).serviceIds).toEqual(['sv-tec', 'sv-luz']);
  });

  it('técnico já no carrinho: sem caixa para ele, a estimativa cobra pelas horas e o envio não repete o id', async () => {
    await abrir({ kit: KIT_ENTREGA, services: [{ id: 'sv-tec', name: TECNICO.name, price: 300, duration: 180 }] });
    expect(screen.queryByLabelText(CAIXA_UNICA)).not.toBeInTheDocument();
    duracao('6');

    expect(await subtotalDoCupom()).toBe(1200 + 600);
    expect((await enviar()).serviceIds).toEqual(['sv-tec']);
  });

  it('duração quebrada conta a hora cheia, como o servidor (hoursBetween): 6 h 15 min = 7 h = R$ 700', async () => {
    await abrir({ kit: KIT_ENTREGA });
    const caixa = screen.getByLabelText(CAIXA_UNICA);
    fireEvent.click(caixa);
    duracao('6.25');

    expect(caixa).toHaveAccessibleDescription(/No seu evento de 7 h: R\$\s700,00\.$/);
    expect(await subtotalDoCupom()).toBe(1200 + 700);
  });

  it('DJ no carrinho continua com preço fixo, qualquer duração', async () => {
    await abrir({ kit: KIT_ENTREGA, services: [{ id: 'sv-dj', name: DJ.name, price: 800, duration: 180, coversWholeEvent: false }] });
    duracao('8');

    expect(await subtotalDoCupom()).toBe(1200 + 800);
  });
});
