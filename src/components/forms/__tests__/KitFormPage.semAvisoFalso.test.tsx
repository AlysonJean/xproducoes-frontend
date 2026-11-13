import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
vi.mock('../../../components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import AdminKitListPage from '../../../pages/admin/AdminKitListPage';
import { KitForm } from '../KitFormPage';
import type { Kit } from '../../../types/types';

const CAIXA = { id: 'eq1', name: 'Caixa Ativa', pricePerHour: 100, description: 'Caixa de som', status: 'ACTIVE' };
// O kit ainda tem um nível gravado no banco (dado de antes da auditoria do orçamento): o formulário não o mostra.
const KIT = {
  id: 'kt-1', name: 'Combo Club', slug: 'combo-club', description: 'Caixa e mesa', price: '149.99', imageUrl: 'https://x/a.jpg',
  status: 'ACTIVE', fulfillment: 'DELIVERY_SETUP', minimumRentalDuration: 4, extraHourPrice: '50.00',
  items: [{ id: 'i1', equipmentId: 'eq1', quantity: 1, equipment: CAIXA }],
  experienceLevels: [{ id: 'l1', level: 'GOLD', price: '299.98', description: 'Com montagem', includes: ['Caixas'] }],
};

const backend = (url: string) => {
  if (url === '/kits') return Promise.resolve([KIT]);
  if (url === '/equipments') return Promise.resolve([CAIXA]);
  if (url === '/services') return Promise.resolve([]);
  return Promise.resolve([]);
};

const abrirLista = async () => {
  render(<MemoryRouter><AdminKitListPage /></MemoryRouter>);
  await screen.findByRole('button', { name: 'Editar Combo Club' });
};
const fecharPeloFormulario = () => fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));
// O aviso falso vinha de um efeito depois da montagem: dá tempo aos efeitos antes de fechar (sem isso, o clique
// chegava antes do aviso e o teste passava também no código antigo).
const assentar = () => new Promise((r) => setTimeout(r, 300));
const PERGUNTA = 'Descartar alterações?';

// Conferência de 08/11/2026: fechar a edição do kit sem mudar nada perguntava "Descartar alterações?". O editor de
// níveis avisava o formulário por um efeito que rodava depois de cada render dele, e já ao abrir marcava "alterado".
// Auditoria do orçamento (12/11/2026), O4/B1: o editor de níveis saiu do formulário. Os casos que mudavam um nível
// passam a mudar o nome, e o rascunho antigo (com níveis) volta sem eles, na tela e no envio.
describe('Formulário do kit — "Descartar alterações?" só quando algo mudou', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    apiFetch.mockImplementation(backend);
  });

  it('editar um kit (com nível antigo no banco) e fechar sem mudar nada: fecha sem perguntar', async () => {
    await abrirLista();
    fireEvent.click(screen.getByRole('button', { name: 'Editar Combo Club' }));
    expect(await screen.findByLabelText('Nome do Kit')).toHaveValue('Combo Club');
    await assentar();

    fecharPeloFormulario();

    await waitFor(() => expect(screen.queryByLabelText('Nome do Kit')).not.toBeInTheDocument());
    expect(screen.queryByText(PERGUNTA)).not.toBeInTheDocument();
  });

  it('kit novo aberto e fechado sem preencher: fecha sem perguntar', async () => {
    await abrirLista();
    fireEvent.click(screen.getByRole('button', { name: /Novo kit/ }));
    await screen.findByLabelText('Nome do Kit');
    await assentar();

    fecharPeloFormulario();

    await waitFor(() => expect(screen.queryByLabelText('Nome do Kit')).not.toBeInTheDocument());
    expect(screen.queryByText(PERGUNTA)).not.toBeInTheDocument();
  });

  it('mudar o nome e fechar: pergunta antes de descartar', async () => {
    await abrirLista();
    fireEvent.click(screen.getByRole('button', { name: 'Editar Combo Club' }));
    expect(await screen.findByLabelText('Nome do Kit')).toHaveValue('Combo Club');

    fireEvent.change(screen.getByLabelText('Nome do Kit'), { target: { value: 'Combo Club Plus' } });
    fecharPeloFormulario();

    expect(await screen.findByText(PERGUNTA)).toBeInTheDocument();
  });

  it('rascunho antigo com níveis: volta o resto, sem os níveis na tela nem no envio', async () => {
    localStorage.setItem('xp-draft-kit-kt-1', JSON.stringify({
      savedAt: Date.now(),
      values: {
        name: 'Kit do rascunho', description: 'd', price: 100, items: [{ itemId: 'eq1', quantity: 1, type: 'EQUIPMENT' }], status: 'ACTIVE',
        experienceLevels: [{ level: 'PLATINUM', price: 300, description: 'Nível do rascunho', includes: ['DJ'] }],
        minimumRentalDuration: '', extraHourPrice: '', fulfillment: 'DELIVERY_SETUP',
      },
    }));
    apiFetch.mockImplementation((url: string, init?: { method?: string }) =>
      init?.method === 'PUT' ? Promise.resolve({ id: 'kt-1' }) : backend(url));
    render(<KitForm initialData={KIT as unknown as Kit} onSuccess={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Restaurar' }));

    await waitFor(() => expect(screen.getByLabelText('Nome do Kit')).toHaveValue('Kit do rascunho'));
    expect(screen.queryByText('Platinum')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Nível do rascunho')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

    await waitFor(() => expect(apiFetch.mock.calls.some((c) => c[1]?.method === 'PUT')).toBe(true));
    const body = apiFetch.mock.calls.find((c) => c[1]?.method === 'PUT')![1].body as FormData;
    expect(body.has('experienceLevels')).toBe(false);
    expect(body.get('name')).toBe('Kit do rascunho');
  });
});
