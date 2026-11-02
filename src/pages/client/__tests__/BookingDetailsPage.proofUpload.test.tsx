import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { apiFetch, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'CLIENT' } }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../components/client/BookingChatPanel', () => ({ BookingChatPanel: () => null }));
vi.mock('../../../utils/generateBookingProposalPdf', () => ({ generateBookingProposalPdf: vi.fn() }));

import { BookingDetailsPage } from '../BookingDetailsPage';

const BOOKING = {
  id: 'XP-1',
  status: 'PENDING',
  eventDate: '2026-12-10T22:00:00.000Z',
  totalPrice: '1200',
  attachments: [],
  eventCollaborators: [],
};
const URL_CLOUDINARY = 'https://res.cloudinary.com/demo/image/upload/v1/x-producoes/bookings/pix.png';

// Responde como o backend: /upload/image devolve a URL (já desembrulhada pelo apiFetch);
// /bookings/:id/attachments só aceita JSON com `url` — FormData ali é o 400 de produção.
function backend(endpoint: string, options?: RequestInit) {
  if (endpoint === '/bookings/XP-1' && !options?.method) return Promise.resolve(BOOKING);
  if (endpoint === '/upload/image' && options?.method === 'POST' && options.body instanceof FormData) {
    return Promise.resolve({ imageUrl: URL_CLOUDINARY });
  }
  if (endpoint === '/bookings/XP-1/attachments' && options?.method === 'POST') {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : null;
    if (!body?.url) return Promise.reject(new Error('URL do arquivo é obrigatória.'));
    return Promise.resolve({ id: 'att-1', ...body });
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

async function enviarComprovante(file: File) {
  renderPage();
  fireEvent.click(await screen.findByRole('button', { name: 'Adicionar' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Arquivo'), { target: { files: [file] } });
  fireEvent.click(within(dialog).getByRole('button', { name: /Enviar/ }));
}

// Achado (auditoria ponta a ponta): "Adicionar comprovante" mandava o arquivo (FormData 'file') direto
// para POST /bookings/:id/attachments, que só aceita JSON com a URL de um arquivo já enviado — todo
// comprovante do cliente voltava 400 e nunca chegava à empresa (nem ao aviso por e-mail do dono).
describe('BookingDetailsPage (cliente) — envio de comprovante', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    addNotification.mockReset();
    apiFetch.mockImplementation(backend);
  });

  it('sobe a imagem em /upload/image e anexa a URL devolvida em JSON, como o painel admin', async () => {
    const file = new File(['png'], 'pix.png', { type: 'image/png' });
    await enviarComprovante(file);

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/bookings/XP-1/attachments', expect.anything()));
    const upload = apiFetch.mock.calls.find(([endpoint]) => endpoint === '/upload/image');
    expect(upload).toBeDefined();
    const enviado = upload![1].body as FormData;
    expect(enviado.get('image')).toBe(file);
    expect(enviado.get('folder')).toBe('bookings');

    const anexo = apiFetch.mock.calls.find(([endpoint]) => endpoint === '/bookings/XP-1/attachments');
    expect(anexo![1]).toMatchObject({ method: 'POST' });
    expect(JSON.parse(anexo![1].body as string)).toEqual({ url: URL_CLOUDINARY, filename: 'pix.png', mimeType: 'image/png' });

    // Recarrega a reserva (lista de comprovantes) e não mostra erro.
    await waitFor(() => expect(apiFetch.mock.calls.filter(([endpoint]) => endpoint === '/bookings/XP-1')).toHaveLength(2));
    expect(addNotification).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('só oferece imagem (JPG ou PNG): /upload/image recusa PDF', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar' }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByLabelText('Arquivo')).toHaveAttribute('accept', '.jpg,.jpeg,.png');
    expect(within(dialog).queryByText(/PDF/)).not.toBeInTheDocument();
  });

  it.each([
    ['upload recusado', () => Promise.reject(new Error('Arquivo muito grande.'))],
    ['upload sem URL na resposta', () => Promise.resolve({})],
  ])('%s: mostra o erro e não tenta anexar', async (_caso, respostaDoUpload) => {
    apiFetch.mockImplementation((endpoint: string, options?: RequestInit) =>
      endpoint === '/upload/image' ? respostaDoUpload() : backend(endpoint, options));

    await enviarComprovante(new File(['png'], 'pix.png', { type: 'image/png' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' })));
    expect(apiFetch).not.toHaveBeenCalledWith('/bookings/XP-1/attachments', expect.anything());
  });

  // /upload tem teto de 3 envios por hora por IP; o 429 traz "Upload limit exceeded. Try again in 1 hour."
  it('teto de envios atingido: diz para esperar 1 hora, não para tentar de novo', async () => {
    apiFetch.mockImplementation((endpoint: string, options?: RequestInit) =>
      endpoint === '/upload/image'
        ? Promise.reject(new Error('Upload limit exceeded. Try again in 1 hour.'))
        : backend(endpoint, options));

    await enviarComprovante(new File(['png'], 'pix.png', { type: 'image/png' }));

    await waitFor(() =>
      expect(addNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', message: 'Limite de envios atingido. Tente de novo em 1 hora.' })
      )
    );
    expect(apiFetch).not.toHaveBeenCalledWith('/bookings/XP-1/attachments', expect.anything());
  });
});
