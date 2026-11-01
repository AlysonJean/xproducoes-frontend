import { useState, type ChangeEvent } from 'react';
import { apiFetch } from '../../services/api';
import { Modal, Button, Alert } from '../ui/StandardComponents';
import {
  parseHistoryRows,
  readHistoryWorkbook,
  type HistoryImportRow,
  type ParsedHistoryRow,
} from '../../utils/historyImport';

// Importação do histórico (agendas antigas) — Reservas → "Importar histórico".
// 1) lê a planilha no navegador; 2) prévia no servidor (dryRun, nada gravado); 3) importa.
// Reservas entram CONCLUÍDAS, sem e-mail/WhatsApp; reimportar a planilha corrigida atualiza.

type RowResult = {
  index: number;
  key?: string;
  action: 'create' | 'update' | 'unchanged' | 'error';
  changes?: string[];
  errors?: string[];
  sameDay?: string[];
};
type ImportResult = { dryRun: boolean; created: number; updated: number; unchanged: number; errors: number; rows: RowResult[] };

const BATCH = 100; // limite do endpoint por requisição
const LIST_LIMIT = 50;

const chunk = <T,>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

async function sendBatches(rows: HistoryImportRow[], dryRun: boolean, onProgress: (done: number, total: number) => void) {
  const batches = chunk(rows, BATCH);
  const results: RowResult[] = [];
  for (const [i, batch] of batches.entries()) {
    const res = await apiFetch<ImportResult>('/admin/bookings/import-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun, rows: batch }),
    });
    results.push(...res.rows.map((r) => ({ ...r, key: r.key ?? batch[r.index]?.key })));
    onProgress(i + 1, batches.length);
  }
  return results;
}

interface HistoryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

export const HistoryImportModal = ({ isOpen, onClose, onImported }: HistoryImportModalProps) => {
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<{ rows: ParsedHistoryRow[]; skipped: number } | null>(null);
  const [preview, setPreview] = useState<RowResult[] | null>(null);
  const [include, setInclude] = useState<Set<string>>(new Set()); // linhas "mesmo dia" liberadas
  const [busy, setBusy] = useState<'' | 'reading' | 'preview' | 'import'>('');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ created: number; updated: number } | null>(null);

  const valid = parsed?.rows.filter((r) => r.row) ?? [];
  const sheetErrors = parsed?.rows.filter((r) => !r.row) ?? [];
  const byAction = (a: RowResult['action']) => preview?.filter((r) => r.action === a) ?? [];
  const sameDay = preview?.filter((r) => r.action === 'create' && r.sameDay?.length) ?? [];
  const toSend = preview
    ? valid.filter((v) => {
        const r = preview.find((p) => p.key === v.key);
        if (!r || (r.action !== 'create' && r.action !== 'update')) return false;
        return !(r.sameDay?.length && !include.has(v.key));
      })
    : [];

  const reset = () => {
    setFileName(''); setParsed(null); setPreview(null); setInclude(new Set());
    setBusy(''); setProgress(''); setError(null); setDone(null);
  };
  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    reset();
    setFileName(file.name);
    setBusy('reading');
    try {
      setParsed(parseHistoryRows(await readHistoryWorkbook(file)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível ler a planilha.');
    } finally {
      setBusy('');
    }
  };

  const handlePreview = async () => {
    setError(null);
    setBusy('preview');
    try {
      const rows = valid.map((v) => v.row as HistoryImportRow);
      setPreview(await sendBatches(rows, true, (d, t) => setProgress(`Conferindo lote ${d} de ${t}…`)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao gerar a prévia.');
    } finally {
      setBusy(''); setProgress('');
    }
  };

  const handleImport = async () => {
    setError(null);
    setBusy('import');
    try {
      const results = await sendBatches(toSend.map((v) => v.row as HistoryImportRow), false, (d, t) => setProgress(`Gravando lote ${d} de ${t}…`));
      setDone({
        created: results.filter((r) => r.action === 'create').length,
        updated: results.filter((r) => r.action === 'update').length,
      });
      onImported();
    } catch (err) {
      // Lotes já gravados ficam; reimportar é seguro (não duplica).
      setError(`${err instanceof Error ? err.message : 'Falha ao importar.'} Os lotes anteriores já foram gravados — gere a prévia de novo para continuar de onde parou.`);
      setPreview(null);
    } finally {
      setBusy(''); setProgress('');
    }
  };

  const toggle = (key: string) => setInclude((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const label = (key?: string) => {
    const v = valid.find((x) => x.key === key);
    return v ? `${v.date} — ${v.client}` : key || '';
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title="Importar histórico de eventos" size="lg" closeOnOverlayClick={!busy} closeOnEscape={!busy}>
      <div className="space-y-5 text-sm">
        <p className="text-muted-foreground">
          Envie a planilha de revisão das agendas (aba “Eventos”). As reservas entram como <strong>concluídas</strong>, sem
          avisar nenhum cliente. Linhas com “Importar = Não” ficam de fora. Se você importar de novo a planilha corrigida,
          as reservas já importadas são atualizadas, sem duplicar.
        </p>

        {!done && (
          <label className="block">
            <span className="sr-only">Planilha do histórico</span>
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFile}
              disabled={!!busy}
              aria-label="Planilha do histórico"
              className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-white"
            />
          </label>
        )}
        {fileName && !done && <p className="text-xs text-muted-foreground">Arquivo: {fileName}</p>}
        {busy === 'reading' && <p>Lendo a planilha…</p>}
        {progress && <p>{progress}</p>}
        {error && <Alert variant="error">{error}</Alert>}

        {parsed && !done && (
          <div className="rounded-xl border border-border p-4 space-y-1">
            <p><strong>{valid.length}</strong> eventos prontos para conferir</p>
            {parsed.skipped > 0 && <p>{parsed.skipped} linhas marcadas “Não” (ignoradas)</p>}
            {sheetErrors.length > 0 && (
              <div className="pt-2">
                <p className="text-destructive font-medium">{sheetErrors.length} linhas com erro na planilha (corrija e envie de novo, ou elas ficam de fora):</p>
                <ul className="mt-1 max-h-40 overflow-y-auto text-xs list-disc pl-5">
                  {sheetErrors.slice(0, LIST_LIMIT).map((r) => (
                    <li key={r.line}>Linha {r.line} ({r.key || 'sem código'}): {r.errors.join('; ')}</li>
                  ))}
                  {sheetErrors.length > LIST_LIMIT && <li>… e mais {sheetErrors.length - LIST_LIMIT}</li>}
                </ul>
              </div>
            )}
          </div>
        )}

        {preview && !done && (
          <div className="rounded-xl border border-border p-4 space-y-3">
            <p className="font-medium">Prévia (nada foi gravado ainda)</p>
            <ul className="space-y-1">
              <li>Novas: <strong>{byAction('create').length}</strong></li>
              <li>Já importadas, com mudança: <strong>{byAction('update').length}</strong></li>
              <li>Já importadas, sem mudança: <strong>{byAction('unchanged').length}</strong></li>
              {byAction('error').length > 0 && <li className="text-destructive">Recusadas pelo servidor: <strong>{byAction('error').length}</strong></li>}
            </ul>

            {byAction('error').length > 0 && (
              <ul className="max-h-32 overflow-y-auto text-xs list-disc pl-5 text-destructive">
                {byAction('error').slice(0, LIST_LIMIT).map((r) => <li key={`${r.key}-${r.index}`}>{label(r.key)}: {r.errors?.join('; ')}</li>)}
              </ul>
            )}

            {byAction('update').length > 0 && (
              <details>
                <summary className="cursor-pointer">Ver o que muda nas já importadas</summary>
                <ul className="mt-1 max-h-32 overflow-y-auto text-xs list-disc pl-5">
                  {byAction('update').slice(0, LIST_LIMIT).map((r) => <li key={r.key}>{label(r.key)}: {r.changes?.join(', ')}</li>)}
                </ul>
              </details>
            )}

            {sameDay.length > 0 && (
              <div>
                <p className="text-amber-600 font-medium">
                  {sameDay.length} eventos caem num dia que já tem reserva na plataforma. Ficam de fora, a menos que você marque:
                </p>
                <ul className="mt-1 max-h-40 overflow-y-auto text-xs space-y-1">
                  {sameDay.map((r) => (
                    <li key={r.key}>
                      <label className="flex items-start gap-2">
                        <input type="checkbox" checked={include.has(r.key as string)} onChange={() => toggle(r.key as string)} />
                        <span>{label(r.key)} — já existe: {r.sameDay?.join(', ')}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {done && (
          <Alert variant="success">
            Importação concluída: {done.created} reservas criadas e {done.updated} atualizadas.
          </Alert>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={close} disabled={!!busy}>{done ? 'Fechar' : 'Cancelar'}</Button>
          {!done && parsed && !preview && (
            <Button onClick={handlePreview} disabled={!!busy || valid.length === 0} isLoading={busy === 'preview'}>
              Gerar prévia
            </Button>
          )}
          {!done && preview && (
            <Button onClick={handleImport} disabled={!!busy || toSend.length === 0} isLoading={busy === 'import'}>
              Importar {toSend.length} {toSend.length === 1 ? 'reserva' : 'reservas'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
