// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import * as XLSX from 'xlsx';

// Trava: se a leitura voltar para o xlsx-js-style, os testes de leitura abaixo quebram.
vi.mock('xlsx-js-style', () => {
  const recusa = () => {
    throw new Error('a importação do histórico não pode ler com o xlsx-js-style (SheetJS 0.18.5)');
  };
  return { default: { read: recusa, utils: {} }, read: recusa, utils: {} };
});
import { HISTORY_SHEET, readHistoryWorkbook } from '../historyImport';

// Revisão de 25/11/2026 (plano de auditoria colado por Alyson): a importação do histórico lê a planilha com o SheetJS
// oficial 0.20.3 (frontend/vendor), e não mais com o xlsx-js-style, que traz por dentro o SheetJS 0.18.5 com falhas
// conhecidas ao ler arquivos (CVE-2023-30533, CVE-2024-22363). Aqui a leitura é de uma planilha .xlsx de verdade.

const planilha = (abas: Record<string, unknown[][]>) => {
  const book = XLSX.utils.book_new();
  for (const [nome, linhas] of Object.entries(abas)) XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(linhas), nome);
  const bytes = XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new File([bytes], 'agenda.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

describe('readHistoryWorkbook', () => {
  it('a biblioteca de leitura é o SheetJS oficial corrigido (0.20.2 ou mais nova)', () => {
    const [maior, menor, patch] = XLSX.version.split('.').map(Number);
    expect(maior * 10_000 + menor * 100 + patch).toBeGreaterThanOrEqual(2002);
  });

  it('lê a aba "Eventos" com os valores crus (data como número de série) e células vazias como ""', async () => {
    const arquivo = planilha({
      Leia: [['instruções']],
      [HISTORY_SHEET]: [
        ['Data', 'Cliente', 'Valor', 'Local'],
        [46000, 'Ana Souza', 1500, ''],
        [46001, 'Bruno', 980.5, 'Espaço VIP'],
      ],
    });

    expect(await readHistoryWorkbook(arquivo)).toEqual([
      { Data: 46000, Cliente: 'Ana Souza', Valor: 1500, Local: '' },
      { Data: 46001, Cliente: 'Bruno', Valor: 980.5, Local: 'Espaço VIP' },
    ]);
  });

  it('sem a aba "Eventos": avisa em português', async () => {
    await expect(readHistoryWorkbook(planilha({ Planilha1: [['Data'], [46000]] }))).rejects.toThrow('A planilha não tem a aba "Eventos".');
  });
});
