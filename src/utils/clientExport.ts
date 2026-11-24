import type { Client } from '../types/types';
import { downloadSheet, formatDateTimeBR, toMoney, type SheetRow } from './spreadsheet';

// Exportação da tela de Clientes (o que estiver filtrado) para .xlsx. O botão "Exportar Dados
// (CSV)" existia sem onClick.
// O mesmo limite do cartão "VIP" da tela de Clientes (pages/admin/ClientListPage.tsx).
export const VIP_SPENT_THRESHOLD = 5000;
const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Ativo', INACTIVE: 'Inativo', SUSPENDED: 'Suspenso' };

export function clientsToSheetRows(clients: Client[]): SheetRow[] {
  return clients.map((c) => ({
    'Nome': c.name || '',
    'E-mail': c.email || '',
    'Telefone': c.phone || '',
    'Empresa': c.companyName || '',
    // Onda 4 da auditoria de 19/11 (F2-05): saiu a coluna CPF/CNPJ (a API não manda o documento) e o VIP segue a regra do cartão.
    'Status': STATUS_LABELS[c.status] || c.status || '',
    'VIP': (c.totalSpent || 0) > VIP_SPENT_THRESHOLD ? 'Sim' : 'Não',
    'Reservas': c.totalBookings ?? 0,
    'Total gasto (R$)': toMoney(c.totalSpent),
    'Cadastrado em': formatDateTimeBR(c.createdAt),
  }));
}

export async function downloadClientsSpreadsheet(clients: Client[]): Promise<void> {
  await downloadSheet(clientsToSheetRows(clients), 'Clientes', 'clientes.xlsx');
}
