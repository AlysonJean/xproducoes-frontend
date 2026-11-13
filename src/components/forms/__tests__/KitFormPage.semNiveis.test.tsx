import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));

import { KitForm } from '../KitFormPage';
import type { Kit } from '../../../types/types';

// Auditoria do orçamento (12/11/2026), O4/B1 (decisão de 12/11: os níveis Silver/Gold/Platinum saem do site e do
// painel): o formulário do kit tinha o editor de níveis e mandava experienceLevels no envio. O editor sai; o kit
// salva com os mesmos campos de antes, sem experienceLevels (o servidor, sem o campo, não mexe nos níveis gravados).

const CAIXA = { id: 'eq1', name: 'Caixa Ativa', pricePerHour: 100, description: 'Caixa de som', status: 'ACTIVE' };
// Um kit que ainda tem níveis gravados, como a API devolve.
const KIT_COM_NIVEIS = {
  id: 'kt-1', name: 'Combo Club', slug: 'combo-club', description: 'Caixa e mesa', price: '149.99', imageUrl: 'https://x/a.jpg',
  status: 'ACTIVE', fulfillment: 'DELIVERY_SETUP', minimumRentalDuration: 4, extraHourPrice: '50.00',
  items: [{ id: 'i1', kitId: 'kt-1', equipmentId: 'eq1', quantity: 1, equipment: CAIXA }],
  experienceLevels: [
    { id: 'l1', level: 'SILVER', price: '149.99', description: 'Básico', includes: ['Caixas'], kitId: 'kt-1' },
    { id: 'l2', level: 'GOLD', price: '299.98', description: 'Com montagem', includes: ['Caixas', 'Técnico'], kitId: 'kt-1' },
  ],
};

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

const salvar = () => fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

const semNiveisNaTela = () => {
  expect(screen.queryByText('Níveis de Experiência')).not.toBeInTheDocument();
  expect(screen.queryAllByText(/Silver|Gold|Platinum/)).toHaveLength(0);
  expect(screen.queryByDisplayValue('Com montagem')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Adicionar Nível/ })).not.toBeInTheDocument();
};

describe('Formulário do kit — sem os níveis Silver/Gold/Platinum (O4/B1)', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('editar um kit que ainda tem níveis: o editor não aparece e o PUT sai sem experienceLevels, com o resto de sempre', async () => {
    const { onSuccess } = renderForm(KIT_COM_NIVEIS as unknown as Kit);
    expect(await screen.findByLabelText('Nome do Kit')).toHaveValue('Combo Club');
    semNiveisNaTela();

    salvar();

    const { url, body } = await enviado('PUT');
    expect(url).toBe('/kits/kt-1');
    expect(body.has('experienceLevels')).toBe(false);
    expect(body.get('name')).toBe('Combo Club');
    expect(body.get('price')).toBe('149.99');
    expect(body.get('minimumRentalDuration')).toBe('4');
    expect(body.get('extraHourPrice')).toBe('50');
    expect(body.get('fulfillment')).toBe('DELIVERY_SETUP');
    expect(body.get('status')).toBe('ACTIVE');
    expect(JSON.parse(String(body.get('items')))).toEqual([{ id: 'eq1', quantity: 1, type: 'EQUIPMENT' }]);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('kit novo: sem editor de níveis e o POST sai sem experienceLevels', async () => {
    const { onSuccess } = renderForm();
    fireEvent.change(await screen.findByLabelText('Nome do Kit'), { target: { value: 'Combo Festa' } });
    semNiveisNaTela();
    fireEvent.change(screen.getByLabelText('Descrição Detalhada'), { target: { value: 'Caixa e mesa' } });
    fireEvent.change(screen.getByLabelText('Preço de Venda do Kit'), { target: { value: '199.90' } });
    fireEvent.change(screen.getByLabelText('Adicionar Itens'), { target: { value: 'Caixa' } });
    fireEvent.click(await screen.findByRole('button', { name: /Caixa Ativa/ }));
    await userEvent.upload(screen.getByLabelText('Imagem de capa do kit'), new File(['png'], 'capa.png', { type: 'image/png' }));

    salvar();

    const { url, body } = await enviado('POST');
    expect(url).toBe('/kits');
    expect(body.has('experienceLevels')).toBe(false);
    expect(body.get('name')).toBe('Combo Festa');
    expect(JSON.parse(String(body.get('items')))).toEqual([{ id: 'eq1', quantity: 1, type: 'EQUIPMENT' }]);
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });
});
