import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));

import { ManualBookingModal } from '../ManualBookingModal';

const KIT = { id: 'kit-1', name: 'Kit Som', price: 1200 };
const CAMPOS: Array<[string, string]> = [
  ['Nome do cliente', 'Carla Dias'], ['Contato (telefone ou e-mail)', '31966665555'],
  ['Início do evento', '2027-01-10T18:00'], ['Fim do evento', '2027-01-10T23:00'], ['Local do evento', 'Espaço VIP'],
  ['Rua', 'Av. Brasil'], ['Número', '123'], ['Bairro', 'Centro'], ['CEP', '30110-000'], ['Cidade', 'Belo Horizonte'], ['Estado', 'MG'],
];

const salvar = async (extra: Array<[string, string]> = []) => {
  const onSuccess = vi.fn();
  render(<ManualBookingModal isOpen onClose={vi.fn()} onSuccess={onSuccess} />);
  fireEvent.click(await screen.findByRole('radio', { name: /Kit Som/ }));
  for (const [label, value] of [...CAMPOS, ...extra]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Salvar Reserva' }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  const call = apiFetch.mock.calls.find((c) => c[0] === '/bookings' && c[1]?.method === 'POST');
  return JSON.parse(call![1].body as string) as Record<string, unknown>;
};

// D8a (aprovada em 02/11/2026): "Adicionar Reserva Manual" na agenda não tinha campo de valor e criava a
// reserva confirmada com R$ 0. Agora tem "Valor final (R$)", opcional; em branco, o servidor calcula.
describe('ManualBookingModal — "Valor final (R$)" (D8a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (opts?.method === 'POST') return Promise.resolve({ id: 'XP-NOVA' });
      if (url === '/kits') return Promise.resolve([KIT]);
      return Promise.resolve([]);
    });
  });

  it('com valor final: vai como totalPrice, sem o campo do formulário no corpo', async () => {
    const enviado = await salvar([['Valor final (R$)', '1800']]);
    expect(enviado).toMatchObject({ totalPrice: 1800, kitId: 'kit-1', status: 'CONFIRMED' });
    expect(enviado).not.toHaveProperty('finalValue');
  });

  it('sem valor final: o corpo não leva totalPrice (o servidor calcula pelo kit)', async () => {
    const enviado = await salvar();
    expect(enviado).not.toHaveProperty('totalPrice');
    expect(enviado).not.toHaveProperty('finalValue');
  });
});
