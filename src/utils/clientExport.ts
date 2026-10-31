import type { Client } from '../types/types';
import { downloadSheet, formatDateTimeBR, toMoney, type SheetRow } from './spreadsheet';

// Exportação da tela de Clientes (o que estiver filtrado) para .xlsx. O botão "Exportar Dados
// (CSV)" existia sem onClick.
const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Ativo', INACTIVE: 'Inativo', SUSPENDED: 'Suspenso' };

export function clientsToSheetRows(clients: Client[]): SheetRow[] {
  return clients.map((c) => ({
    'Nome': c.name || '',
    'E-mail': c.email || '',
    'Telefone': c.phone || '',
    'Empresa': c.companyName || '',
    'CPF/CNPJ': c.taxId || '',
    'Status': STATUS_LABELS[c.status] || c.status || '',
    'VIP': c.isVip ? 'Sim' : 'Não',
    'Reservas': c.totalBookings ?? 0,
    'Total gasto (R$)': toMoney(c.totalSpent),
    'Cadastrado em': formatDateTimeBR(c.createdAt),
  }));
}

export async function downloadClientsSpreadsheet(clients: Client[]): Promise<void> {
  await downloadSheet(clientsToSheetRows(clients), 'Clientes', 'clientes.xlsx');
}
