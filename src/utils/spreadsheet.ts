// Exportações do painel em .xlsx (xlsx-js-style, carregada só no clique). .xlsx em vez de CSV:
// CSV com vírgula abre numa coluna só no Excel em português, e números saem como números.

export type SheetRow = Record<string, string | number>;

export async function downloadSheet(rows: SheetRow[], sheetName: string, fileName: string): Promise<void> {
  const XLSX = await import('xlsx-js-style');
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, sheetName);
  XLSX.writeFile(book, fileName);
}

// Horário da empresa, independente do fuso de quem exporta.
const dateTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export const formatDateTimeBR = (value?: string | Date | null) =>
  (value ? dateTime.format(new Date(value)).replace(',', '') : '');

export const toMoney = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};
