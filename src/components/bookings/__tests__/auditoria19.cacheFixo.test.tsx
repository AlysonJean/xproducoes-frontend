import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const { apiFetch, getAvailable, addNotification } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  getAvailable: vi.fn(),
  addNotification: vi.fn(),
}));
vi.mock('../../../services/api', () => ({ apiFetch, collaboratorsAPI: { getAvailable } }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));

import { BookingCollaborators } from '../BookingCollaborators';

// Auditoria completa (19/11/2026): o "Cachê Fixo (Opcional)" usava valueAsNumber; em branco, virava NaN e o zod recusava
// ("Expected number, received nan"): não dava para escalar ninguém sem cachê. O branco agora é "sem cachê" (undefined).
const BRUNO = { id: 'c1', user: { name: 'Bruno Reis' }, collaboratorRole: 'DJ', specialties: [] };
const corpoDoPost = () => {
  const call = apiFetch.mock.calls.find(([url, init]) => url === '/collaborators/event-assignments' && init?.method === 'POST');
  return call ? JSON.parse(call[1].body as string) : undefined;
};

const abrirEscolher = async () => {
  render(<BookingCollaborators bookingId="b1" eventDate="2026-12-05T20:00:00.000Z" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Adicionar' }));
  const janela = await screen.findByRole('dialog', { name: 'Atribuir Colaborador' });
  await within(janela).findByRole('option', { name: 'Bruno Reis — DJ' });
  fireEvent.change(within(janela).getByLabelText('Colaborador'), { target: { value: 'c1' } });
  await waitFor(() => expect((within(janela).getByLabelText('Função no evento') as HTMLSelectElement).value).toBe('DJ'));
  return janela;
};

describe('BookingCollaborators — "Cachê Fixo" opcional (auditoria de 19/11/2026)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.mockImplementation(async (url: string) => {
      if (url === '/collaborators/search?limit=100') return [BRUNO];
      if (url === '/collaborators/events/b1/collaborators') return [];
      return {};
    });
    getAvailable.mockResolvedValue({ data: [{ id: 'c1' }] });
  });

  it('cachê em branco: a escala é gravada, sem fixedRate', async () => {
    const janela = await abrirEscolher();
    expect((within(janela).getByLabelText('Cachê Fixo (Opcional)') as HTMLInputElement).value).toBe('');

    fireEvent.click(within(janela).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(corpoDoPost()).toBeDefined());
    expect(corpoDoPost()).toEqual({ bookingId: 'b1', collaboratorId: 'c1', role: 'DJ', startTime: '14:00', endTime: '18:00' });
    expect(within(janela).queryByText(/expected number|nan/i)).not.toBeInTheDocument();
    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' })));
  });

  it('cachê preenchido: vai como número', async () => {
    const janela = await abrirEscolher();
    fireEvent.change(within(janela).getByLabelText('Cachê Fixo (Opcional)'), { target: { value: '150.5' } });

    fireEvent.click(within(janela).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => expect(corpoDoPost()).toBeDefined());
    expect(corpoDoPost()).toEqual({ bookingId: 'b1', collaboratorId: 'c1', role: 'DJ', startTime: '14:00', endTime: '18:00', fixedRate: 150.5 });
  });
});
