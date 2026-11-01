import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { apiFetch, readHistoryWorkbook } = vi.hoisted(() => ({ apiFetch: vi.fn(), readHistoryWorkbook: vi.fn() }));
vi.mock('../../../services/api', () => ({ apiFetch }));
vi.mock('../../../utils/historyImport', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/historyImport')>()),
  readHistoryWorkbook,
}));

import { HistoryImportModal } from '../HistoryImportModal';

const sheetRow = (key: string, data: string, cliente: string, importar = 'Sim') => ({
  Importar: importar, 'Código': key, Data: data, Cliente: cliente, 'Valor (R$)': 400, Pagamento: 'Pago', Origem: '2022.txt',
});

// Fluxo da importação do histórico: lê a planilha, prévia sem gravar (dryRun), evento em dia que
// já tem reserva fica de fora até o admin marcar, e só então grava.
describe('HistoryImportModal', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    readHistoryWorkbook.mockResolvedValue([
      sheetRow('HIST-20220108-01', '08/01/2022', 'S.D.B (Cris)'),
      sheetRow('HIST-20220115-01', '15/01/2022', 'Samba do B'),
      sheetRow('HIST-20220122-01', '22/01/2022', 'Ignorada', 'Não'),
    ]);
    apiFetch.mockImplementation((_url: string, init: { body: string }) => {
      const { dryRun, rows } = JSON.parse(init.body);
      return Promise.resolve({
        dryRun, created: 0, updated: 0, unchanged: 0, errors: 0,
        rows: rows.map((r: { key: string }, index: number) => (
          r.key === 'HIST-20220108-01'
            ? { index, key: r.key, action: 'create' }
            : { index, key: r.key, action: 'create', sameDay: ['Ana (confirmada)'] }
        )),
      });
    });
  });

  it('prévia não grava; o evento "mesmo dia" só vai se marcado; depois grava e avisa a lista', async () => {
    const onImported = vi.fn();
    render(<HistoryImportModal isOpen onClose={vi.fn()} onImported={onImported} />);

    fireEvent.change(screen.getByLabelText('Planilha do histórico'), { target: { files: [new File(['x'], 'agenda.xlsx')] } });
    expect(await screen.findByText(/eventos prontos para conferir/)).toHaveTextContent('2 eventos');
    expect(screen.getByText(/1 linhas marcadas “Não”/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Gerar prévia' }));
    expect(await screen.findByText(/Prévia \(nada foi gravado ainda\)/)).toBeInTheDocument();
    expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toMatchObject({ dryRun: true });
    expect(apiFetch).toHaveBeenCalledTimes(1);

    // O de 15/01 cai num dia com reserva: fica de fora por padrão.
    expect(screen.getByRole('button', { name: 'Importar 1 reserva' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Importar 2 reservas' }));

    expect(await screen.findByText(/Importação concluída: 2 reservas criadas/)).toBeInTheDocument();
    const commit = JSON.parse(apiFetch.mock.calls[1][1].body);
    expect(commit.dryRun).toBe(false);
    expect(commit.rows.map((r: { key: string }) => r.key)).toEqual(['HIST-20220108-01', 'HIST-20220115-01']);
    expect(onImported).toHaveBeenCalled();
  });

  it('planilha sem a aba "Eventos" mostra o erro', async () => {
    readHistoryWorkbook.mockRejectedValue(new Error('A planilha não tem a aba "Eventos".'));
    render(<HistoryImportModal isOpen onClose={vi.fn()} onImported={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Planilha do histórico'), { target: { files: [new File(['x'], 'outra.xlsx')] } });
    expect(await screen.findByText('A planilha não tem a aba "Eventos".')).toBeInTheDocument();
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
