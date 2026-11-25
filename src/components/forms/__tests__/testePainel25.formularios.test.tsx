// Teste do painel admin de 25/11/2026 (relatório "Teste do painel admin — 25/11/2026"):
// - A-01: o Editar da reserva manda a versão lida (expectedUpdatedAt); a recusa do servidor (outra aba gravou antes) fica
//   na tela, com o formulário aberto e o que foi digitado;
// - A-02: com o pagamento Parcial, aparece "Valor já recebido (R$)", que vai no salvar (fora de Parcial, não vai);
// - A-07: o equipamento novo sem imagem avisa ao lado do campo e não vai ao servidor.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Booking } from '../../../types/types';

const { apiFetch, addNotification } = vi.hoisted(() => ({ apiFetch: vi.fn(), addNotification: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('@/services/api', () => ({ apiFetch }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));

import { AdminBookingForm } from '../AdminBookingForm';
import { EquipmentForm } from '../EquipmentFormPage';

const VERSAO = '2026-11-25T07:35:12.345Z';
const RESERVA = {
  id: 'XP-20261125-0434-MB5Q', eventDate: '2027-01-10T21:00:00.000Z', eventEndDate: '2027-01-11T02:00:00.000Z',
  clientId: null, client: null, clientName: 'Ana Souza', clientContact: '31988887777', clientEmail: 'ana@cliente.test',
  location: 'Espaço VIP', street: 'Av. Brasil', neighborhood: 'Centro', city: 'Belo Horizonte', state: 'MG', zipCode: '30110-000', addressNumber: '123',
  status: 'CONFIRMED', deliveryStatus: 'PENDING', totalPrice: 2160, paymentStatus: null, internalNotes: '', updatedAt: VERSAO,
} as unknown as Booking;

const corpoDoPut = () => JSON.parse(String(apiFetch.mock.calls.find(([, opts]) => opts?.method === 'PUT')?.[1].body));

describe('AdminBookingForm — teste do painel de 25/11/2026', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    apiFetch.mockImplementation((_url: string, opts?: { method?: string }) => Promise.resolve(opts?.method === 'PUT' ? { id: RESERVA.id } : []));
  });

  it('A-01: o salvar leva a versão lida ao abrir', async () => {
    const onSuccess = vi.fn();
    render(<AdminBookingForm initialData={RESERVA} onSuccess={onSuccess} onCancel={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('Observações internas'), { target: { value: 'nota da aba A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(corpoDoPut()).toEqual(expect.objectContaining({ internalNotes: 'nota da aba A', expectedUpdatedAt: VERSAO }));
  });

  it('A-01: outra aba gravou antes (409): a frase do servidor aparece, o formulário fica aberto com o texto', async () => {
    const recusa = 'Esta reserva foi alterada depois que você abriu a edição (em outra aba ou por outra pessoa). Nada foi salvo: copie o que digitou, recarregue a ficha e refaça a sua mudança.';
    apiFetch.mockImplementation((_url: string, opts?: { method?: string }) =>
      opts?.method === 'PUT' ? Promise.reject(Object.assign(new Error(recusa), { status: 409 })) : Promise.resolve([]));
    const onSuccess = vi.fn();
    render(<AdminBookingForm initialData={RESERVA} onSuccess={onSuccess} onCancel={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('Observações internas'), { target: { value: 'nota da aba B' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', message: recusa })));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Observações internas')).toHaveValue('nota da aba B');
    expect(screen.getByText(recusa)).toBeInTheDocument();
  });

  it('reserva sem a versão (aberta pela lista, leitura falhou): salva sem conferir', async () => {
    const onSuccess = vi.fn();
    render(<AdminBookingForm initialData={{ ...RESERVA, updatedAt: undefined } as unknown as Booking} onSuccess={onSuccess} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Salvar alterações' });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(corpoDoPut()).not.toHaveProperty('expectedUpdatedAt');
  });

  it('A-02: "Parcial" mostra o valor recebido, que vai no salvar; outro pagamento não manda o campo', async () => {
    const onSuccess = vi.fn();
    render(<AdminBookingForm initialData={RESERVA} onSuccess={onSuccess} onCancel={vi.fn()} />);
    await screen.findByRole('button', { name: 'Salvar alterações' });
    expect(screen.queryByLabelText('Valor já recebido (R$)')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Situação do Pagamento'), { target: { value: 'PARTIAL' } });
    fireEvent.change(await screen.findByLabelText('Valor já recebido (R$)'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(corpoDoPut()).toEqual(expect.objectContaining({ paymentStatus: 'PARTIAL', paidAmount: 500 }));
  });

  it('A-02: a reserva parcial abre com o valor gravado; em branco manda null (apaga); "Pago" não manda o campo', async () => {
    const onSuccess = vi.fn();
    const { unmount } = render(
      <AdminBookingForm initialData={{ ...RESERVA, paymentStatus: 'PARTIAL', paidAmount: '270.00' } as unknown as Booking} onSuccess={onSuccess} onCancel={vi.fn()} />,
    );
    const campo = await screen.findByLabelText('Valor já recebido (R$)');
    expect(campo).toHaveValue(270);
    fireEvent.change(campo, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(corpoDoPut().paidAmount).toBeNull();
    unmount();

    apiFetch.mockClear();
    const onSuccess2 = vi.fn();
    render(<AdminBookingForm initialData={{ ...RESERVA, paymentStatus: 'PARTIAL', paidAmount: '270.00' } as unknown as Booking} onSuccess={onSuccess2} onCancel={vi.fn()} />);
    await screen.findByLabelText('Valor já recebido (R$)');
    fireEvent.change(screen.getByLabelText('Situação do Pagamento'), { target: { value: 'PAID' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(onSuccess2).toHaveBeenCalled());
    expect(corpoDoPut()).toEqual(expect.objectContaining({ paymentStatus: 'PAID' }));
    expect(corpoDoPut()).not.toHaveProperty('paidAmount');
  });
});

describe('EquipmentForm — A-07: a imagem do equipamento novo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    apiFetch.mockImplementation((url: string) =>
      Promise.resolve(url.startsWith('/categories') ? [{ id: 'cat1', name: 'Som' }] : []));
  });

  it('sem imagem: o aviso fica ao lado do campo e nada vai ao servidor', async () => {
    render(<EquipmentForm onSuccess={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText('Nome'), { target: { value: 'TESTE — pode excluir' } });
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'cat1' } });
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Equipamento de teste para o painel' } });
    fireEvent.change(screen.getByLabelText(/Preço/), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Quantidade'), { target: { value: '1' } });
    expect(screen.getByText('Imagem *')).toBeInTheDocument();

    fireEvent.submit(screen.getByLabelText('Nome').closest('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent('Escolha uma imagem do equipamento: ela é obrigatória no cadastro.');
    expect(apiFetch.mock.calls.some(([, opts]) => opts?.method === 'POST')).toBe(false);
  });
});
