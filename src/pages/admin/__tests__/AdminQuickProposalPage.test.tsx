import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const { apiFetch, useAuth, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));
vi.mock('jspdf', () => ({ jsPDF: vi.fn() }));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));

import { jsPDF } from 'jspdf';
import AdminQuickProposalPage from '../AdminQuickProposalPage';

// priceUnit: a unidade do preço que o GET /equipments põe em cada equipamento (auditoria do orçamento, O18).
const mesa = { id: 'eq-mesa', name: 'Mesa de Som', dailyPrice: 300, priceUnit: 'day' };

const PaginaDaReserva = () => {
  const { pathname } = useLocation();
  return <p>{`Página da reserva ${pathname}`}</p>;
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/orcamentos/novo']}>
      <Routes>
        <Route path="/admin/orcamentos/novo" element={<AdminQuickProposalPage />} />
        <Route path="/admin/reservas/:id" element={<PaginaDaReserva />} />
      </Routes>
    </MemoryRouter>,
  );

// O mínimo que a validação da tela exige: um item do catálogo, cliente manual, datas e endereço.
const preencherProposta = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Adicionar Mesa de Som' }));
  const campos: Array<[string, string]> = [
    ['Nome Completo *', 'Ana Souza'],
    ['WhatsApp / Celular *', '31988887777'],
    ['Local / Salão *', 'Espaço VIP'],
    ['Início Previsto *', '2027-01-10T18:00'],
    ['Término Previsto *', '2027-01-10T23:00'],
    ['CEP *', '30110-000'],
    ['Rua *', 'Av. Brasil'],
    ['Número *', '123'],
    ['Bairro *', 'Centro'],
    ['Cidade *', 'Belo Horizonte'],
    ['UF *', 'MG'],
  ];
  for (const [label, value] of campos) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
};

const chamadasPost = () => apiFetch.mock.calls.filter((c) => c[0] === '/bookings' && c[1]?.method === 'POST');

// Achado (revisão antes do deploy): o apiFetch já desembrulha { success, data } e devolve a própria
// reserva, mas a tela lia `.data.id` — toda criação terminava em "Reserva criada mas ID não
// retornado." e o novo clique, com outra Idempotency-Key, gravava a reserva de novo.
// A página é grande e cada teste preenche 11 campos: com a cobertura ligada (npm run test:coverage) e a
// máquina ocupada, dois testes passavam dos 5 s padrão do vitest e falhavam por tempo, não por erro.
// D11 (aprovada em 02/11/2026): o botão "Gerar link da proposta" virou "Salvar proposta" (o link seguro sai do
// "Enviar proposta" da página da reserva).
describe('AdminQuickProposalPage — salvar proposta', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  });

  it('abre a página da reserva criada', async () => {
    // O que o apiFetch devolve para POST /bookings: o `data` do envelope, ou seja, a reserva.
    apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === '/bookings' && opts?.method === 'POST') return Promise.resolve({ id: 'XP-NOVA', status: 'PENDING' });
      return Promise.resolve(url === '/equipments' ? [mesa] : []);
    });
    renderPage();
    await preencherProposta();

    fireEvent.click(screen.getByRole('button', { name: /salvar proposta/i }));

    expect(await screen.findByText('Página da reserva /admin/reservas/XP-NOVA')).toBeInTheDocument();
    expect(addNotification).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    // Antes: "Proposta gerada! O link de proposta está disponível na página da reserva", e a página não mostrava link.
    // E8 (auditoria do orçamento, 12/11/2026): o aviso diz que o link vai pelo "Enviar proposta".
    expect(addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Proposta salva', message: 'Confira a reserva e use "Enviar proposta": o link vai pelo WhatsApp e por e-mail, se a reserva tiver e-mail.' }),
    );
  });

  // Achado (revisão antes do deploy): o e-mail do cliente manual é opcional, mas a tela mandava
  // clientEmail: '' e o backend (z.string().email().optional()) respondia 400.
  it('cliente manual sem e-mail: o corpo não leva clientEmail vazio', async () => {
    apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === '/bookings' && opts?.method === 'POST') return Promise.resolve({ id: 'XP-NOVA' });
      return Promise.resolve(url === '/equipments' ? [mesa] : []);
    });
    renderPage();
    await preencherProposta();

    fireEvent.click(screen.getByRole('button', { name: /salvar proposta/i }));

    await waitFor(() => expect(chamadasPost()).toHaveLength(1));
    expect(JSON.parse(chamadasPost()[0][1].body)).not.toHaveProperty('clientEmail');
  });

  // Achado (auditoria ponta a ponta): o campo diz "Não aparecem na proposta", mas ia para `notes`, que sai
  // no PDF e na área do cliente.
  it('observações internas vão para internalNotes, fora de notes', async () => {
    apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === '/bookings' && opts?.method === 'POST') return Promise.resolve({ id: 'XP-NOVA' });
      return Promise.resolve(url === '/equipments' ? [mesa] : []);
    });
    renderPage();
    await preencherProposta();
    fireEvent.change(screen.getByLabelText(/Observações Internas/), { target: { value: 'Cliente pede desconto' } });

    fireEvent.click(screen.getByRole('button', { name: /salvar proposta/i }));

    await waitFor(() => expect(chamadasPost()).toHaveLength(1));
    const corpo = JSON.parse(chamadasPost()[0][1].body);
    expect(corpo.internalNotes).toBe('Cliente pede desconto');
    expect(corpo).not.toHaveProperty('notes');
  });

  it('sem observações internas, o corpo não leva o campo', async () => {
    apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === '/bookings' && opts?.method === 'POST') return Promise.resolve({ id: 'XP-NOVA' });
      return Promise.resolve(url === '/equipments' ? [mesa] : []);
    });
    renderPage();
    await preencherProposta();
    fireEvent.change(screen.getByLabelText(/Observações Internas/), { target: { value: '   ' } });

    fireEvent.click(screen.getByRole('button', { name: /salvar proposta/i }));

    await waitFor(() => expect(chamadasPost()).toHaveLength(1));
    expect(JSON.parse(chamadasPost()[0][1].body)).not.toHaveProperty('internalNotes');
  });

  // O PDF desta tela é de uso interno (E8), mas o arquivo pode ser repassado.
  it('o PDF da proposta não leva as observações internas', async () => {
    const textos: string[] = [];
    const doc = new Proxy(
      { lastAutoTable: { finalY: 120 } } as Record<string | symbol, unknown>,
      {
        get(alvo, chave) {
          if (chave in alvo) return alvo[chave];
          if (chave === 'text') return (texto: string | string[]) => textos.push(...[texto].flat());
          if (chave === 'splitTextToSize') return (texto: string) => [texto];
          return () => undefined;
        },
      },
    );
    vi.mocked(jsPDF).mockImplementation(function construtor() { return doc; } as never);
    apiFetch.mockImplementation((url: string) => Promise.resolve(url === '/equipments' ? [mesa] : []));
    renderPage();
    await preencherProposta();
    fireEvent.change(screen.getByLabelText(/Observações Internas/), { target: { value: 'Cliente pede desconto' } });

    fireEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }));

    await waitFor(() => expect(textos.some((t) => t.includes('Ana Souza'))).toBe(true));
    expect(textos.join(' ')).not.toContain('Cliente pede desconto');
    expect(textos.join(' ')).not.toMatch(/observa[cç][oõ]es/i);
  });

  // Achado (auditoria ponta a ponta): o corpo levava `userId: user?.id`, o id do admin logado, e o
  // backend pendurava a reserva do cliente manual no perfil de cliente do próprio admin.
  it('cliente manual: o corpo não leva o id do admin como userId', async () => {
    apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === '/bookings' && opts?.method === 'POST') return Promise.resolve({ id: 'XP-NOVA' });
      return Promise.resolve(url === '/equipments' ? [mesa] : []);
    });
    renderPage();
    await preencherProposta();

    fireEvent.click(screen.getByRole('button', { name: /salvar proposta/i }));

    await waitFor(() => expect(chamadasPost()).toHaveLength(1));
    const corpo = JSON.parse(chamadasPost()[0][1].body);
    expect(corpo).not.toHaveProperty('userId');
    expect(corpo).not.toHaveProperty('clientId');
    expect(corpo).toMatchObject({ clientName: 'Ana Souza', clientContact: '31988887777' });
  });

  it('tentar de novo o mesmo envio repete a Idempotency-Key; com o formulário alterado, a chave é outra', async () => {
    let tentativas = 0;
    apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === '/bookings' && opts?.method === 'POST') {
        tentativas += 1;
        return tentativas < 3 ? Promise.reject(new Error('Tempo esgotado')) : Promise.resolve({ id: 'XP-NOVA' });
      }
      return Promise.resolve(url === '/equipments' ? [mesa] : []);
    });
    renderPage();
    await preencherProposta();
    const botao = screen.getByRole('button', { name: /salvar proposta/i });

    fireEvent.click(botao); // 1ª tentativa: falha
    await waitFor(() => expect(botao).not.toBeDisabled());
    fireEvent.click(botao); // 2ª, mesmo formulário: falha de novo
    await waitFor(() => expect(botao).not.toBeDisabled());
    fireEvent.change(screen.getByLabelText('Número *'), { target: { value: '124' } });
    fireEvent.click(botao); // 3ª, formulário alterado: grava

    await waitFor(() => expect(chamadasPost()).toHaveLength(3));
    const chaves = chamadasPost().map((c) => c[1].headers?.['Idempotency-Key']);
    expect(chaves[0]).toEqual(expect.any(String));
    expect(chaves[1]).toBe(chaves[0]);
    expect(chaves[2]).toEqual(expect.any(String));
    expect(chaves[2]).not.toBe(chaves[0]);
    expect(await screen.findByText('Página da reserva /admin/reservas/XP-NOVA')).toBeInTheDocument();
  });
});

// D6, parte 1 (aprovada em 02/11/2026): o texto que a Proposta Rápida punha no PDF e na mensagem do
// WhatsApp dizia "Se ainda não tiver cadastro, crie aqui ... Assim que concluir, nossa equipe vincula
// sua proposta ao seu acesso" e mandava "acompanhar em tempo real" no painel do cliente. Nada disso
// acontece: o cadastro não vincula proposta nenhuma (linkBookingsToUser não tem chamador) e a equipe não
// tem tela para isso. Auditoria do orçamento (12/11/2026), E8: a mensagem do "PDF + WhatsApp" saiu junto com o botão
// (AdminQuickProposalPage.auditoriaOrcamento.test.tsx); o PDF, de uso interno, continua sem a promessa.
describe('AdminQuickProposalPage — texto do PDF sem promessa de vínculo (D6)', { timeout: 20000 }, () => {
  const PROMESSAS = [/vincul/i, /\/cadastro/, /\/cliente\/painel/, /tempo real/i, /crie aqui/i];

  const docQueGuardaTexto = (textos: string[]) =>
    new Proxy({ lastAutoTable: { finalY: 120 } } as Record<string | symbol, unknown>, {
      get(alvo, chave) {
        if (chave in alvo) return alvo[chave];
        if (chave === 'text') return (texto: string | string[]) => textos.push(...[texto].flat());
        if (chave === 'splitTextToSize') return (texto: string) => [texto];
        return () => undefined;
      },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'admin-1', role: 'ADMIN' } });
    apiFetch.mockImplementation((url: string) => Promise.resolve(url === '/equipments' ? [mesa] : []));
  });

  it('PDF: sem convite de cadastro nem promessa de vínculo', async () => {
    const textos: string[] = [];
    vi.mocked(jsPDF).mockImplementation(function construtor() { return docQueGuardaTexto(textos); } as never);
    renderPage();
    await preencherProposta();

    fireEvent.click(screen.getByRole('button', { name: 'Baixar PDF' }));

    await waitFor(() => expect(textos.some((t) => t.includes('Ana Souza'))).toBe(true));
    const tudo = textos.join(' ');
    for (const promessa of PROMESSAS) expect(tudo).not.toMatch(promessa);
  });

});
