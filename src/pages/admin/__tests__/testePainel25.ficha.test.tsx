// Teste do painel admin de 25/11/2026 (relatório "Teste do painel admin — 25/11/2026"), a ficha da reserva:
// - A-04: confirmar deixava a ficha "Pendente" até recarregar. A resposta da confirmação já muda a ficha, e uma leitura
//   antiga que volte depois da nova não grava por cima;
// - A-05: a exclusão recusada (pagamento registrado) diz o motivo do servidor;
// - A-15: reserva que não existe: frase em português, sem "Request failed" nem "Tentar de novo";
// - A-02: com o pagamento Parcial, quanto entrou e quanto falta (ou onde lançar);
// - M-07: confirmar sem pagamento registrado avisa na janela.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { bookingAPI, addNotification, formMock } = vi.hoisted(() => ({
  bookingAPI: { getById: vi.fn(), updateStatus: vi.fn(), updateDeliveryStatus: vi.fn(), delete: vi.fn(), confirmWithDetails: vi.fn() },
  addNotification: vi.fn(),
  // O Editar de mentira: um botão que chama o onSuccess (a ficha relê a reserva), para simular uma leitura lenta.
  formMock: { render: (_props: { onSuccess?: () => void }) => null as unknown },
}));
vi.mock('../../../services/api', () => ({ bookingAPI, api: { post: vi.fn(), delete: vi.fn() } }));
vi.mock('../../../contexts/NotificationContext', () => ({ useNotifications: () => ({ addNotification }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'Admin', role: 'ADMIN' } }) }));
vi.mock('@/hooks/useCollaborators', () => ({ useCollaborators: () => ({ collaborators: [], fetchCollaborators: vi.fn().mockResolvedValue(undefined) }) }));
vi.mock('@/components/forms/AdminBookingForm', () => ({ AdminBookingForm: (props: { onSuccess?: () => void }) => formMock.render(props) }));
vi.mock('@/components/bookings/BookingCollaborators', () => ({ BookingCollaborators: () => null }));
vi.mock('@/components/bookings/BookingFinancialSummary', () => ({ BookingFinancialSummary: () => null }));
vi.mock('../../../components/modals/EventManagement', () => ({ EventManagement: () => null }));
vi.mock('react-ga4', () => ({ default: { event: vi.fn() } }));

import BookingDetailPage from '../BookingDetailPage';

const PENDENTE = {
  id: 'XP-20261125-0434-MB5Q', status: 'PENDING', deliveryStatus: 'PENDING', totalPrice: '2160', paymentStatus: null,
  eventDate: '2027-01-09T22:00:00.000Z', eventEndDate: '2027-01-10T02:00:00.000Z', location: 'Espaço VIP',
  clientId: null, client: null, clientName: 'TESTE ADMIN', clientContact: '31999760416', clientEmail: 'teste@cliente.test',
  attachments: [], equipments: [], services: [], eventCollaborators: [],
};

const abrir = async () => {
  render(
    <MemoryRouter initialEntries={['/admin/reservas/XP']}>
      <Routes><Route path="/admin/reservas/:id" element={<BookingDetailPage />} /></Routes>
    </MemoryRouter>,
  );
};

// A linha dos selos logo abaixo do título (status, entrega, pagamento); a lista das etapas da entrega fica fora.
const badgeStatus = () => screen.getByRole('heading', { name: /^Reserva / }).nextElementSibling as HTMLElement;

describe('Ficha da reserva — teste do painel de 25/11/2026', () => {
  beforeEach(() => vi.clearAllMocks());

  it('A-04: confirmar muda a ficha para Confirmada na hora, mesmo com a releitura atrasada', async () => {
    // 1ª leitura (abrir): Pendente. A releitura depois de confirmar demora e, quando volta, já diz Confirmada.
    let soltarReleitura: (value: unknown) => void = () => {};
    bookingAPI.getById
      .mockResolvedValueOnce({ data: PENDENTE })
      .mockImplementationOnce(() => new Promise((resolve) => { soltarReleitura = resolve; }));
    bookingAPI.confirmWithDetails.mockResolvedValue({ data: { ...PENDENTE, status: 'CONFIRMED' } });
    await abrir();
    await screen.findByRole('heading', { name: /^Reserva / });

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }));
    const janela = await screen.findByRole('dialog');
    fireEvent.click(within(janela).getByRole('button', { name: 'Confirmar reserva' }));

    // Sem esperar a releitura: a ficha já mostra Confirmada, a janela fechou e o aviso saiu.
    await waitFor(() => expect(within(badgeStatus()).getByText('Confirmada')).toBeInTheDocument());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar reserva' })).not.toBeInTheDocument();
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Reserva confirmada' }));

    soltarReleitura({ data: { ...PENDENTE, status: 'CONFIRMED' } });
    await waitFor(() => expect(bookingAPI.getById).toHaveBeenCalledTimes(2));
    expect(within(badgeStatus()).getByText('Confirmada')).toBeInTheDocument();
  });

  it('A-04: uma leitura antiga (lenta) que volta depois da mais nova é ignorada: a ficha não volta para Pendente', async () => {
    formMock.render = ({ onSuccess }) => <button type="button" onClick={onSuccess}>salvar edição (de mentira)</button>;
    let soltarAntiga: (value: unknown) => void = () => {};
    bookingAPI.getById
      .mockResolvedValueOnce({ data: PENDENTE }) // abrir
      .mockImplementationOnce(() => new Promise((resolve) => { soltarAntiga = resolve; })) // releitura do Editar (lenta)
      .mockResolvedValueOnce({ data: { ...PENDENTE, status: 'CONFIRMED' } }); // releitura da confirmação
    bookingAPI.confirmWithDetails.mockResolvedValue({ data: { ...PENDENTE, status: 'CONFIRMED' } });
    await abrir();
    await screen.findByRole('heading', { name: /^Reserva / });

    // 1) salvar no Editar: a ficha relê a reserva, e essa leitura demora.
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'salvar edição (de mentira)' }));
    await waitFor(() => expect(bookingAPI.getById).toHaveBeenCalledTimes(2));
    // 2) confirmar: a ficha relê de novo, e essa leitura (a mais nova) volta logo, Confirmada.
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirmar reserva' }));
    await waitFor(() => expect(bookingAPI.getById).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(within(badgeStatus()).getByText('Confirmada')).toBeInTheDocument());
    // 3) a leitura antiga volta agora, ainda Pendente: é ignorada.
    soltarAntiga({ data: PENDENTE });
    await new Promise((r) => setTimeout(r, 20));
    expect(within(badgeStatus()).getByText('Confirmada')).toBeInTheDocument();
    expect(within(badgeStatus()).queryByText('Pendente')).not.toBeInTheDocument();
    formMock.render = () => null;
  });

  it('A-05: exclusão recusada (409): o aviso traz o motivo do servidor', async () => {
    bookingAPI.getById.mockResolvedValue({ data: { ...PENDENTE, status: 'CANCELLED', paymentStatus: 'PARTIAL' } });
    const motivo = 'Esta reserva tem pagamento registrado (Parcial) e por isso fica guardada, sem exclusão. Ela já está cancelada: não precisa fazer mais nada.';
    bookingAPI.delete.mockRejectedValue(Object.assign(new Error('Request failed with status code 409'), { response: { status: 409, data: { message: motivo } } }));
    await abrir();
    await screen.findByRole('heading', { name: /^Reserva / });

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(addNotification).toHaveBeenCalledWith({ type: 'error', title: 'A reserva não foi excluída', message: motivo }));
  });

  it('A-15: reserva que não existe (404): frase em português, sem "Tentar de novo"', async () => {
    bookingAPI.getById.mockRejectedValue(Object.assign(new Error('Request failed with status code 404'), { response: { status: 404, data: {} } }));
    await abrir();

    expect(await screen.findByText('Reserva não encontrada')).toBeInTheDocument();
    expect(screen.getByText('Não existe reserva com este código. Confira o endereço ou volte para a lista de reservas.')).toBeInTheDocument();
    expect(screen.queryByText(/Request failed/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voltar para reservas' })).toBeInTheDocument();
  });

  it('A-15: outra falha (rede, 500): diz o motivo e oferece "Tentar de novo"', async () => {
    bookingAPI.getById.mockRejectedValueOnce(Object.assign(new Error('Network Error'), { response: undefined }));
    await abrir();

    expect(await screen.findByText('Não foi possível abrir a reserva')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it.each([
    [{ paymentStatus: 'PARTIAL', paidAmount: '500.00' }, /Recebido: R\$\s500,00 · Falta receber: R\$\s1\.660,00/],
    [{ paymentStatus: 'PARTIAL', paidAmount: null }, /Valor recebido não informado: use Editar para lançar quanto já entrou\./],
    [{ paymentStatus: 'PARTIAL', paidAmount: null, contractSummary: { state: 'ACCEPTED' } }, /Recebido: o sinal do contrato/],
  ])('A-02: pagamento Parcial mostra o que entrou e o que falta (%#)', async (extra, texto) => {
    bookingAPI.getById.mockResolvedValue({ data: { ...PENDENTE, status: 'CONFIRMED', ...extra } });
    await abrir();

    expect((await screen.findByTestId('partial-payment')).textContent).toMatch(texto);
  });

  it('A-02: fora do Parcial, a linha não aparece', async () => {
    bookingAPI.getById.mockResolvedValue({ data: { ...PENDENTE, status: 'CONFIRMED', paymentStatus: 'PAID' } });
    await abrir();
    await screen.findByRole('heading', { name: /^Reserva / });
    expect(screen.queryByTestId('partial-payment')).not.toBeInTheDocument();
  });

  it('M-07: confirmar sem pagamento registrado avisa na janela; com pagamento, não', async () => {
    bookingAPI.getById.mockResolvedValue({ data: PENDENTE });
    await abrir();
    await screen.findByRole('heading', { name: /^Reserva / });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }));
    expect(within(await screen.findByRole('dialog')).getByText('Nenhum pagamento registrado')).toBeInTheDocument();
  });

  it('M-07: com o pagamento já registrado, a janela não avisa', async () => {
    bookingAPI.getById.mockResolvedValue({ data: { ...PENDENTE, paymentStatus: 'PARTIAL', paidAmount: '100' } });
    await abrir();
    await screen.findByRole('heading', { name: /^Reserva / });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reserva' }));
    expect(within(await screen.findByRole('dialog')).queryByText('Nenhum pagamento registrado')).not.toBeInTheDocument();
  });
});
