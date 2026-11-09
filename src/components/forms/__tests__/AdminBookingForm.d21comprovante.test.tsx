import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Booking } from '../../../types/types';

const { apiFetch, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));

import { AdminBookingForm } from '../AdminBookingForm';

const KIT = { id: 'kit00000000000000000001', name: 'Kit Som', price: 100 };
const EVENTO: Array<[string, string]> = [
  ['Início', '2027-01-10T18:00'],
  ['Término', '2027-01-10T23:00'],
  ['Local', 'Espaço VIP'],
  ['Rua', 'Av. Brasil'],
  ['Bairro', 'Centro'],
  ['Cidade', 'Belo Horizonte'],
  ['Estado', 'MG'],
  ['CEP', '30110-000'],
  ['Número', '123'],
];
const preencher = (campos: Array<[string, string]>) => {
  for (const [label, value] of campos) fireEvent.change(screen.getByLabelText(label), { target: { value } });
};
const escolherComprovante = (file: File) =>
  fireEvent.change(screen.getByLabelText('Comprovante de Pagamento'), { target: { files: [file] } });
const pdf = () => new File(['%PDF-1.7'], 'pix-sinal.pdf', { type: 'application/pdf' });

const chamadas = () => apiFetch.mock.calls.map(([url, opts]) => ({ url: url as string, method: (opts?.method ?? 'GET') as string, body: opts?.body }));

const RESERVA = {
  id: 'XP-DIGITADO', eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T02:00:00.000Z',
  clientId: null, client: null, clientName: 'Ana Souza', clientContact: '31988887777', clientEmail: 'ana@cliente.test',
  location: 'Espaço VIP', street: 'Av. Brasil', neighborhood: 'Centro', city: 'Belo Horizonte', state: 'MG', zipCode: '30110-000', addressNumber: '123',
  status: 'CONFIRMED', deliveryStatus: 'PENDING', totalPrice: 500,
} as unknown as Booking;

// D21 (aprovada em 02/11/2026): o comprovante do formulário subia por /upload/image (público, link eterno), ia
// como paymentProofUrl no corpo da reserva e o PDF era recusado sem aviso ("A reserva será criada sem o
// comprovante"). Agora vira anexo privado da reserva, enviado depois que ela é salva, com os 4 tipos aceitos.
describe('AdminBookingForm — comprovante de pagamento vira anexo privado (D21)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url.endsWith('/attachments/upload') && opts?.method === 'POST') return Promise.resolve({ id: 'att-1' });
      if (opts?.method === 'POST' || opts?.method === 'PUT') return Promise.resolve({ id: 'XP-NOVA' });
      if (url === '/kits') return Promise.resolve([KIT]);
      return Promise.resolve([]);
    });
  });

  it('o campo aceita só JPG, PNG, WebP e PDF e diz a regra', async () => {
    render(<AdminBookingForm defaultClientType="manual" onSuccess={vi.fn()} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Criar reserva' });

    const campo = screen.getByLabelText('Comprovante de Pagamento');
    expect(campo).toHaveAttribute('accept', '.jpg,.jpeg,.png,.webp,.pdf');
    expect(screen.getByText(/JPG, PNG, WebP ou PDF até 10 MB/)).toBeInTheDocument();
  });

  it('nova reserva com comprovante em PDF: cria a reserva sem paymentProofUrl e depois envia o arquivo à rota da reserva criada', async () => {
    const onSuccess = vi.fn();
    render(<AdminBookingForm defaultClientType="manual" onSuccess={onSuccess} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Criar reserva' });
    preencher([['Nome do Cliente', 'Ana Souza'], ['Contato', '31988887777'], ['Kit', KIT.id], ...EVENTO]);
    const file = pdf();
    escolherComprovante(file);

    fireEvent.click(screen.getByRole('button', { name: 'Criar reserva' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const gravacoes = chamadas().filter((c) => c.method !== 'GET');
    expect(gravacoes.map((c) => `${c.method} ${c.url}`)).toEqual(['POST /bookings', 'POST /bookings/XP-NOVA/attachments/upload']);
    expect(JSON.parse(gravacoes[0].body as string)).not.toHaveProperty('paymentProofUrl');
    expect((gravacoes[1].body as FormData).get('file')).toBe(file);
    expect(chamadas().some((c) => c.url === '/upload/image')).toBe(false);
  });

  it('edição com comprovante: salva a reserva e envia o arquivo para ela', async () => {
    const onSuccess = vi.fn();
    render(<AdminBookingForm initialData={RESERVA} onSuccess={onSuccess} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Salvar alterações' });
    escolherComprovante(pdf());

    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    const gravacoes = chamadas().filter((c) => c.method !== 'GET');
    expect(gravacoes.map((c) => `${c.method} ${c.url}`)).toEqual(['PUT /bookings/XP-DIGITADO', 'POST /bookings/XP-DIGITADO/attachments/upload']);
    expect(JSON.parse(gravacoes[0].body as string)).not.toHaveProperty('paymentProofUrl');
  });

  it.each([
    ['GIF', new File(['gif'], 'pix.gif', { type: 'image/gif' })],
    ['acima de 10 MB', (() => {
      const grande = pdf();
      Object.defineProperty(grande, 'size', { value: 10 * 1024 * 1024 + 1 });
      return grande;
    })()],
  ])('comprovante %s: nada é salvo e a tela diz a regra', async (_caso, file) => {
    const onSuccess = vi.fn();
    render(<AdminBookingForm initialData={RESERVA} onSuccess={onSuccess} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Salvar alterações' });
    escolherComprovante(file);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText(/Comprovante de pagamento: .*JPG, PNG, WebP ou PDF até 10 MB/)).toBeInTheDocument();
    expect(chamadas().filter((c) => c.method !== 'GET')).toEqual([]);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('o envio do comprovante falha depois de salvar: a reserva fica salva e o aviso diz onde anexar', async () => {
    apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url.endsWith('/attachments/upload')) return Promise.reject(Object.assign(new Error('Upload limit exceeded. Try again in 1 hour.'), { status: 429 }));
      if (opts?.method === 'PUT') return Promise.resolve({ id: 'XP-DIGITADO' });
      return Promise.resolve([]);
    });
    const onSuccess = vi.fn();
    render(<AdminBookingForm initialData={RESERVA} onSuccess={onSuccess} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Salvar alterações' });
    escolherComprovante(pdf());

    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error',
      title: 'Comprovante não enviado',
      message: expect.stringContaining('Anexos e comprovantes'),
    }));
  });
});
