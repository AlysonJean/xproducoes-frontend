import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch, collaboratorsAPI: { getAvailable: vi.fn() } }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));

import { BookingCollaborators } from '../BookingCollaborators';

// Decisão de Alyson (12/11/2026): "Desativar e tirar das escalas futuras" deixa a escala na reserva como cancelada
// (histórico). Em "Colaboradores atribuídos" ela aparecia igual às outras, como se a pessoa ainda estivesse na equipe.
const escala = (id: string, nome: string, status: string) => ({
  id,
  role: 'DJ',
  status,
  startTime: '19:00',
  endTime: '23:00',
  collaborator: { id: `c-${id}`, collaboratorRole: 'DJ', user: { name: nome, email: `${id}@teste.com` } },
});
const cartao = (nome: string) => screen.getByText(nome).closest('.group') as HTMLElement;

describe('BookingCollaborators — escala cancelada com selo (decisão de 12/11/2026)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('a escala cancelada aparece com o selo "Escala cancelada"; as ativas e a concluída, sem', async () => {
    apiFetch.mockResolvedValueOnce([
      escala('a1', 'Bruno Reis', 'CONFIRMED'),
      escala('a2', 'Edu Nunes', 'CANCELLED'),
      escala('a3', 'Gil Rocha', 'COMPLETED'),
    ]);
    render(<BookingCollaborators bookingId="b1" eventDate="2026-12-05T20:00:00.000Z" />);

    await screen.findByText('Edu Nunes');
    expect(apiFetch).toHaveBeenCalledWith('/collaborators/events/b1/collaborators');
    expect(within(cartao('Edu Nunes')).getByText('Escala cancelada')).toBeInTheDocument();
    expect(within(cartao('Bruno Reis')).queryByText('Escala cancelada')).not.toBeInTheDocument();
    expect(within(cartao('Gil Rocha')).queryByText('Escala cancelada')).not.toBeInTheDocument();
    expect(screen.getAllByText('Escala cancelada')).toHaveLength(1);
  });
});
