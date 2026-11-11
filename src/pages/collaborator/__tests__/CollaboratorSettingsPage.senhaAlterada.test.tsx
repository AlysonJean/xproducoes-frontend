import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

// D17 (aprovada em 02/11/2026): "aviso na tela e e-mail quando a senha muda". A troca de senha encerra as outras
// sessões da conta (o servidor grava a marca também no banco); a tela diz isso, em vez de só "Senha alterada com
// sucesso!".
const { changePassword, addNotification, getMyProfile, getSettings } = vi.hoisted(() => ({
  changePassword: vi.fn(),
  addNotification: vi.fn(),
  getMyProfile: vi.fn(),
  getSettings: vi.fn(),
}));
vi.mock('../../../services/api', () => ({
  collaboratorProfileAPI: { getMyProfile, getSettings, updateSettings: vi.fn(), updateProfile: vi.fn() },
  authAPI: { updateProfile: vi.fn(), changePassword },
}));
vi.mock('../../../components/collaborator/CollaboratorLayout', () => ({
  CollaboratorLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));

import CollaboratorSettingsPage from '../CollaboratorSettingsPage';

beforeEach(() => {
  vi.clearAllMocks();
  getMyProfile.mockResolvedValue({ data: { data: { phone: '', specialties: [], user: { name: 'Eu', email: 'eu@x.test' } } } });
  getSettings.mockResolvedValue({ data: {} });
  changePassword.mockResolvedValue({ data: { success: true } });
});

describe('Configurações do colaborador — troca de senha (D17)', () => {
  it('depois de trocar a senha, avisa que as outras sessões foram encerradas', async () => {
    render(<MemoryRouter><CollaboratorSettingsPage /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('tab', { name: /Segurança/ }));
    fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: 'Atual123' } });
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'Nova1234' } });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'Nova1234' } });
    fireEvent.click(screen.getByRole('button', { name: /Alterar senha/ }));

    await waitFor(() =>
      expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        message: 'Senha alterada. Por segurança, saímos das suas outras sessões.',
      })),
    );
    expect(changePassword).toHaveBeenCalledWith('Atual123', 'Nova1234');
  });

  it('se a troca falha, não diz que a senha mudou', async () => {
    changePassword.mockRejectedValue(new Error('Senha atual incorreta'));
    render(<MemoryRouter><CollaboratorSettingsPage /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('tab', { name: /Segurança/ }));
    fireEvent.change(screen.getByLabelText('Senha atual'), { target: { value: 'Errada123' } });
    fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'Nova1234' } });
    fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: 'Nova1234' } });
    fireEvent.click(screen.getByRole('button', { name: /Alterar senha/ }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' })));
    expect(addNotification).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });
});
