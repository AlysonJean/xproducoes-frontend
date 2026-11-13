import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));

import { ManualBookingModal } from '../ManualBookingModal';

// Auditoria do orçamento (12/11/2026). O15/C7: o único campo "Observações (opcional)" da Reserva manual ia para notes,
// que sai nos PDFs e na área do cliente. Agora há "Observações para o cliente" e "Observações internas". O12/A7/C6: o
// campo do valor não dizia se incluía o frete. O1: o fim antes do início só era recusado pelo servidor, com a mensagem
// genérica da validação.
const KIT = { id: 'kit-1', name: 'Kit Som', price: 1200 };
const CAMPOS: Array<[string, string]> = [
  ['Nome do cliente', 'Carla Dias'], ['Contato (telefone ou e-mail)', '31966665555'],
  ['Início do evento', '2027-01-10T18:00'], ['Fim do evento', '2027-01-10T23:00'], ['Local do evento', 'Espaço VIP'],
  ['Rua', 'Av. Brasil'], ['Número', '123'], ['Bairro', 'Centro'], ['CEP', '30110-000'], ['Cidade', 'Belo Horizonte'], ['Estado', 'MG'],
];

const abrir = async () => {
  const onSuccess = vi.fn();
  render(<ManualBookingModal isOpen onClose={vi.fn()} onSuccess={onSuccess} />);
  fireEvent.click(await screen.findByRole('radio', { name: /Kit Som/ }));
  return onSuccess;
};
const preencher = (campos: Array<[string, string]>) => {
  for (const [label, value] of campos) fireEvent.change(screen.getByLabelText(label), { target: { value } });
};
const enviado = () => {
  const call = apiFetch.mock.calls.find((c) => c[0] === '/bookings' && c[1]?.method === 'POST');
  return call ? (JSON.parse(call[1].body as string) as Record<string, unknown>) : null;
};

describe('ManualBookingModal — observações, valor dos itens e datas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (opts?.method === 'POST') return Promise.resolve({ id: 'XP-NOVA' });
      if (url === '/kits') return Promise.resolve([KIT]);
      return Promise.resolve([]);
    });
  });

  it('"Observações para o cliente" vai em notes e "Observações internas" em internalNotes', async () => {
    const onSuccess = await abrir();
    expect(screen.getByText('Saem na proposta, nos PDFs e na área do cliente.')).toBeInTheDocument();
    expect(screen.getByText('Só a equipe vê. Não saem na proposta nem para o cliente.')).toBeInTheDocument();
    preencher([...CAMPOS, ['Observações para o cliente (opcional)', 'Montagem às 15 h'], ['Observações internas (opcional)', 'Pagou o sinal por PIX']]);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar Reserva' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());

    expect(enviado()).toMatchObject({ notes: 'Montagem às 15 h', internalNotes: 'Pagou o sinal por PIX' });
  });

  it('sem observações internas, o corpo não leva o campo', async () => {
    const onSuccess = await abrir();
    expect(screen.getByLabelText('Observações internas (opcional)')).toHaveValue('');
    preencher(CAMPOS);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Reserva' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(enviado()).not.toHaveProperty('internalNotes');
  });

  it('o campo do valor diz que o frete e o pedágio ficam à parte', async () => {
    await abrir();
    expect(screen.getByLabelText('Valor dos itens, sem frete (R$)')).toBeInTheDocument();
    expect(screen.getByText(/O frete e o pedágio, quando houver, entram à parte: total = itens \+ frete \+ pedágio\./)).toBeInTheDocument();
  });

  it('fim antes do início: erro no campo e nada enviado', async () => {
    await abrir();
    preencher([...CAMPOS, ['Fim do evento', '2027-01-10T17:00']]);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Reserva' }));
    expect(await screen.findByText('O fim precisa ser depois do início.')).toBeInTheDocument();
    expect(enviado()).toBeNull();
  });
});
