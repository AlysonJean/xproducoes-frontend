import { describe, it, expect, vi, afterEach } from 'vitest';
import { api, bookingAPI } from '../api';

// D11 (aprovada em 02/11/2026): na ficha da reserva, os botões de status ("Confirmar e avisar pelo WhatsApp")
// confirmam por bookingAPI.updateStatus. Com "Avisar o cliente por e-mail" desmarcada, o notifyClient: false
// precisa chegar ao PUT; sem ele, o servidor manda o e-mail ao cliente mesmo com a caixa desmarcada.
describe('bookingAPI.updateStatus — "Avisar o cliente por e-mail" (D11)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('leva o notifyClient: false da caixa desmarcada no corpo do PUT', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: {} });

    await bookingAPI.updateStatus('b1', 'CONFIRMED', { notifyClient: false });

    expect(put).toHaveBeenCalledWith('/bookings/b1/status', { status: 'CONFIRMED', notifyClient: false });
  });

  it('sem a caixa (outros status, ou caixa marcada), o corpo fica como antes', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: {} });

    await bookingAPI.updateStatus('b1', 'CANCELLED');
    await bookingAPI.updateStatus('b1', 'CONFIRMED', {});

    expect(put).toHaveBeenNthCalledWith(1, '/bookings/b1/status', { status: 'CANCELLED' });
    expect(put).toHaveBeenNthCalledWith(2, '/bookings/b1/status', { status: 'CONFIRMED' });
  });
});
