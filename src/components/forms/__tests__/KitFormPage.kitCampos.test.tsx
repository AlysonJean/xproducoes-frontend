import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));

import { KitForm } from '../KitFormPage';
import type { Kit } from '../../../types/types';

const CAIXA = { id: 'eq1', name: 'Caixa Ativa', pricePerHour: 100, description: 'Caixa de som', status: 'ACTIVE' };

const renderForm = (initialData: Kit | null = null) => {
  apiFetch.mockImplementation((url: string) => {
    if (url === '/equipments') return Promise.resolve([CAIXA]);
    if (url === '/services') return Promise.resolve([]);
    return Promise.resolve({ id: 'kt-1' });
  });
  const onSuccess = vi.fn();
  render(<KitForm initialData={initialData} onSuccess={onSuccess} onCancel={vi.fn()} />);
  return { onSuccess };
};

const enviado = async (method: 'POST' | 'PUT') => {
  await waitFor(() => expect(apiFetch.mock.calls.some((c) => c[1]?.method === method)).toBe(true));
  const call = apiFetch.mock.calls.find((c) => c[1]?.method === method)!;
  return { url: call[0] as string, body: call[1].body as FormData };
};

const preencherBasico = async () => {
  fireEvent.change(await screen.findByLabelText('Nome do Kit'), { target: { value: 'Combo Club' } });
  fireEvent.change(screen.getByLabelText('Descrição Detalhada'), { target: { value: 'Caixa e mesa' } });
  fireEvent.change(screen.getByLabelText('Preço de Venda do Kit'), { target: { value: '149.99' } });
  fireEvent.change(screen.getByLabelText('Adicionar Itens'), { target: { value: 'Caixa' } });
  fireEvent.click(await screen.findByRole('button', { name: /Caixa Ativa/ }));
  // Kit novo exige a capa (conferência de 07/11/2026; ver KitFormPage.capaEStatus.test.tsx).
  await userEvent.upload(screen.getByLabelText('Imagem de capa do kit'), new File(['png'], 'capa.png', { type: 'image/png' }));
};

const campos = () => ({
  horas: screen.getByLabelText('Horas incluídas no preço') as HTMLInputElement,
  extra: screen.getByLabelText('Valor da hora extra (R$)') as HTMLInputElement,
  tipo: screen.getByLabelText('Tipo do kit') as HTMLSelectElement,
});

const salvar = () => fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

// Lote 13, campos do kit (aprovados pelo dono em 06/11/2026: "eu ajusto as horas na criação do kit"; "horas
// adicionais eu também configuro para cada kit"; "cada kit é de um tipo"). O formulário não tinha as horas
// incluídas no preço (a coluna minimumRentalDuration existia, mas nada a gravava), nem a hora extra, nem o tipo.
describe('Formulário do kit — horas incluídas, hora extra e tipo do kit', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('manda os três campos no envio', async () => {
    renderForm();
    await preencherBasico();
    const { horas, extra, tipo } = campos();
    expect(tipo.value).toBe('DELIVERY_SETUP'); // padrão: entrega e montagem pela equipe
    fireEvent.change(horas, { target: { value: '4' } });
    fireEvent.change(extra, { target: { value: '50.5' } });
    fireEvent.change(tipo, { target: { value: 'CLIENT_PICKUP' } });
    salvar();

    const { url, body } = await enviado('POST');
    expect(url).toBe('/kits');
    expect(body.get('minimumRentalDuration')).toBe('4');
    expect(body.get('extraHourPrice')).toBe('50.5');
    expect(body.get('fulfillment')).toBe('CLIENT_PICKUP');
    expect(screen.getByRole('option', { name: 'Retirada e montagem pelo cliente' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Entrega e montagem pela equipe' })).toBeInTheDocument();
  });

  it('em branco, os dois campos vão vazios (o servidor grava nulo) e o tipo vai com o padrão', async () => {
    renderForm();
    await preencherBasico();
    salvar();

    const { body } = await enviado('POST');
    expect(body.get('minimumRentalDuration')).toBe('');
    expect(body.get('extraHourPrice')).toBe('');
    expect(body.get('fulfillment')).toBe('DELIVERY_SETUP');
  });

  it('hora extra sem as horas incluídas: avisa e não salva', async () => {
    renderForm();
    await preencherBasico();
    fireEvent.change(campos().extra, { target: { value: '50' } });
    salvar();

    expect(await screen.findByText('Para cobrar hora extra, preencha também "Horas incluídas no preço".')).toBeInTheDocument();
    expect(apiFetch.mock.calls.some((c) => c[1]?.method === 'POST')).toBe(false);
  });

  it('horas incluídas fora de 1 a 240 ou quebradas: avisa e não salva', async () => {
    renderForm();
    await preencherBasico();
    fireEvent.change(campos().horas, { target: { value: '4.5' } });
    salvar();

    expect(await screen.findByText('Use um número inteiro de horas, de 1 a 240, ou deixe em branco.')).toBeInTheDocument();
    expect(apiFetch.mock.calls.some((c) => c[1]?.method === 'POST')).toBe(false);
  });

  it('hora extra com mais de dois centavos: avisa e não salva', async () => {
    renderForm();
    await preencherBasico();
    fireEvent.change(campos().horas, { target: { value: '4' } });
    fireEvent.change(campos().extra, { target: { value: '50.555' } });
    salvar();

    expect(await screen.findByText('Use um valor em reais, como 50 ou 50,00, ou deixe em branco.')).toBeInTheDocument();
    expect(apiFetch.mock.calls.some((c) => c[1]?.method === 'POST')).toBe(false);
  });

  it('edição abre com os três campos do kit, e apagar manda vazio (para limpar no servidor)', async () => {
    const kit = {
      id: 'kt-1', name: 'Combo Club', description: 'Caixa e mesa', price: 149.99, imageUrl: '',
      items: [{ id: 'i1', equipmentId: 'eq1', quantity: 1 }], experienceLevels: [],
      minimumRentalDuration: 4, extraHourPrice: '50.00', fulfillment: 'CLIENT_PICKUP',
    } as unknown as Kit;
    renderForm(kit);
    await screen.findByLabelText('Nome do Kit');

    await waitFor(() => expect(campos().horas.value).toBe('4'));
    expect(campos().extra.value).toBe('50');
    expect(campos().tipo.value).toBe('CLIENT_PICKUP');

    fireEvent.change(campos().horas, { target: { value: '' } });
    fireEvent.change(campos().extra, { target: { value: '' } });
    fireEvent.change(campos().tipo, { target: { value: 'DELIVERY_SETUP' } });
    salvar();

    const { url, body } = await enviado('PUT');
    expect(url).toBe('/kits/kt-1');
    expect(body.get('minimumRentalDuration')).toBe('');
    expect(body.get('extraHourPrice')).toBe('');
    expect(body.get('fulfillment')).toBe('DELIVERY_SETUP');
  });

  it('o rascunho guarda os três campos e devolve ao restaurar', async () => {
    renderForm();
    await preencherBasico();
    fireEvent.change(campos().horas, { target: { value: '6' } });
    fireEvent.change(campos().extra, { target: { value: '75' } });
    fireEvent.change(campos().tipo, { target: { value: 'CLIENT_PICKUP' } });
    await waitFor(() => {
      const salvo = JSON.parse(localStorage.getItem('xp-draft-kit-new') || '{}');
      expect(salvo.values).toMatchObject({ minimumRentalDuration: '6', extraHourPrice: '75', fulfillment: 'CLIENT_PICKUP' });
    }, { timeout: 3000 });

    cleanup();
    renderForm();
    fireEvent.click(await screen.findByRole('button', { name: 'Restaurar' }));

    await waitFor(() => expect(campos().horas.value).toBe('6'));
    expect(campos().extra.value).toBe('75');
    expect(campos().tipo.value).toBe('CLIENT_PICKUP');
  });
});
