// Teste do painel admin de 25/11/2026 (relatório "Teste do painel admin — 25/11/2026"), a Proposta rápida nova:
// - A-09/A-11: e-mail "abc@", telefone "123", data de ontem e CEP 00000-000 passavam, e os erros vinham um por vez num
//   aviso flutuante "Campo obrigatório". Agora todos aparecem juntos, ao lado do campo, e nada vai ao servidor;
// - A-10: o CEP completa o endereço (ViaCEP), sem apagar o que já foi digitado.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { apiFetch, useAuth, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), useAuth: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth }));

import AdminQuickProposalPage from '../AdminQuickProposalPage';

const mesa = { id: 'eq-mesa', name: 'Mesa de Som', dailyPrice: 300, pricePerHour: 300, priceUnit: 'day', status: 'ACTIVE' };

const renderPage = () => {
  apiFetch.mockImplementation((url: string) => Promise.resolve(url === '/equipments' ? [mesa] : []));
  render(
    <MemoryRouter initialEntries={['/admin/orcamentos/novo']}>
      <Routes><Route path="/admin/orcamentos/novo" element={<AdminQuickProposalPage />} /></Routes>
    </MemoryRouter>,
  );
};

const preencher = (campos: Array<[string, string]>) => {
  for (const [label, value] of campos) fireEvent.change(screen.getByLabelText(label), { target: { value } });
};
const erroDo = (label: string) => {
  const campo = screen.getByLabelText(label);
  const id = campo.getAttribute('aria-describedby') ?? '';
  return id.split(' ').map((part) => document.getElementById(part)?.textContent ?? '').join(' ');
};

describe('Proposta rápida nova — teste do painel de 25/11/2026', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('A-09/A-11: os valores errados do teste dão um erro ao lado de cada campo, de uma vez, e nada é gravado', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar Mesa de Som' }));
    preencher([
      ['Nome Completo *', 'TESTE ADMIN'],
      ['WhatsApp / Celular *', '123'],
      ['E-mail', 'abc@'],
      ['Local / Salão *', 'Espaço VIP'],
      ['Início Previsto *', '2020-01-10T18:00'],
      ['Término Previsto *', '2020-01-10T23:00'],
      ['CEP *', '00000-000'],
      ['Rua *', 'Av. Brasil'],
      ['Número *', '123'],
      ['Bairro *', 'Centro'],
      ['Cidade *', 'Belo Horizonte'],
      ['UF *', 'MG'],
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar proposta' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error', title: 'Confira o orçamento', message: '4 campos para corrigir, marcados em vermelho.',
    })));
    expect(erroDo('WhatsApp / Celular *')).toContain('Telefone inválido. Digite com o DDD, por exemplo (31) 98888-7777.');
    expect(erroDo('E-mail')).toContain('E-mail inválido.');
    expect(erroDo('Início Previsto *')).toContain('O início já passou.');
    expect(erroDo('CEP *')).toContain('CEP inválido.');
    expect(screen.getByLabelText('WhatsApp / Celular *')).toHaveFocus();
    expect(addNotification).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Campo obrigatório' }));
    expect(apiFetch.mock.calls.some((c) => c[1]?.method === 'POST')).toBe(false);

    // Corrigir um campo tira o erro dele na hora.
    fireEvent.change(screen.getByLabelText('WhatsApp / Celular *'), { target: { value: '(31) 98888-7777' } });
    expect(erroDo('WhatsApp / Celular *')).not.toContain('Telefone inválido');
  });

  it('A-11: término antes do início é erro do término, com a frase certa', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar Mesa de Som' }));
    preencher([['Início Previsto *', '2027-01-10T23:00'], ['Término Previsto *', '2027-01-10T18:00']]);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar proposta' }));

    await waitFor(() => expect(erroDo('Término Previsto *')).toContain('O término precisa ser depois do início.'));
  });

  it('A-10: o CEP completo preenche rua, bairro, cidade e UF vazios (e não apaga o que já foi digitado)', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ logradouro: 'Avenida Afonso Pena', bairro: 'Centro', localidade: 'Belo Horizonte', uf: 'MG' }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    await screen.findByRole('button', { name: 'Adicionar Mesa de Som' });
    fireEvent.change(screen.getByLabelText('Bairro *'), { target: { value: 'Funcionários' } });

    fireEvent.change(screen.getByLabelText('CEP *'), { target: { value: '30130010' } });

    expect(screen.getByLabelText('CEP *')).toHaveValue('30130-010');
    await waitFor(() => expect(screen.getByLabelText('Rua *')).toHaveValue('Avenida Afonso Pena'));
    expect(screen.getByLabelText('Cidade *')).toHaveValue('Belo Horizonte');
    expect(screen.getByLabelText('UF *')).toHaveValue('MG');
    expect(screen.getByLabelText('Bairro *')).toHaveValue('Funcionários');
    expect(fetchMock).toHaveBeenCalledWith('https://viacep.com.br/ws/30130010/json/', expect.anything());
  });

  // Pedido de Alyson de 25/11/2026 ("não estou vendo o cálculo do frete automático"): com o que entregar e o endereço
  // completo, o frete entra sozinho (sem clicar em Frete), uma vez por endereço; tirar a linha à mão vale.
  it('frete automático: com equipamento e o endereço completo, o frete entra sozinho; tirar a linha não o põe de novo', async () => {
    renderPage();
    apiFetch.mockImplementation((url: string) => {
      if (url === '/equipments') return Promise.resolve([mesa]);
      if (url === '/admin/freight/quote') return Promise.resolve({ status: 'OK', items: [{ description: 'Frete (8 km por trecho)', unitPrice: 50 }] });
      return Promise.resolve([]);
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar Mesa de Som' }));
    preencher([
      ['CEP *', '30130-010'],
      ['Rua *', 'Av. Afonso Pena'],
      ['Número *', '1000'],
      ['Bairro *', 'Centro'],
      ['Cidade *', 'Belo Horizonte'],
      ['UF *', 'MG'],
    ]);

    await waitFor(() => expect(screen.getAllByLabelText('Descrição do item').map((el) => (el as HTMLInputElement).value)).toContain('Frete (8 km por trecho)'), { timeout: 4000 });
    const cotacoes = () => apiFetch.mock.calls.filter((c) => c[0] === '/admin/freight/quote');
    expect(cotacoes()).toHaveLength(1);
    expect(JSON.parse(cotacoes()[0][1].body as string)).toEqual(expect.objectContaining({ mode: 'EQUIPMENT', city: 'Belo Horizonte', zipCode: '30130-010' }));

    // Tirar a linha do frete à mão: o cálculo automático não a põe de novo para o mesmo endereço.
    const linhas = screen.getAllByLabelText('Descrição do item');
    const frete = linhas.find((el) => (el as HTMLInputElement).value === 'Frete (8 km por trecho)')!;
    const remover = frete.closest('.group')!.querySelector('button[aria-label^="Remover"]') as HTMLButtonElement;
    fireEvent.click(remover);
    await new Promise((r) => setTimeout(r, 1200));
    expect(cotacoes()).toHaveLength(1);
  });

  it('frete automático: sem o que entregar (só serviço), nada é calculado', async () => {
    renderPage();
    await screen.findByRole('button', { name: 'Adicionar Mesa de Som' });
    preencher([
      ['CEP *', '30130-010'],
      ['Rua *', 'Av. Afonso Pena'],
      ['Número *', '1000'],
      ['Bairro *', 'Centro'],
      ['Cidade *', 'Belo Horizonte'],
      ['UF *', 'MG'],
    ]);
    await new Promise((r) => setTimeout(r, 1200));
    expect(apiFetch.mock.calls.some((c) => c[0] === '/admin/freight/quote')).toBe(false);
  });

  it('A-10: CEP que não existe: avisa e deixa preencher à mão', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ erro: true }) })));
    renderPage();
    await screen.findByRole('button', { name: 'Adicionar Mesa de Som' });
    fireEvent.change(screen.getByLabelText('CEP *'), { target: { value: '99999-999' } });

    expect(await screen.findByText('Não achamos o endereço deste CEP: preencha à mão.')).toBeInTheDocument();
    expect(screen.getByLabelText('Rua *')).toHaveValue('');
  });
});
