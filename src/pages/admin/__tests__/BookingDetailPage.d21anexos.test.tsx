import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { bookingAPI, api, apiFetch, addNotification } = vi.hoisted(() => ({
  bookingAPI: { getById: vi.fn(), updateStatus: vi.fn(), updateDeliveryStatus: vi.fn(), delete: vi.fn(), confirmWithDetails: vi.fn() },
  api: { post: vi.fn(), delete: vi.fn() },
  apiFetch: vi.fn(),
  addNotification: vi.fn(),
}));
vi.mock('../../../services/api', () => ({ bookingAPI, api, apiFetch }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));
vi.mock('@/hooks/useCollaborators', () => ({ useCollaborators: () => ({ collaborators: [], fetchCollaborators: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: () => null }));
vi.mock('@/components/bookings/BookingCollaborators', () => ({ BookingCollaborators: () => null }));
vi.mock('@/components/bookings/BookingFinancialSummary', () => ({ BookingFinancialSummary: () => null }));
vi.mock('../../../components/modals/EventManagement', () => ({ EventManagement: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import BookingDetailPage from '../BookingDetailPage';

// D21 (aprovada em 02/11/2026): a ficha recebe os anexos sem endereço de arquivo (id, nome, tipo e data). Antes
// mostrava miniaturas <img src> com a URL pública do Cloudinary e subia os arquivos por /upload/image (públicos).
const RESERVA = {
  id: 'XP-ANA-20270110', status: 'CONFIRMED', deliveryStatus: 'PENDING', totalPrice: '1350.00',
  eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T02:00:00.000Z', location: 'Espaço VIP',
  clientId: null, client: null, clientName: 'Ana Souza', clientContact: '31988887777', clientEmail: 'ana@cliente.test',
  attachments: [
    { id: 'att-1', filename: 'pix-sinal.pdf', mimeType: 'application/pdf', createdAt: '2026-11-08T12:00:00.000Z' },
    { id: 'att-2', filename: 'contrato.jpg', mimeType: 'image/jpeg', createdAt: '2026-11-07T12:00:00.000Z' },
  ],
  equipments: [], services: [], eventCollaborators: [],
};
const LINK = 'https://api.cloudinary.com/v1_1/demo/image/download?public_id=x&signature=abc';

const renderFicha = async () => {
  bookingAPI.getById.mockResolvedValue({ data: RESERVA });
  const utils = render(
    <MemoryRouter initialEntries={['/admin/reservas/XP']}>
      <Routes><Route path="/admin/reservas/:id" element={<BookingDetailPage />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: /^Reserva / });
  return utils;
};

type Janela = { location: { href: string }; opener: unknown; close: ReturnType<typeof vi.fn> };
let janela: Janela;
let openSpy: ReturnType<typeof vi.spyOn>;

describe('BookingDetailPage (admin) — anexos privados (D21)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    janela = { location: { href: '' }, opener: window, close: vi.fn() };
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => janela as unknown as Window);
    apiFetch.mockImplementation((endpoint: string, options?: RequestInit) => {
      if (endpoint.endsWith('/attachments/upload') && options?.method === 'POST') return Promise.resolve({ id: 'att-novo' });
      if (endpoint.endsWith('/file')) return Promise.resolve({ url: LINK, expiresAt: '2026-11-09T12:05:00.000Z' });
      return Promise.reject(new Error(`rota inesperada: ${endpoint}`));
    });
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it('lista os anexos com ícone, nome e "Abrir": nenhuma <img> nem link com endereço do Cloudinary', async () => {
    const { container } = await renderFicha();

    expect(screen.getByText('pix-sinal.pdf')).toBeInTheDocument();
    expect(screen.getByText('contrato.jpg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir pix-sinal.pdf' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir contrato.jpg' })).toBeInTheDocument();
    expect(container.querySelector('img[src*="cloudinary"], a[href*="cloudinary"]')).toBeNull();
    expect(screen.queryByRole('img', { name: 'pix-sinal.pdf' })).not.toBeInTheDocument();
    // Revisão do D21: o colaborador (a equipe do evento) recebe 403 na rota do arquivo; a regra na tela diz quem abre.
    expect(screen.getByText(/Só o admin e o cliente da reserva abrem\./)).toBeInTheDocument();
    expect(screen.queryByText(/Só a equipe/)).not.toBeInTheDocument();
  });

  it('"Abrir" abre a janela no clique e a leva ao link de 5 minutos que a rota do arquivo devolve', async () => {
    await renderFicha();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir pix-sinal.pdf' }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith(`/bookings/${RESERVA.id}/attachments/att-1/file`);
    await waitFor(() => expect(janela.location.href).toBe(LINK));
  });

  it('"Anexar arquivo" envia cada arquivo à rota da reserva (campo "file"), sem /upload/image', async () => {
    const { container } = await renderFicha();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toHaveAttribute('accept', '.jpg,.jpeg,.png,.webp,.pdf');
    const pdf = new File(['%PDF-1.7'], 'nota.pdf', { type: 'application/pdf' });
    const foto = new File(['jpg'], 'foto.jpg', { type: 'image/jpeg' });

    fireEvent.change(input, { target: { files: [pdf, foto] } });

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' })));
    const envios = apiFetch.mock.calls.filter(([endpoint]) => endpoint === `/bookings/${RESERVA.id}/attachments/upload`);
    expect(envios.map(([, options]) => (options.body as FormData).get('file'))).toEqual([pdf, foto]);
    expect(api.post).not.toHaveBeenCalled();
    expect(bookingAPI.getById).toHaveBeenCalledTimes(2); // recarrega a ficha com os anexos novos
  });

  it('arquivo de tipo não aceito (vídeo) não é enviado e a tela diz a regra', async () => {
    const { container } = await renderFicha();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [new File(['mp4'], 'evento.mp4', { type: 'video/mp4' })] } });

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error',
      message: 'Tipo de arquivo não aceito. Envie JPG, PNG, WebP ou PDF até 10 MB.',
    })));
    expect(apiFetch.mock.calls.some(([endpoint]) => String(endpoint).endsWith('/attachments/upload'))).toBe(false);
  });
});
