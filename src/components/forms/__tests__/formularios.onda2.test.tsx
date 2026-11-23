import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Onda 2 da auditoria de 19/11: F4-12 (a ordem do banner travava o salvar), F4-13 (mais de uma imagem no equipamento
// derrubava o envio), F4-14 (os botões +/− do kit não mudavam o número na tela) e F4-15 (apagar o telefone do cliente
// não apagava).
const { apiFetch, addNotification, openModal } = vi.hoisted(() => ({ apiFetch: vi.fn(), addNotification: vi.fn(), openModal: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch, api: { post: vi.fn() } }));
vi.mock('@/services/api', () => ({ apiFetch, api: { post: vi.fn() } }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('@/components/modals/ModalContext', () => ({ useModal: () => ({ openModal }) }));

import { BannerForm } from '../BannerForm';
import { EquipmentForm } from '../EquipmentFormPage';
import { KitForm } from '../KitFormPage';
import { ClientForm } from '../ClientFormPage';
import type { Banner, Client, Equipment } from '../../../types/types';

const chamada = async (method: 'POST' | 'PUT') => {
  await waitFor(() => expect(apiFetch.mock.calls.some((c) => c[1]?.method === method)).toBe(true));
  return apiFetch.mock.calls.find((c) => c[1]?.method === method)!;
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('F4-12: ordem de exibição do banner', () => {
  const BANNER = { id: 'bn-1', title: 'Verão', description: '', imageUrl: 'https://img.test/b.jpg', mobileImageUrl: '', linkUrl: '', sortOrder: 0, active: true } as unknown as Banner;

  it('digitar a ordem salva o número (antes: "expected number, received string" e nada salvava)', async () => {
    apiFetch.mockResolvedValue({ id: 'bn-1' });
    const onSuccess = vi.fn();
    render(<BannerForm initialData={BANNER} onSuccess={onSuccess} onCancel={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('Ordem de Exibição'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

    const [url, init] = await chamada('PUT');
    expect(url).toBe('/banners/bn-1');
    expect(JSON.parse(init.body as string).sortOrder).toBe(3);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('ordem em branco: pede o número em português e não envia', async () => {
    render(<BannerForm initialData={BANNER} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('Ordem de Exibição'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
    expect(await screen.findByText('Informe a ordem de exibição (um número).')).toBeInTheDocument();
    expect(apiFetch.mock.calls.some((c) => c[1]?.method === 'PUT')).toBe(false);
  });
});

describe('F4-13: imagem do equipamento', () => {
  const EQUIP = {
    id: 'eq-1', name: 'Caixa JBL', description: 'Caixa ativa', pricePerHour: 100, categoryId: 'cat-1', quantity: 2, status: 'ACTIVE',
  } as unknown as Equipment;

  it('o campo aceita uma imagem só, e ela vai em "image" (sem "images", que a rota recusa)', async () => {
    apiFetch.mockImplementation((url: string, init?: { method?: string }) => {
      if (url === '/categories') return Promise.resolve([{ id: 'cat-1', name: 'Som' }]);
      if (init?.method) return Promise.resolve({ id: 'eq-1' });
      return Promise.resolve([]);
    });
    const onSuccess = vi.fn();
    render(<EquipmentForm initialData={EQUIP} onSuccess={onSuccess} onCancel={vi.fn()} />);
    const input = await screen.findByLabelText('Imagem');
    expect(input).not.toHaveAttribute('multiple');

    await userEvent.upload(input, new File(['png'], 'caixa.png', { type: 'image/png' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    const [url, init] = await chamada('PUT');
    expect(url).toBe('/equipment/eq-1');
    const fd = init.body as FormData;
    expect(fd.getAll('image')).toHaveLength(1);
    expect(fd.has('images')).toBe(false);
  });
});

describe('F4-14: quantidade do item no kit', () => {
  const CAIXA = { id: 'eq1', name: 'Caixa Ativa', pricePerHour: 100, description: 'Caixa de som', status: 'ACTIVE' };

  it('+ e − mudam o número no campo e o que é salvo', async () => {
    apiFetch.mockImplementation((url: string) => {
      if (url === '/equipments') return Promise.resolve([CAIXA]);
      if (url === '/services') return Promise.resolve([]);
      return Promise.resolve({ id: 'kt-1' });
    });
    render(<KitForm initialData={null} onSuccess={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('Nome do Kit'), { target: { value: 'Combo Club' } });
    fireEvent.change(screen.getByLabelText('Descrição Detalhada'), { target: { value: 'Caixa e mesa' } });
    fireEvent.change(screen.getByLabelText('Preço de Venda do Kit'), { target: { value: '149.99' } });
    fireEvent.change(screen.getByLabelText('Adicionar Itens'), { target: { value: 'Caixa' } });
    fireEvent.click(await screen.findByRole('button', { name: /Caixa Ativa/ }));
    await userEvent.upload(screen.getByLabelText('Imagem de capa do kit'), new File(['png'], 'capa.png', { type: 'image/png' }));

    const mais = screen.getByRole('button', { name: 'Aumentar quantidade de Caixa Ativa' });
    fireEvent.click(mais);
    fireEvent.click(mais);
    expect(screen.getByLabelText(/Quantidade/, { selector: 'input' })).toHaveValue(3);
    fireEvent.click(screen.getByRole('button', { name: 'Diminuir quantidade de Caixa Ativa' }));
    expect(screen.getByLabelText(/Quantidade/, { selector: 'input' })).toHaveValue(2);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
    const [, init] = await chamada('POST');
    const items = JSON.parse((init.body as FormData).get('items') as string) as Array<{ quantity: number }>;
    expect(items[0].quantity).toBe(2);
  });
});

describe('F4-15: telefone do cliente', () => {
  it('editar sem foto e apagar o telefone manda o texto vazio (que apaga), não undefined', async () => {
    apiFetch.mockResolvedValue({ id: 'c1' });
    const onSuccess = vi.fn();
    const cliente = { id: 'c1', name: 'Carla Dias', email: 'carla@teste.com', phone: '31988887777' } as unknown as Client;
    render(<ClientForm initialData={cliente} onSuccess={onSuccess} onCancel={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('Telefone (opcional)'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar/ }));

    const [url, init] = await chamada('PUT');
    expect(url).toBe('/admin/clients/c1');
    expect(JSON.parse(init.body as string)).toHaveProperty('phone', '');
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
