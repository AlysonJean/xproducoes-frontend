import { describe, it, expect, vi, beforeEach } from 'vitest';

const { XLSX } = vi.hoisted(() => ({
  XLSX: {
    utils: { json_to_sheet: vi.fn(() => ({ sheet: true })), book_new: vi.fn(() => ({ book: true })), book_append_sheet: vi.fn() },
    writeFile: vi.fn(),
  },
}));
vi.mock('xlsx-js-style', () => ({ default: XLSX, ...XLSX }));

import { bookingsToSheetRows, exportFileName, downloadBookingsSpreadsheet } from '../bookingExport';

// Exportação das reservas filtradas (fechamento mensal / notas fiscais). O botão "Exportar" da
// tela de Reservas existia sem ação nenhuma.
const registered = {
  id: 'XP-ANA-1', status: 'CONFIRMED', deliveryStatus: 'ON_THE_WAY', totalPrice: '1500.50',
  eventDate: '2026-10-31T23:00:00.000Z', eventEndDate: '2026-11-01T03:00:00.000Z', eventTitle: 'Casamento Ana',
  client: { id: 'c1', phone: '31988887777', companyName: 'Ana Eventos', user: { id: 'u1', name: 'Ana', email: 'ana@t.com' } },
  city: 'Belo Horizonte', discountAmount: '150', serviceValue: '900', createdAt: '2026-10-01T15:00:00.000Z',
};
const manual = {
  id: 'XP-MAN-2', status: 'PENDING', totalPrice: '0', eventDate: '2026-10-05T18:00:00.000Z',
  client: undefined as unknown as typeof registered.client, clientName: 'João (manual)', clientEmail: 'joao@t.com', clientContact: '3133334444',
};

describe('bookingsToSheetRows', () => {
  it('uma linha por reserva, com datas no horário de Brasília, rótulos em português e valores numéricos', () => {
    const [row] = bookingsToSheetRows([registered]);
    expect(row).toEqual({
      'Código': 'XP-ANA-1',
      'Data do evento': '31/10/2026 20:00',
      'Término': '01/11/2026 00:00',
      'Evento': 'Casamento Ana',
      'Cliente': 'Ana',
      'Empresa': 'Ana Eventos',
      'E-mail': 'ana@t.com',
      'Telefone': '31988887777',
      'Cidade': 'Belo Horizonte',
      'Status': 'Confirmado',
      'Entrega': 'A caminho',
      'Valor total (R$)': 1500.5,
      'Desconto (R$)': 150,
      'Valor de serviço (R$)': 900,
      'Criado em': '01/10/2026 12:00',
    });
  });

  it('reserva manual (sem cliente cadastrado) usa os dados de contato da própria reserva', () => {
    const [row] = bookingsToSheetRows([manual]);
    expect(row).toMatchObject({ 'Cliente': 'João (manual)', 'E-mail': 'joao@t.com', 'Telefone': '3133334444', 'Status': 'Pendente', 'Valor total (R$)': 0, 'Desconto (R$)': 0 });
  });
});

describe('exportFileName', () => {
  it.each([
    [{ startDate: '2026-10-01', endDate: '2026-10-31' }, 'reservas_2026-10-01_a_2026-10-31.xlsx'],
    [{}, 'reservas_todas.xlsx'],
    [{ startDate: '2026-10-01' }, 'reservas_desde_2026-10-01.xlsx'],
    [{ endDate: '2026-10-31' }, 'reservas_ate_2026-10-31.xlsx'],
  ])('%o → %s', (period, name) => {
    expect(exportFileName(period)).toBe(name);
  });
});

describe('downloadBookingsSpreadsheet', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gera a planilha "Reservas" com as linhas e o nome do período', async () => {
    await downloadBookingsSpreadsheet([registered, manual], { startDate: '2026-10-01', endDate: '2026-10-31' });
    expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ 'Código': 'XP-ANA-1' })]));
    expect((XLSX.utils.json_to_sheet.mock.calls[0] as unknown as [unknown[]])[0]).toHaveLength(2);
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith({ book: true }, { sheet: true }, 'Reservas');
    expect(XLSX.writeFile).toHaveBeenCalledWith({ book: true }, 'reservas_2026-10-01_a_2026-10-31.xlsx');
  });
});
