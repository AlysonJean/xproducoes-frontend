import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import AdminKitListPage from '../../pages/admin/AdminKitListPage';
import { useFormDraft, clearOpenDrafts } from '../useFormDraft';

const CAIXA = { id: 'eq1', name: 'Caixa Ativa', pricePerHour: 100, description: 'Caixa de som', status: 'ACTIVE' };
const RASCUNHO_NOVO = 'xp-draft-kit-new';
const RASCUNHO_DE_OUTRO_KIT = 'xp-draft-kit-kt-9';
const rascunho = (key: string) => localStorage.getItem(key);

const abrirKitNovoEDigitar = async () => {
  render(<MemoryRouter><AdminKitListPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: /Novo kit/ }));
  fireEvent.change(await screen.findByLabelText('Nome do Kit'), { target: { value: 'Kit do rascunho' } });
  // O formulário grava o rascunho 500 ms depois da última mudança.
  await waitFor(() => expect(rascunho(RASCUNHO_NOVO)).toContain('Kit do rascunho'), { timeout: 3000 });
  fireEvent.click(screen.getByRole('button', { name: 'Descartar' })); // botão do formulário: abre o aviso
  await screen.findByText('Descartar alterações?');
};
const botaoDoAviso = (nome: string) => {
  const botoes = screen.getAllByRole('button', { name: nome });
  return botoes[botoes.length - 1]; // o do aviso vem depois do botão "Descartar" do formulário
};

// Conferência de 08/11/2026 (agente do navegador, em produção): "Descartar" fechava a edição e desfazia a mudança,
// mas ao reabrir aparecia "Encontramos um rascunho não salvo de há menos de um minuto": o rascunho continuava
// guardado. Vale para os 12 formulários do painel (o rascunho é do formulário; o aviso, da página).
describe('"Descartar" apaga o rascunho do formulário aberto', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    apiFetch.mockImplementation((url: string) => Promise.resolve(url === '/equipments' ? [CAIXA] : []));
  });

  it('kit novo: "Descartar" no aviso apaga o rascunho, e reabrir não oferece restaurar', async () => {
    localStorage.setItem(RASCUNHO_DE_OUTRO_KIT, JSON.stringify({ savedAt: Date.now(), values: { name: 'Outro' } }));
    await abrirKitNovoEDigitar();

    fireEvent.click(botaoDoAviso('Descartar'));

    await waitFor(() => expect(screen.queryByLabelText('Nome do Kit')).not.toBeInTheDocument());
    expect(rascunho(RASCUNHO_NOVO)).toBeNull();
    expect(rascunho(RASCUNHO_DE_OUTRO_KIT)).not.toBeNull(); // rascunho de formulário fechado fica

    fireEvent.click(screen.getByRole('button', { name: /Novo kit/ }));
    await screen.findByLabelText('Nome do Kit');
    expect(screen.queryByRole('button', { name: 'Restaurar' })).not.toBeInTheDocument();
  });

  it('"Continuar Editando" mantém o rascunho e a edição', async () => {
    await abrirKitNovoEDigitar();

    fireEvent.click(botaoDoAviso('Continuar Editando'));

    expect(screen.getByLabelText('Nome do Kit')).toHaveValue('Kit do rascunho');
    expect(rascunho(RASCUNHO_NOVO)).toContain('Kit do rascunho');
  });

  it('clearOpenDrafts apaga só os rascunhos de formulários abertos', () => {
    localStorage.setItem('xp-draft-a', '{"savedAt":1,"values":{}}');
    localStorage.setItem('xp-draft-b', '{"savedAt":1,"values":{}}');
    const aberto = renderHook(() => useFormDraft('xp-draft-a'));
    const fechado = renderHook(() => useFormDraft('xp-draft-b'));
    fechado.unmount();

    clearOpenDrafts();

    expect(localStorage.getItem('xp-draft-a')).toBeNull();
    expect(localStorage.getItem('xp-draft-b')).not.toBeNull();
    aberto.unmount();
  });
});
