import { useState, type ComponentProps } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { apiFetch, addNotification, getFunctions, onSuccess } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  addNotification: vi.fn(),
  getFunctions: vi.fn(),
  onSuccess: vi.fn(),
}));
vi.mock('@/services/api', () => ({
  apiFetch,
  collaboratorFunctionsAPI: { getAll: getFunctions },
}));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));

import { ModalProvider } from '@/components/modals/ModalContext';
import { CollaboratorForm } from '../CollaboratorFormPage';

// Decisão de Alyson (12/11/2026): o acesso só muda por "Desativar acesso" e "Reativar", na lista da equipe, que mexem
// na conta e no cadastro juntos. Pelo status "Inativo" deste formulário, a pessoa saía das escalas sem perder o acesso
// (e o servidor agora recusa essa troca). Quem já está sem acesso continua editável, com o status mantido.
const sentBody = () => JSON.parse(apiFetch.mock.calls[0][1].body as string);
const opcoesDoStatus = () => Array.from((screen.getByLabelText('Status') as HTMLSelectElement).options).map((o) => [o.value, o.textContent]);

function Tela({ initialData }: { initialData?: ComponentProps<typeof CollaboratorForm>['initialData'] }) {
  const [aberto, setAberto] = useState(true);
  return (
    <ModalProvider>
      {aberto && (
        <CollaboratorForm initialData={initialData} onSuccess={() => { onSuccess(); setAberto(false); }} onCancel={vi.fn()} />
      )}
    </ModalProvider>
  );
}

describe('CollaboratorForm — sem "Inativo" no status (decisão de 12/11/2026)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.mockResolvedValue({});
    getFunctions.mockResolvedValue({ data: [] });
    localStorage.clear();
  });

  it('cadastro novo e edição de quem tem acesso: Ativo, Pendente e Suspenso; "Inativo" não aparece', () => {
    const { unmount } = render(<Tela />);
    expect(opcoesDoStatus()).toEqual([['ACTIVE', 'Ativo'], ['PENDING_APPROVAL', 'Pendente'], ['SUSPENDED', 'Suspenso']]);
    unmount();

    render(<Tela initialData={{ id: 'c1', name: 'Ana Lima', email: 'ana@teste.com', role: 'DJ', status: 'ACTIVE' }} />);
    expect(opcoesDoStatus()).toEqual([['ACTIVE', 'Ativo'], ['PENDING_APPROVAL', 'Pendente'], ['SUSPENDED', 'Suspenso']]);
  });

  it('quem está sem acesso: o status aparece como texto, com o caminho ("Reativar"); salvar outra mudança manda o mesmo status', async () => {
    render(<Tela initialData={{ id: 'c4', name: 'Edu Nunes', email: 'edu@teste.com', phone: null, role: 'OTHER', functionId: null, hourlyRate: null, status: 'INACTIVE' }} />);

    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
    expect(screen.getByText('Inativo: o acesso está desativado. Para devolver o acesso, use “Reativar” na lista da equipe.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '31999990000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(apiFetch).toHaveBeenCalledWith('/collaborators/c4', expect.objectContaining({ method: 'PUT' }));
    expect(sentBody()).toEqual({ name: 'Edu Nunes', email: 'edu@teste.com', phone: '31999990000', role: 'OTHER', status: 'INACTIVE' });
  });
});
