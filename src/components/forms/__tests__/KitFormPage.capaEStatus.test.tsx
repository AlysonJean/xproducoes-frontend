import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  render(<KitForm initialData={initialData} onSuccess={vi.fn()} onCancel={vi.fn()} />);
};

const enviado = async (method: 'POST' | 'PUT') => {
  await waitFor(() => expect(apiFetch.mock.calls.some((c) => c[1]?.method === method)).toBe(true));
  const call = apiFetch.mock.calls.find((c) => c[1]?.method === method)!;
  return { url: call[0] as string, body: call[1].body as FormData };
};

const preencherBasico = async () => {
  fireEvent.change(await screen.findByLabelText('Nome do Kit'), { target: { value: 'Kit Teste' } });
  fireEvent.change(screen.getByLabelText('Descrição Detalhada'), { target: { value: 'Caixa e mesa' } });
  fireEvent.change(screen.getByLabelText('Preço de Venda do Kit'), { target: { value: '79.99' } });
  fireEvent.change(screen.getByLabelText('Adicionar Itens'), { target: { value: 'Caixa' } });
  fireEvent.click(await screen.findByRole('button', { name: /Caixa Ativa/ }));
};

const capa = () => new File(['png'], 'capa.png', { type: 'image/png' });
const status = () => screen.getByLabelText('Status Atual') as HTMLSelectElement;
const salvar = () => fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

// Conferência de 07/11/2026 (agente do navegador, em produção): "Criar kit" voltava 500 "Erro interno do servidor"
// nas três tentativas. A capa é obrigatória no banco e o formulário deixava salvar sem ela. E o Status escolhido no
// formulário não ia no envio: o kit de teste "Inativo" nasceria Ativo, visível no site.
describe('Formulário do kit — capa obrigatória no kit novo e status enviado', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('kit novo sem capa: avisa no campo e não envia', async () => {
    renderForm();
    await preencherBasico();
    salvar();

    expect(await screen.findByText('Escolha a imagem de capa do kit.')).toBeInTheDocument();
    expect(apiFetch.mock.calls.some((c) => c[1]?.method === 'POST')).toBe(false);
    expect(screen.getByText('Capa do kit (obrigatória).')).toBeInTheDocument();
  });

  it('kit novo com capa e "Inativo": envia a imagem e o status INACTIVE', async () => {
    renderForm();
    await preencherBasico();
    expect(status().value).toBe('ACTIVE'); // padrão
    fireEvent.change(status(), { target: { value: 'INACTIVE' } });
    await userEvent.upload(screen.getByLabelText('Imagem de capa do kit'), capa());
    salvar();

    const { url, body } = await enviado('POST');
    expect(url).toBe('/kits');
    expect(body.get('status')).toBe('INACTIVE');
    expect((body.get('image') as File).name).toBe('capa.png');
  });

  it('a edição abre com o status do kit e salva sem imagem nova (a capa atual fica)', async () => {
    const kit = {
      id: 'kt-1', name: 'Kit Teste', description: 'Caixa e mesa', price: 79.99, imageUrl: 'https://res.cloudinary.com/x/kits/a.jpg',
      items: [{ id: 'i1', equipmentId: 'eq1', quantity: 1 }], experienceLevels: [], status: 'INACTIVE',
      minimumRentalDuration: null, extraHourPrice: null, fulfillment: 'DELIVERY_SETUP',
    } as unknown as Kit;
    renderForm(kit);
    await screen.findByLabelText('Nome do Kit');

    await waitFor(() => expect(status().value).toBe('INACTIVE'));
    expect(screen.getByText('Capa do kit. Escolha outra só para trocar.')).toBeInTheDocument();
    salvar();

    const { url, body } = await enviado('PUT');
    expect(url).toBe('/kits/kt-1');
    expect(body.get('status')).toBe('INACTIVE');
    expect(body.get('image')).toBeNull();
  });
});
