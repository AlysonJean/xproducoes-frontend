import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { apiFetch, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'CLIENT' } }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../components/client/BookingChatPanel', () => ({ BookingChatPanel: () => null }));

import { BookingDetailsPage } from '../BookingDetailsPage';

// D21 (aprovada em 02/11/2026): a reserva lista os comprovantes sem endereço de arquivo (só id, nome, tipo e data).
const COMPROVANTE = { id: 'att-1', filename: 'pix.pdf', mimeType: 'application/pdf', createdAt: '2026-11-08T12:00:00.000Z' };
const reserva = (extra: Record<string, unknown> = {}) => ({
  id: 'XP-1',
  status: 'PENDING',
  eventDate: '2026-12-10T22:00:00.000Z',
  totalPrice: '1200',
  attachments: [],
  eventCollaborators: [],
  ...extra,
});
const LINK = 'https://api.cloudinary.com/v1_1/demo/image/download?public_id=x&expires_at=1&signature=abc';
let BOOKING: Record<string, unknown> = reserva();

// Responde como o backend: o envio é multipart no campo 'file', na rota da reserva; o link vem da rota do arquivo.
function backend(endpoint: string, options?: RequestInit) {
  if (endpoint === '/bookings/XP-1' && !options?.method) return Promise.resolve(BOOKING);
  if (endpoint === '/bookings/XP-1/attachments/upload' && options?.method === 'POST' && options.body instanceof FormData) {
    return Promise.resolve({ id: 'att-novo', filename: 'pix.pdf', mimeType: 'application/pdf', createdAt: '2026-11-09T12:00:00.000Z' });
  }
  if (endpoint.startsWith('/bookings/XP-1/attachments/att-1/file') && !options?.method) {
    return Promise.resolve({ url: LINK, expiresAt: '2026-11-09T12:05:00.000Z' });
  }
  return Promise.reject(new Error(`rota inesperada: ${options?.method ?? 'GET'} ${endpoint}`));
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/cliente/reservas/XP-1']}>
      <Routes>
        <Route path="/cliente/reservas/:id" element={<BookingDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );

async function abrirModal() {
  renderPage();
  fireEvent.click(await screen.findByRole('button', { name: 'Adicionar' }));
  return screen.findByRole('dialog');
}

async function enviarComprovante(file: File) {
  const dialog = await abrirModal();
  fireEvent.change(within(dialog).getByLabelText('Arquivo'), { target: { files: [file] } });
  fireEvent.click(within(dialog).getByRole('button', { name: /Enviar/ }));
  return dialog;
}

const arquivo = (nome: string, tipo: string, bytes?: number) => {
  const file = new File(['%PDF-1.7'], nome, { type: tipo });
  if (bytes !== undefined) Object.defineProperty(file, 'size', { value: bytes });
  return file;
};
const erroHttp = (status: number, message: string) => Object.assign(new Error(message), { status });

// Janela de mentira: o window.open do jsdom não abre nada.
type Janela = { location: { href: string }; opener: unknown; close: ReturnType<typeof vi.fn> };
let janela: Janela;
let openSpy: ReturnType<typeof vi.spyOn>;

describe('BookingDetailsPage (cliente) — comprovantes privados (D21)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    addNotification.mockReset();
    BOOKING = reserva();
    apiFetch.mockImplementation(backend);
    janela = { location: { href: '' }, opener: window, close: vi.fn() };
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => janela as unknown as Window);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it('envia o arquivo em FormData (campo "file") para a rota da reserva, sem passar por /upload/image', async () => {
    const file = arquivo('pix.pdf', 'application/pdf');
    await enviarComprovante(file);

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/bookings/XP-1/attachments/upload', expect.anything()));
    const envio = apiFetch.mock.calls.find(([endpoint]) => endpoint === '/bookings/XP-1/attachments/upload');
    expect(envio![1]).toMatchObject({ method: 'POST' });
    const corpo = envio![1].body as FormData;
    expect(corpo.get('file')).toBe(file);
    expect(apiFetch.mock.calls.some(([endpoint]) => endpoint === '/upload/image' || endpoint === '/bookings/XP-1/attachments')).toBe(false);

    // Recarrega a reserva (lista de comprovantes) e não mostra erro.
    await waitFor(() => expect(apiFetch.mock.calls.filter(([endpoint]) => endpoint === '/bookings/XP-1')).toHaveLength(2));
    expect(addNotification).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('aceita JPG, PNG, WebP e PDF e diz a regra na tela', async () => {
    const dialog = await abrirModal();

    expect(within(dialog).getByLabelText('Arquivo')).toHaveAttribute('accept', '.jpg,.jpeg,.png,.webp,.pdf');
    expect(within(dialog).getByText(/JPG, PNG, WebP ou PDF até 10 MB/)).toBeInTheDocument();
  });

  it.each([
    ['acima de 10 MB', arquivo('pix.pdf', 'application/pdf', 10 * 1024 * 1024 + 1), /muito grande/],
    ['GIF', arquivo('pix.gif', 'image/gif'), /não aceito/],
  ])('arquivo %s: aviso na hora, botão Enviar desligado e nada é enviado', async (_caso, file, aviso) => {
    const dialog = await abrirModal();
    fireEvent.change(within(dialog).getByLabelText('Arquivo'), { target: { files: [file] } });

    expect(within(dialog).getByRole('alert')).toHaveTextContent(aviso);
    expect(within(dialog).getByRole('button', { name: /Enviar/ })).toBeDisabled();
    expect(apiFetch.mock.calls.some(([endpoint]) => String(endpoint).includes('/attachments/upload'))).toBe(false);
  });

  it.each([
    ['413 (arquivo grande demais para o servidor)', erroHttp(413, 'Arquivo muito grande (máx. 10 MB).'), 'Arquivo muito grande. Envie JPG, PNG, WebP ou PDF até 10 MB.'],
    ['400 (conteúdo recusado)', erroHttp(400, 'Envie um arquivo JPG, PNG, WebP ou PDF de até 10 MB.'), 'Envie um arquivo JPG, PNG, WebP ou PDF de até 10 MB.'],
    ['429 da cota da conta', erroHttp(429, 'Upload limit exceeded. Try again in 1 hour.'), 'Limite de envios atingido. Tente de novo em 1 hora.'],
    ['429 do limite por IP', erroHttp(429, 'Too many requests, please try again later.'), 'Muitos envios em pouco tempo. Aguarde alguns minutos e tente de novo.'],
    ['500', erroHttp(500, 'Erro interno do servidor'), 'Não foi possível enviar o arquivo. Tente novamente.'],
  ])('envio recusado com %s: mostra a mensagem certa', async (_caso, erro, mensagem) => {
    apiFetch.mockImplementation((endpoint: string, options?: RequestInit) =>
      endpoint === '/bookings/XP-1/attachments/upload' ? Promise.reject(erro) : backend(endpoint, options));

    await enviarComprovante(arquivo('pix.pdf', 'application/pdf'));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: mensagem })));
  });

  it('"Visualizar" abre a janela no clique, antes da espera, pede o link à rota do arquivo e leva a janela até ele', async () => {
    BOOKING = reserva({ attachments: [COMPROVANTE] });
    let entregar: (valor: unknown) => void = () => undefined;
    apiFetch.mockImplementation((endpoint: string, options?: RequestInit) =>
      endpoint.startsWith('/bookings/XP-1/attachments/att-1/file') ? new Promise((resolve) => { entregar = resolve; }) : backend(endpoint, options));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Visualizar' }));

    // A janela já existe (aberta no clique) e o link ainda não chegou.
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith('/bookings/XP-1/attachments/att-1/file');
    expect(janela.location.href).toBe('');

    entregar({ url: LINK, expiresAt: '2026-11-09T12:05:00.000Z' });
    await waitFor(() => expect(janela.location.href).toBe(LINK));
    expect(janela.opener).toBeNull();
  });

  it('"Baixar" pede o link de download (?download=1)', async () => {
    BOOKING = reserva({ attachments: [COMPROVANTE] });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Baixar' }));

    await waitFor(() => expect(janela.location.href).toBe(LINK));
    expect(apiFetch).toHaveBeenCalledWith('/bookings/XP-1/attachments/att-1/file?download=1');
  });

  it('link negado (ou servidor fora do ar): fecha a janela e avisa', async () => {
    BOOKING = reserva({ attachments: [COMPROVANTE] });
    apiFetch.mockImplementation((endpoint: string, options?: RequestInit) =>
      endpoint.startsWith('/bookings/XP-1/attachments/att-1/file') ? Promise.reject(erroHttp(403, 'Acesso negado.')) : backend(endpoint, options));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Visualizar' }));

    await waitFor(() => expect(janela.close).toHaveBeenCalled());
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('a lista não tem link nem imagem com endereço de arquivo', async () => {
    BOOKING = reserva({ attachments: [COMPROVANTE] });
    const { container } = renderPage();

    await screen.findByText('pix.pdf');
    expect(container.querySelector('a[href*="cloudinary"], img[src*="cloudinary"]')).toBeNull();
    expect(container.querySelector('a[download]')).toBeNull();
  });

  it('lixeira: aparece com o pagamento pendente', async () => {
    BOOKING = reserva({ attachments: [COMPROVANTE], paymentStatus: 'PENDING' });
    renderPage();

    expect(await screen.findByRole('button', { name: 'Excluir comprovante pix.pdf' })).toBeInTheDocument();
  });

  it.each(['PAID', 'PARTIAL'])('lixeira: some com o pagamento registrado (%s), e a tela diz por quê', async (paymentStatus) => {
    BOOKING = reserva({ attachments: [COMPROVANTE], paymentStatus });
    renderPage();

    await screen.findByText('pix.pdf');
    expect(screen.queryByRole('button', { name: /Excluir comprovante/ })).not.toBeInTheDocument();
    expect(screen.getByText('Com o pagamento registrado, os comprovantes ficam guardados com a reserva.')).toBeInTheDocument();
  });
});
