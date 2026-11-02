import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';

const { apiFetch, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { ContactSubmissionsListPage } from '../ContactSubmissionsListPage';

// Achado (auditoria ponta a ponta): a tela /admin/contatos lia `sub.status` ('PENDING'/'READ'),
// campo que a API nunca mandou — GET /admin/contacts devolve o modelo Contact, com `isRead`.
// Toda mensagem aparecia como "Lida", "Não lidas" ficava em 0, "Marcar Lida" nunca aparecia e os
// filtros de situação esvaziavam a lista.

// Linhas como o backend devolve (prisma/schema.prisma, modelo Contact): isRead boolean, sem status.
type Linha = { id: string; name: string; email: string; message: string; isRead: boolean; createdAt: string };
let banco: Linha[] = [];

// A API de verdade (adminRoutes.ts → contactController): só estas rotas e métodos existem. O que
// não bate com elas, ou um id que não está no banco, falha como o apiFetch falha num 404.
const apiReal = (url: string, options: RequestInit = {}) => {
  const metodo = (options.method || 'GET').toUpperCase();
  if (metodo === 'GET' && url === '/admin/contacts') return Promise.resolve(banco.map((linha) => ({ ...linha })));
  const marcar = url.match(/^\/admin\/contacts\/([^/]+)\/read$/);
  if (metodo === 'PATCH' && marcar) {
    const linha = banco.find((l) => l.id === marcar[1]);
    if (!linha) return Promise.reject(new Error('Registro não encontrado'));
    linha.isRead = true;
    return Promise.resolve({ ...linha });
  }
  const apagar = url.match(/^\/admin\/contacts\/([^/]+)$/);
  if (metodo === 'DELETE' && apagar) {
    if (!banco.some((l) => l.id === apagar[1])) return Promise.reject(new Error('Registro não encontrado'));
    banco = banco.filter((l) => l.id !== apagar[1]);
    return Promise.resolve({}); // 204: o apiFetch devolve {}
  }
  return Promise.reject(new Error('Rota inválida'));
};

// O cartão de uma mensagem: o menor bloco com o nome de quem escreveu e o botão "Excluir".
const cartao = (nome: string) => {
  let el: HTMLElement | null = screen.getByRole('heading', { name: nome });
  while (el && !within(el).queryByRole('button', { name: /excluir/i })) el = el.parentElement;
  if (!el) throw new Error(`cartão de ${nome} não encontrado`);
  return el;
};

// O bloco de um card de estatística ("Não lidas", "Lidas"): rótulo e número.
const estatistica = (rotulo: string) => {
  const bloco = screen.getByText(rotulo, { selector: 'p' }).parentElement;
  if (!bloco) throw new Error(`estatística ${rotulo} não encontrada`);
  return bloco;
};

// Escolhe a opção pelo texto que o admin vê, seja qual for o value interno.
const filtrarPor = (rotulo: string) => {
  const select = screen.getByLabelText('Filtrar por situação') as HTMLSelectElement;
  const opcao = within(select).getByRole('option', { name: rotulo }) as HTMLOptionElement;
  fireEvent.change(select, { target: { value: opcao.value } });
};

const abrirTela = async () => {
  render(<ContactSubmissionsListPage />);
  await screen.findByRole('heading', { name: 'Ana Souza' });
};

describe('ContactSubmissionsListPage — lida/não lida e exclusão com o formato real da API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    banco = [
      {
        id: 'c1', name: 'Ana Souza', email: 'ana@teste.com', isRead: false, createdAt: '2026-10-30T12:00:00.000Z',
        message: 'Quero som para a festa.\n\n— Dados do formulário —\nTelefone: (31) 98888-7777',
      },
      { id: 'c2', name: 'Bruno Lima', email: 'bruno@teste.com', message: 'Vocês atendem em BH?', isRead: true, createdAt: '2026-10-29T12:00:00.000Z' },
      { id: 'c3', name: 'Carla Dias', email: 'carla@teste.com', message: 'Preciso de telão.', isRead: false, createdAt: '2026-10-28T12:00:00.000Z' },
    ];
    apiFetch.mockImplementation(apiReal);
  });

  it('isRead: false aparece como "Nova", com "Marcar Lida", e entra no contador de não lidas', async () => {
    await abrirTela();

    expect(within(cartao('Ana Souza')).getByText('Nova')).toBeInTheDocument();
    expect(within(cartao('Carla Dias')).getByText('Nova')).toBeInTheDocument();
    expect(within(cartao('Bruno Lima')).getByText('Lida')).toBeInTheDocument();
    expect(within(cartao('Ana Souza')).getByRole('button', { name: /marcar lida/i })).toBeInTheDocument();
    expect(within(cartao('Bruno Lima')).queryByRole('button', { name: /marcar lida/i })).not.toBeInTheDocument();

    expect(within(estatistica('Não lidas')).getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Requer atenção')).toBeInTheDocument();
    expect(within(estatistica('Lidas')).getByText('1')).toBeInTheDocument();
  });

  it('filtros: "Não lidas" mostra só as não lidas e "Lidas" só as lidas (antes: lista vazia)', async () => {
    await abrirTela();

    filtrarPor('Não lidas');
    expect(screen.getByRole('heading', { name: 'Ana Souza' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Carla Dias' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Bruno Lima' })).not.toBeInTheDocument();

    filtrarPor('Lidas');
    expect(screen.getByRole('heading', { name: 'Bruno Lima' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ana Souza' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Carla Dias' })).not.toBeInTheDocument();
  });

  it('"Marcar Lida" grava pela API (PATCH /admin/contacts/:id/read) e a mensagem passa a "Lida"', async () => {
    await abrirTela();

    fireEvent.click(within(cartao('Ana Souza')).getByRole('button', { name: /marcar lida/i }));

    expect(await within(cartao('Ana Souza')).findByText('Lida')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/admin/contacts/c1/read', { method: 'PATCH' });
    expect(banco.find((linha) => linha.id === 'c1')?.isRead).toBe(true);
    expect(within(cartao('Ana Souza')).queryByRole('button', { name: /marcar lida/i })).not.toBeInTheDocument();
    expect(within(estatistica('Não lidas')).getByText('1')).toBeInTheDocument();
    expect(within(estatistica('Lidas')).getByText('2')).toBeInTheDocument();
  });

  // A rota DELETE /admin/contacts/:id passa a existir no backend; aqui, o contrato da tela com ela.
  it('"Excluir" → confirmar chama DELETE /admin/contacts/:id e tira a mensagem da lista', async () => {
    await abrirTela();

    fireEvent.click(within(cartao('Bruno Lima')).getByRole('button', { name: /excluir/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar Exclusão' }));

    // O modal só fecha no fim do fluxo (finally de confirmDelete).
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Confirmar Exclusão' })).not.toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: 'Bruno Lima' })).not.toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/admin/contacts/c2', { method: 'DELETE' });
    expect(banco.map((linha) => linha.id)).toEqual(['c1', 'c3']);
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });
});
