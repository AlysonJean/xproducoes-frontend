import { describe, it, expect, vi, afterEach } from 'vitest';
import { api, bookingAPI } from '../api';

// Achado: bookingAPI.updateStatus chamava PATCH /bookings/:id/status, rota que não existe no
// backend (só PUT; o PATCH fica em /admin/bookings) — 404 em todo botão de status da tela de
// detalhe da reserva (Confirmar, Cancelar, A caminho, Concluir), desde a importação inicial.
describe('bookingAPI — rotas de status', () => {
  afterEach(() => vi.restoreAllMocks());

  it('updateStatus usa PUT /bookings/:id/status', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: {} });
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: {} });

    await bookingAPI.updateStatus('b1', 'CONFIRMED');

    expect(put).toHaveBeenCalledWith('/bookings/b1/status', { status: 'CONFIRMED' });
    expect(patch).not.toHaveBeenCalled();
  });

  it('updateDeliveryStatus usa PUT /bookings/:id/delivery-status', async () => {
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: {} });

    await bookingAPI.updateDeliveryStatus('b1', 'ON_THE_WAY');

    expect(put).toHaveBeenCalledWith('/bookings/b1/delivery-status', { status: 'ON_THE_WAY' });
  });
});
