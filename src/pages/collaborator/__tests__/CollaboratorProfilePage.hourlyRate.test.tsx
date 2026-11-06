import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { collaboratorProfileAPI, addNotification } = vi.hoisted(() => ({
  collaboratorProfileAPI: { getMyProfile: vi.fn(), updateProfile: vi.fn(), uploadAvatar: vi.fn() },
  addNotification: vi.fn(),
}));
vi.mock('../../../services/api', () => ({ collaboratorProfileAPI }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../components/collaborator/CollaboratorLayout', () => ({
  CollaboratorLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('../../../components/collaborator/CollaboratorStates', () => ({
  CollaboratorLoading: () => <p>Carregando perfil…</p>,
  CollaboratorError: ({ message }: { message: string }) => <p>{message}</p>,
}));
vi.mock('../../../components/GoogleCalendarIntegration', () => ({ GoogleCalendarIntegration: () => null }));

import CollaboratorProfilePage from '../CollaboratorProfilePage';

// Q2 (02/11/2026) e D3: o valor por hora é remuneração combinada, então só a administração define. O
// perfil do colaborador tinha um campo editável "Valor por hora (R$)" e mandava o valor digitado ao salvar
// (PUT /collaborators/me/profile); agora o valor aparece só para leitura, e o pedido não leva o campo.
const perfil = {
  user: { name: 'Ana Lima', email: 'ana@teste.com' },
  collaboratorRole: 'DJ',
  hourlyRate: '45',
  phone: '31988887777',
  workingRadius: 30,
  languages: [],
  specialties: [],
  equipment: [],
  certifications: [],
};
const ROTULO = 'Valor por hora (definido pela administração)';

const abrirPerfil = async () => {
  render(<MemoryRouter><CollaboratorProfilePage /></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Ana Lima' });
};
const abrirDadosProfissionais = () => fireEvent.click(screen.getByRole('tab', { name: 'Dados profissionais' }));

describe('CollaboratorProfilePage — valor por hora só para leitura (Q2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collaboratorProfileAPI.getMyProfile.mockResolvedValue({ data: perfil });
    collaboratorProfileAPI.updateProfile.mockResolvedValue({ data: {} });
  });

  it('na edição não há campo de valor por hora: o valor aparece para leitura, definido pela administração', async () => {
    await abrirPerfil();
    fireEvent.click(screen.getByRole('button', { name: 'Editar perfil' }));
    abrirDadosProfissionais();

    expect(screen.queryByLabelText(/valor por hora/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Raio de atuação (km)')).toBeInTheDocument();
    expect(screen.getByText(ROTULO).nextElementSibling).toHaveTextContent(/R\$\s*45,00/);
  });

  it('salvar o perfil não manda valor por hora (antes mandava o digitado)', async () => {
    await abrirPerfil();
    fireEvent.click(screen.getByRole('button', { name: 'Editar perfil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(collaboratorProfileAPI.updateProfile).toHaveBeenCalledTimes(1));
    const corpo = collaboratorProfileAPI.updateProfile.mock.calls[0][0];
    expect(corpo).not.toHaveProperty('hourlyRate');
    expect(corpo).toMatchObject({ phone: '31988887777', workingRadius: 30 });
  });

  it('sem valor definido: "Ainda não definido" (antes: R$ 0,00, como se fosse zero)', async () => {
    collaboratorProfileAPI.getMyProfile.mockResolvedValue({ data: { ...perfil, hourlyRate: null } });
    await abrirPerfil();
    abrirDadosProfissionais();

    expect(screen.getByText(ROTULO).nextElementSibling).toHaveTextContent('Ainda não definido');
    expect(screen.queryByText(/R\$\s*0,00\/h/)).not.toBeInTheDocument();
  });
});
