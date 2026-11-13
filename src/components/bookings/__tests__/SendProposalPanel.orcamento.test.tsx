import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

// Auditoria do orçamento (12/11/2026), decisão da dona de 12/11 (o link da proposta mostra sempre a reserva atual):
// - O2/C2: o "Enviar proposta" da ficha mostra o valor enviado (o do último envio, do resumo `proposal` da reserva, e o
//   deste envio, na janela) e avisa "A reserva mudou depois do último envio — reenvie a proposta".
// - O21/D9: com frete a combinar ou pedágio à parte, o botão pede confirmação antes de enviar (não bloqueia).
// Antes: nada dizia o que tinha sido enviado nem que a reserva mudou, e a proposta saía com "Frete a combinar R$ 0,00"
// sem aviso.
const { bookingAPI, addNotification } = vi.hoisted(() => ({
  bookingAPI: { sendProposal: vi.fn() },
  addNotification: vi.fn(),
}));
vi.mock('@/services/api', () => ({ bookingAPI }));
vi.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));

import { SendProposalPanel } from '../SendProposalPanel';

const LINK = 'https://www.xproducoeseeventos.com.br/proposta#token=p1.TESTE';
const freteACombinar = { description: 'Frete a combinar', quantity: 1, unitPrice: 0, discount: 0, total: 0, type: 'CUSTOM', equipmentId: null, serviceId: null, kitId: null, toArrange: 'freight' as const };
const kit = { description: 'Kit Som', quantity: 1, unitPrice: 900, discount: 0, total: 900, type: 'KIT', equipmentId: null, serviceId: null, kitId: 'k1' };
const reserva = (over: Record<string, unknown> = {}) => ({
  id: 'XP-ANA-1', eventTitle: 'Formatura da Ana', eventDate: '2027-12-21T01:00:00.000Z',
  clientName: 'Ana Souza', clientContact: '(31) 98888-7777', totalPrice: '900',
  pricing: { lines: [kit], itemsSubtotal: 900, couponDiscount: null, adjustment: 0, total: 900 },
  ...over,
});
const enviado = (over: Record<string, unknown> = {}) => ({
  data: { link: LINK, expiresAt: '2027-12-15T02:59:59.999Z', email: { status: 'queued' }, total: 900, toArrange: [], ...over },
});
const montar = (booking: ReturnType<typeof reserva>, onSent = vi.fn()) => {
  render(<SendProposalPanel booking={booking} onSent={onSent} />);
  return onSent;
};

beforeEach(() => {
  vi.clearAllMocks();
  bookingAPI.sendProposal.mockResolvedValue(enviado());
});

describe('SendProposalPanel — valor enviado e "a reserva mudou" (O2/C2)', () => {
  it('sem envio anterior: "Enviar proposta", sem aviso; a janela mostra o valor enviado', async () => {
    const onSent = montar(reserva());

    expect(screen.queryByText(/Último envio/)).toBeNull();
    expect(screen.queryByText(/A reserva mudou/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta' }));

    const janela = await screen.findByRole('dialog', { name: 'Proposta enviada' });
    expect(bookingAPI.sendProposal).toHaveBeenCalledWith('XP-ANA-1', undefined);
    // O texto da tela tem o espaço não separável do Intl; o getByText compara com os espaços normalizados.
    expect(within(janela).getByText('Valor enviado: R$ 900,00. O link mostra sempre a reserva atual: se ela mudar, reenvie.')).toBeInTheDocument();
    expect(within(janela).queryByText(/Enviada com/)).toBeNull();
    expect(onSent).toHaveBeenCalledTimes(1);
  });

  it('a reserva mudou depois do último envio: o aviso, o valor enviado da última vez e "Reenviar proposta"', async () => {
    montar(reserva({ proposal: { sentAt: '2027-12-08T13:30:00.000Z', sentTotal: 850, changedSinceSent: true, validUntil: '2027-12-15T02:59:59.999Z', expired: false } }));

    expect(screen.getByText('A reserva mudou depois do último envio — reenvie a proposta')).toBeInTheDocument();
    expect(screen.getByText(/Último envio: 08\/12\/2027 às 10:30 · valor enviado R\$\s850,00 · vale até 14\/12\/2027/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar proposta' }));

    await screen.findByRole('dialog', { name: 'Proposta enviada' });
    expect(bookingAPI.sendProposal).toHaveBeenCalledWith('XP-ANA-1', undefined);
  });

  it('enviada e sem mudança: nenhum aviso; envio de antes (sem o valor guardado): só a data', () => {
    const { unmount } = render(<SendProposalPanel booking={reserva({ proposal: { sentAt: '2027-12-08T13:30:00.000Z', sentTotal: 900, changedSinceSent: false } })} onSent={vi.fn()} />);
    expect(screen.queryByText(/A reserva mudou/)).toBeNull();
    expect(screen.getByText(/valor enviado R\$\s900,00/)).toBeInTheDocument();
    unmount();

    montar(reserva({ proposal: { sentAt: '2027-12-08T13:30:00.000Z', sentTotal: null, changedSinceSent: null } }));
    expect(screen.getByText('Último envio: 08/12/2027 às 10:30')).toBeInTheDocument();
    expect(screen.queryByText(/A reserva mudou/)).toBeNull();
  });

  it('proposta vencida (O11/D6): o painel diz que venceu e pede para reenviar', () => {
    montar(reserva({ proposal: { sentAt: '2027-12-08T13:30:00.000Z', sentTotal: 900, changedSinceSent: false, validUntil: '2027-12-15T02:59:59.999Z', expired: true } }));

    expect(screen.getByText('A proposta venceu')).toBeInTheDocument();
    expect(screen.getByText(/venceu em 14\/12\/2027/)).toBeInTheDocument();
  });
});

describe('SendProposalPanel — frete a combinar avisa antes de enviar (O21/D9)', () => {
  it('pede confirmação; "Voltar" não envia; "Enviar assim mesmo" envia o mesmo pedido de sempre', async () => {
    montar(reserva({ pricing: { lines: [kit, freteACombinar], itemsSubtotal: 900, couponDiscount: null, adjustment: 0, total: 900 } }));

    fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta' }));
    const aviso = await screen.findByRole('dialog', { name: 'Enviar com frete a combinar?' });
    expect(within(aviso).getByText(
      'A proposta tem frete a combinar. No link, o cliente vê esse item sem valor ("a combinar"/"à parte"), e o total não o inclui. Para mandar com o valor, edite a reserva antes de enviar.',
    )).toBeInTheDocument();
    expect(bookingAPI.sendProposal).not.toHaveBeenCalled();

    fireEvent.click(within(aviso).getByRole('button', { name: 'Voltar' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Enviar com frete a combinar?' })).toBeNull());
    expect(bookingAPI.sendProposal).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Enviar com frete a combinar?' })).getByRole('button', { name: 'Enviar assim mesmo' }));
    await waitFor(() => expect(bookingAPI.sendProposal).toHaveBeenCalledTimes(1));
    expect(bookingAPI.sendProposal).toHaveBeenCalledWith('XP-ANA-1', undefined);
  });

  it('a reserva sem `pricing` da API (só os itens gravados): a mesma marca, o mesmo aviso; pedágio à parte também', async () => {
    montar(reserva({
      pricing: undefined,
      items: [
        { description: 'Kit Som', quantity: 1, unitPrice: '900', totalPrice: '900', itemType: 'KIT' },
        { description: 'Pedágio à parte', quantity: 1, unitPrice: '0', totalPrice: '0', itemType: 'CUSTOM' },
      ],
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta' }));

    expect(await screen.findByRole('dialog', { name: 'Enviar com pedágio à parte?' })).toBeInTheDocument();
    expect(bookingAPI.sendProposal).not.toHaveBeenCalled();
  });

  it('o servidor viu a linha a combinar (a ficha estava desatualizada): a janela do envio avisa', async () => {
    bookingAPI.sendProposal.mockResolvedValue(enviado({ toArrange: ['freight', 'toll'] }));
    montar(reserva());

    fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta' }));

    const janela = await screen.findByRole('dialog', { name: 'Proposta enviada' });
    expect(within(janela).getByText('Enviada com frete a combinar e pedágio à parte')).toBeInTheDocument();
    expect(within(janela).getByText('No link, esses itens aparecem sem valor e ficam fora do total. Combine os valores com o cliente.')).toBeInTheDocument();
  });

  it('frete a combinar e pedágio à parte juntos: o aviso fala dos dois itens', async () => {
    const pedagio = { ...freteACombinar, description: 'Pedágio à parte', toArrange: 'toll' as const };
    montar(reserva({ pricing: { lines: [kit, freteACombinar, pedagio], itemsSubtotal: 900, couponDiscount: null, adjustment: 0, total: 900 } }));

    fireEvent.click(screen.getByRole('button', { name: 'Enviar proposta' }));

    const aviso = await screen.findByRole('dialog', { name: 'Enviar com frete a combinar e pedágio à parte?' });
    expect(within(aviso).getByText(
      'A proposta tem frete a combinar e pedágio à parte. No link, o cliente vê esses itens sem valor ("a combinar"/"à parte"), e o total não os inclui. Para mandar com o valor, edite a reserva antes de enviar.',
    )).toBeInTheDocument();
    expect(bookingAPI.sendProposal).not.toHaveBeenCalled();
  });
});
