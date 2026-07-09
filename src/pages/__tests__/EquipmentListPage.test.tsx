import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { EquipmentListPage } from '../EquipmentListPage';
import { apiFetch } from '../../services/api';

vi.mock('../../services/api', () => ({
  apiFetch: vi.fn(),
}));

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <EquipmentListPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

// Achado (Fase 3): quando a busca de equipamentos/categorias falhava, a página silenciava o
// erro (só um console.error) e caía no estado de "nenhum equipamento encontrado" — o mesmo
// texto usado para uma busca real sem resultados. O usuário não tinha como saber que algo
// deu errado, e não havia botão de tentar novamente.
describe('EquipmentListPage - estado de erro real (distinto de "nenhum resultado")', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it('mostra uma mensagem de erro real (não o estado de "nenhum equipamento encontrado") quando a busca falha', async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error('Falha de rede'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar equipamentos. Tente novamente.')).toBeInTheDocument();
    });
    expect(screen.queryByText('Nenhum equipamento encontrado')).not.toBeInTheDocument();
  });

  it('o botão de tentar novamente refaz a busca', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error('Falha de rede')).mockResolvedValue([]);

    const user = userEvent.setup();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar equipamentos. Tente novamente.')).toBeInTheDocument();
    });

    const callsBeforeRetry = vi.mocked(apiFetch).mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    await waitFor(() => {
      expect(vi.mocked(apiFetch).mock.calls.length).toBeGreaterThan(callsBeforeRetry);
    });
  });

  it('mostra o estado de "nenhum equipamento encontrado" apenas quando a busca teve sucesso e retornou vazio', async () => {
    vi.mocked(apiFetch).mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Nenhum equipamento encontrado')).toBeInTheDocument();
    });
    expect(screen.queryByText('Erro ao carregar equipamentos. Tente novamente.')).not.toBeInTheDocument();
  });
});
