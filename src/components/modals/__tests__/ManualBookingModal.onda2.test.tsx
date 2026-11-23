import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Onda 2 da auditoria de 19/11: F4-10 (o modal reabria com os dados da reserva anterior) e F4-11 (escolher o cliente
// cadastrado só copiava nome e telefone: a reserva nascia "manual" e o aviso por e-mail não saía).
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));

import { ManualBookingModal } from '../ManualBookingModal';

const KIT = { id: 'kit-1', name: 'Kit Som', price: 1200 };
const BIA = { id: 'cli-bia', name: 'Bia Lima', phone: '31955554444', user: { id: 'u-bia', name: 'Bia Lima', email: 'bia@cliente.test' } };
const CAMPOS: Array<[string, string]> = [
  ['Início do evento', '2027-01-10T18:00'], ['Fim do evento', '2027-01-10T23:00'], ['Local do evento', 'Espaço VIP'],
  ['Rua', 'Av. Brasil'], ['Número', '123'], ['Bairro', 'Centro'], ['CEP', '30110-000'], ['Cidade', 'Belo Horizonte'], ['Estado', 'MG'],
];
const preencher = (campos: Array<[string, string]>) => {
  for (const [label, value] of campos) fireEvent.change(screen.getByLabelText(label), { target: { value } });
};
const enviado = () => {
  const call = apiFetch.mock.calls.find((c) => c[0] === '/bookings' && c[1]?.method === 'POST');
  return call ? (JSON.parse(call[1].body as string) as Record<string, unknown>) : null;
};

// A agenda mantém o modal montado e só troca isOpen.
function Agenda({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Abrir reserva manual</button>
      <ManualBookingModal isOpen={open} onClose={() => setOpen(false)} onSuccess={onSuccess} />
    </>
  );
}

describe('ManualBookingModal — onda 2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (opts?.method === 'POST') return Promise.resolve({ id: 'XP-NOVA' });
      if (url === '/kits') return Promise.resolve([KIT]);
      if (url.startsWith('/admin/clients?')) return Promise.resolve({ data: [BIA], meta: { total: 1 } });
      return Promise.resolve([]);
    });
  });

  it('F4-10: fechar e abrir de novo traz o formulário em branco', async () => {
    render(<Agenda onSuccess={vi.fn()} />);
    await screen.findByRole('radio', { name: /Kit Som/ });
    preencher([['Nome do cliente', 'Carla Dias'], ['Contato (telefone ou e-mail)', '31966665555'], ...CAMPOS,
      ['Observações internas (opcional)', 'Pagou o sinal']]);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir reserva manual' }));

    await screen.findByRole('radio', { name: /Kit Som/ });
    for (const label of ['Nome do cliente', 'Contato (telefone ou e-mail)', 'Local do evento', 'Rua', 'Observações internas (opcional)']) {
      expect(screen.getByLabelText(label)).toHaveValue('');
    }
  });

  it('F4-11: com o cliente cadastrado escolhido, a reserva vai com o clientId dele', async () => {
    const onSuccess = vi.fn();
    render(<ManualBookingModal isOpen onClose={vi.fn()} onSuccess={onSuccess} />);
    fireEvent.click(await screen.findByRole('radio', { name: /Kit Som/ }));
    const busca = screen.getByLabelText('Buscar cliente cadastrado (opcional)');
    await waitFor(() => expect((busca as HTMLSelectElement).options.length).toBe(2));

    fireEvent.change(busca, { target: { value: BIA.id } });
    expect(screen.getByLabelText('Nome do cliente')).toHaveValue('Bia Lima');
    expect(screen.getByLabelText('Contato (telefone ou e-mail)')).toHaveValue('31955554444');

    preencher(CAMPOS);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Reserva' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(enviado()).toMatchObject({ clientId: 'cli-bia', clientName: 'Bia Lima' });
  });

  it('F4-11: sem escolher cliente, a reserva continua manual (sem clientId)', async () => {
    const onSuccess = vi.fn();
    render(<ManualBookingModal isOpen onClose={vi.fn()} onSuccess={onSuccess} />);
    fireEvent.click(await screen.findByRole('radio', { name: /Kit Som/ }));
    preencher([['Nome do cliente', 'Carla Dias'], ['Contato (telefone ou e-mail)', '31966665555'], ...CAMPOS]);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Reserva' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(enviado()).not.toHaveProperty('clientId');
  });
});
