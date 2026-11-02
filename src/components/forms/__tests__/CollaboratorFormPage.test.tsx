import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/services/api', () => ({
  apiFetch,
  collaboratorFunctionsAPI: { getAll: vi.fn().mockResolvedValue({ data: [] }) },
}));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));

import { CollaboratorForm } from '../CollaboratorFormPage';

// Achado (revisão antes do deploy): o formulário gravava em /admin/collaborators, rota que o backend
// nunca teve (404 em todo "Salvar") — as rotas reais, só de admin, são POST/PUT /collaborators. E
// sem função personalizada escolhida ia functionId: '', que a validação de id do backend recusa.
const sentBody = () => JSON.parse(apiFetch.mock.calls[0][1].body as string);

describe('CollaboratorForm — grava nas rotas reais', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiFetch.mockResolvedValue({});
    localStorage.clear();
  });

  it('editar (aprovar um cadastro pendente): PUT /collaborators/:id, sem functionId vazio', async () => {
    const onSuccess = vi.fn();
    render(
      <CollaboratorForm
        initialData={{ id: 'c1', name: 'Ana Lima', email: 'ana@teste.com', role: 'DJ', functionId: '', hourlyRate: '80', status: 'PENDING_APPROVAL' }}
        onSuccess={onSuccess}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'ACTIVE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(apiFetch).toHaveBeenCalledWith('/collaborators/c1', expect.objectContaining({ method: 'PUT' }));
    expect(sentBody()).toEqual({ name: 'Ana Lima', email: 'ana@teste.com', role: 'DJ', hourlyRate: 80, status: 'ACTIVE' });
  });

  it('criar: POST /collaborators, sem functionId vazio', async () => {
    const onSuccess = vi.fn();
    render(<CollaboratorForm onSuccess={onSuccess} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Bia Souza' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bia@teste.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar Colaborador' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(apiFetch).toHaveBeenCalledWith('/collaborators', expect.objectContaining({ method: 'POST' }));
    expect(sentBody()).toEqual({ name: 'Bia Souza', email: 'bia@teste.com', role: 'OTHER', status: 'ACTIVE' });
  });
});
