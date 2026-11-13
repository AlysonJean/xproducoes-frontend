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

const USUARIO = { id: 'u-ana', name: 'Ana Souza', phone: '31988887777', email: 'ana@cliente.test' };
const CAIXA = { id: 'eq1', name: 'Caixa de som', pricePerHour: 10, status: 'ACTIVE' };
// A resposta nova da validação: a regra (tipo, valor, teto, mínimo), não o registro do cupom.
const VALIDO = (rule: Record<string, unknown> = {}) => ({
  data: { valid: true, code: 'BEMVINDO10', discountAmount: 120, rule: { discountType: 'PERCENTAGE', discountValue: 10, maxDiscountAmount: 150, minOrderValue: null, ...rule } },
});

const abrir = async (kitPrice: number, usuario: object | null = USUARIO, precoHora = 10) => {
  useAuth.mockReturnValue({ user: usuario, setAuthenticatedUser: vi.fn(), isLoading: false });
  useCart.mockReturnValue({
    cart: { kit: { id: 'kit-1', name: 'Kit Festa', price: kitPrice, fulfillment: 'CLIENT_PICKUP', status: 'ACTIVE', items: [] }, equipments: [{ ...CAIXA, pricePerHour: precoHora }], services: [] },
    isLoading: false,
    clearCart: vi.fn().mockResolvedValue(undefined),
  });
  apiFetch.mockImplementation((url: string) =>
    Promise.resolve(url === '/equipments/pricing-rules' ? { equipmentPriceUnit: 'hour', kitPrice: 'PER_EVENT' } : []));
  render(
    <MemoryRouter initialEntries={['/orcamento']}>
      <Routes>
        <Route path="/orcamento" element={<QuoteRequestPage />} />
        <Route path="/orcamento-sucesso/:id" element={<p>Pedido enviado</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/equipments/pricing-rules'));
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
};

const campo = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const horario = (inicio: string, termino: string) => { campo('Início do evento *', inicio); campo('Término do evento *', termino); };
const aplicar = async () => {
  campo('Código do cupom', 'bemvindo10');
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
  await screen.findByText('Cupom BEMVINDO10 aplicado');
};
const validacoes = () => post.mock.calls.filter((c) => c[0] === '/coupons/validate');
const linha = (rotulo: string) => (screen.getByText(rotulo).parentElement as HTMLElement).textContent ?? '';

const preencherResto = (convidado = false) => {
  const campos: Record<string, string> = {
    'Nome/Local do Evento *': 'Espaço VIP', 'Data do Evento *': '2030-01-10', 'CEP *': '30110-000', 'Rua *': 'Av. Brasil', 'Número *': '123',
    'Bairro *': 'Centro', 'Cidade *': 'Belo Horizonte', 'Estado *': 'MG',
    ...(convidado ? { 'Seu Nome *': 'Ana Souza', 'Seu E-mail *': 'ana@cliente.test', 'WhatsApp com DDD *': '31988887777' } : {}),
  };
  for (const [label, value] of Object.entries(campos)) campo(label, value);
  for (const grupo of ['Local com escadas? *', 'Local coberto? *', 'Tem estacionamento? *']) {
    fireEvent.click(within(screen.getByRole('group', { name: grupo })).getByLabelText('Não sei'));
  }
};

// Auditoria do orçamento (12/11/2026), O7/A2/B11. O desconto era calculado uma vez, sobre o subtotal do momento (antes da
// duração, só o kit), e ficava congelado; o servidor recalculava. O convidado validava sem a regra por cliente e o pedido
// inteiro voltava 400 no envio. Agora o desconto acompanha o subtotal (pela regra que a validação devolve, sem nova
// consulta: a rota aceita 15 tentativas em 5 minutos), o convidado manda o e-mail, e o cupom é validado de novo antes do
// envio; recusado, a pessoa decide, sem perder o formulário.
describe('QuoteRequestPage — cupom que acompanha o pedido', { timeout: 30000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    post.mockImplementation((url: string) => Promise.resolve(url.startsWith('/bookings') ? { data: { id: 'XP-NOVA' } } : VALIDO()));
  });

  it('o desconto acompanha o subtotal, sem validar de novo a cada mudança', async () => {
    await abrir(1200);
    await aplicar();
    expect(screen.getByText('Desconto de R$ 120,00')).toBeInTheDocument();

    horario('19:00', '23:00'); // + caixa 4 h = R$ 40
    expect(screen.getByText('Desconto de R$ 124,00')).toBeInTheDocument();
    expect(linha('Total estimado (sem frete)')).toMatch(/1\.116,00/);

    horario('10:00', '23:00'); // 13 h = R$ 130
    expect(screen.getByText('Desconto de R$ 133,00')).toBeInTheDocument();
    expect(validacoes()).toHaveLength(1);
  });

  it('o teto do cupom vale na conta do site, como no servidor', async () => {
    await abrir(1800);
    await aplicar();
    horario('19:00', '23:00');
    expect(screen.getByText('Desconto de R$ 150,00')).toBeInTheDocument();
  });

  it('abaixo do pedido mínimo, o cupom fica guardado e diz que não dá desconto com o pedido de agora', async () => {
    post.mockImplementation((url: string) => Promise.resolve(url.startsWith('/bookings') ? { data: { id: 'XP-NOVA' } } : VALIDO({ minOrderValue: 1500, maxDiscountAmount: null })));
    await abrir(1400, USUARIO, 50);
    horario('19:00', '23:00'); // 1400 + 200 = 1600
    await aplicar();
    expect(screen.getByText('Desconto de R$ 160,00')).toBeInTheDocument();

    horario('19:00', '20:00'); // 1400 + 50 = 1450
    expect(screen.getByText(/Este cupom vale a partir de R\$\s1\.500,00 em itens; com o pedido de agora, ele não dá desconto\./)).toBeInTheDocument();
    expect(screen.queryByText(/^Desconto \(BEMVINDO10\)/)).not.toBeInTheDocument();
  });

  it('convidado: o e-mail vai na validação; com conta, não', async () => {
    await abrir(1200, null);
    campo('Seu E-mail *', 'ana@cliente.test');
    await aplicar();
    expect(validacoes()[0][1]).toMatchObject({ code: 'bemvindo10', email: 'ana@cliente.test' });
  });

  it('com conta, a validação não leva e-mail', async () => {
    await abrir(1200);
    await aplicar();
    expect(validacoes()[0][1]).not.toHaveProperty('email');
  });

  it('antes do envio o cupom é validado de novo, com o subtotal e o e-mail de agora; válido, vai no pedido', async () => {
    await abrir(1200, null);
    await aplicar();
    horario('19:00', '23:00');
    preencherResto(true);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Pedido de Orçamento' }));

    await waitFor(() => expect(post.mock.calls.some((c) => c[0] === '/bookings/guest')).toBe(true));
    expect(validacoes()).toHaveLength(2);
    expect(validacoes()[1][1]).toMatchObject({ code: 'BEMVINDO10', subtotal: 1240, email: 'ana@cliente.test' });
    expect(post.mock.calls.find((c) => c[0] === '/bookings/guest')![1]).toMatchObject({ couponCode: 'BEMVINDO10' });
  });

  it('recusado no envio: a mensagem diz por quê, nada se perde, e "Tirar o cupom e enviar" manda sem o cupom', async () => {
    let chamada = 0;
    post.mockImplementation((url: string) => {
      if (url === '/coupons/validate') {
        chamada += 1;
        return Promise.resolve(chamada === 1 ? VALIDO() : { data: { valid: false, reason: 'Você já utilizou este cupom o número máximo de vezes.' } });
      }
      return Promise.resolve({ data: { id: 'XP-NOVA' } });
    });
    await abrir(1200, null);
    await aplicar();
    horario('19:00', '23:00');
    preencherResto(true);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Pedido de Orçamento' }));

    expect(await screen.findByText('O cupom BEMVINDO10 não vale para este pedido: Você já utilizou este cupom o número máximo de vezes.')).toBeInTheDocument();
    expect(post.mock.calls.some((c) => c[0] === '/bookings/guest')).toBe(false);
    expect(screen.getByLabelText('Nome/Local do Evento *')).toHaveValue('Espaço VIP');
    expect(screen.getByLabelText('Seu E-mail *')).toHaveValue('ana@cliente.test');

    fireEvent.click(screen.getByRole('button', { name: 'Tirar o cupom e enviar' }));
    await waitFor(() => expect(post.mock.calls.some((c) => c[0] === '/bookings/guest')).toBe(true));
    expect(post.mock.calls.find((c) => c[0] === '/bookings/guest')![1]).not.toHaveProperty('couponCode');
    expect(await screen.findByText('Pedido enviado')).toBeInTheDocument();
  });
});
