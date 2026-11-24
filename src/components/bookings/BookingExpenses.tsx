// Onda 3 da auditoria de 19/11 (F9-05): o pedido de reembolso da equipe (Roteiro → "Solicitar novo reembolso") era
// gravado e não aparecia em lugar nenhum do painel. Aqui a ficha da reserva lista os pedidos, e o dono aprova ou recusa
// os pendentes (o colaborador vê a decisão no Roteiro). O dono também recebe um e-mail a cada pedido.
import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { logger } from '@/utils/logger';
import { formatPrice } from '../../utils/typeSafeFormatters';
import { Badge, Button } from '../ui/StandardComponents';
import type { StandardVariant } from '../ui/StandardTypes';

export interface BookingExpenseRow {
  id: string;
  amount: number | string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  createdAt: string;
  collaborator?: { id?: string; name?: string | null } | null;
}

const STATUS: Record<string, { label: string; variant: StandardVariant }> = {
  PENDING: { label: 'Pendente', variant: 'warning' },
  APPROVED: { label: 'Aprovado', variant: 'success' },
  REJECTED: { label: 'Recusado', variant: 'destructive' },
};

const formatDay = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};

export function BookingExpenses({ bookingId, expenses }: { bookingId: string; expenses: BookingExpenseRow[] | null | undefined }) {
  const { addNotification } = useNotifications();
  const [rows, setRows] = useState<BookingExpenseRow[]>(expenses ?? []);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setRows(expenses ?? []);
  }, [expenses]);

  if (rows.length === 0) return null;

  const decide = async (expense: BookingExpenseRow, status: 'APPROVED' | 'REJECTED') => {
    setBusy(expense.id);
    try {
      const updated = await apiFetch<BookingExpenseRow>(`/bookings/${bookingId}/expenses/${expense.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setRows((prev) => prev.map((row) => (row.id === expense.id ? { ...row, status: updated?.status ?? status } : row)));
      addNotification({ type: 'success', title: status === 'APPROVED' ? 'Reembolso aprovado' : 'Reembolso recusado', message: 'O colaborador vê a decisão no Roteiro do evento.' });
    } catch (error) {
      logger.error('Erro ao decidir o reembolso', 'BookingExpenses', error);
      const reason = error instanceof Error && error.message ? error.message : 'Não foi possível gravar a decisão.';
      addNotification({ type: 'error', title: 'Reembolso', message: reason });
    } finally {
      setBusy(null);
    }
  };

  const pending = rows.filter((row) => row.status === 'PENDING').length;

  return (
    <section aria-labelledby="reembolsos-equipe" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Receipt className="text-primary h-6 w-6" aria-hidden="true" />
        <h3 id="reembolsos-equipe" className="text-lg font-bold text-foreground">Reembolsos da equipe</h3>
        {pending > 0 && <Badge variant="warning" size="sm">{pending} pendente{pending > 1 ? 's' : ''}</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">A foto do recibo, quando houver, chega pelo WhatsApp da produção.</p>
      <ul className="space-y-2">
        {rows.map((row) => {
          const status = STATUS[row.status] ?? { label: row.status, variant: 'ghost' as StandardVariant };
          return (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-3 border border-border rounded-xl bg-card">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground break-words">{row.description}</p>
                <p className="text-xs text-muted-foreground">
                  {row.collaborator?.name || 'Equipe'} · {formatDay(row.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">{formatPrice(Number(row.amount))}</span>
                <Badge variant={status.variant} size="sm">{status.label}</Badge>
                {row.status === 'PENDING' && (
                  <>
                    <Button size="sm" variant="outline" disabled={busy !== null} isLoading={busy === row.id} onClick={() => void decide(row, 'APPROVED')}>
                      Aprovar
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => void decide(row, 'REJECTED')}>
                      Recusar
                    </Button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
