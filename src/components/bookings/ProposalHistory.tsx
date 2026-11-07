import { useEffect, useState } from 'react';
import { bookingAPI } from '@/services/api';
import type { ProposalEmailStatus } from './SendProposalPanel';

// D11 (aprovada em 02/11/2026): o cartão Histórico da ficha mostra cada envio da proposta (quando, o que e por quem),
// lido de GET /admin/bookings/:id/history (registros da reserva, só campos seguros: nunca o link nem o nonce). Lê
// uma vez ao abrir a ficha e de novo depois de cada envio (refreshKey); sem consulta periódica.
// P14 (aprovada em 02/11/2026), parte 2, "sabendo se saiu": também cada e-mail da reserva que saiu ou falhou de vez
// (EMAIL_SENT/EMAIL_FAILED, só o tipo, nunca o destinatário) e cada "Pedir avaliação no Google" (REVIEW_REQUESTED).

interface HistoryEntry {
  action: string;
  timestamp: string;
  actorName: string | null;
  details: { emailStatus?: ProposalEmailStatus; rotated?: boolean; type?: string; channel?: string };
}

const SENT_TEXT: Record<ProposalEmailStatus, string> = {
  queued: 'Proposta enviada por e-mail',
  skipped_no_email: 'Link da proposta gerado (a reserva não tem e-mail)',
  skipped_preference: 'Link da proposta gerado (o cliente desligou os e-mails de reserva)',
  failed: 'Link da proposta gerado (o e-mail não saiu)',
};

// Qual e-mail da reserva (o tipo do job da fila no servidor).
const EMAIL_TYPE_TEXT: Record<string, string> = {
  'booking-confirmation': 'E-mail de pedido recebido',
  'booking-proposal': 'E-mail de proposta',
  'booking-approved': 'E-mail de confirmação',
  'booking-reminder': 'E-mail de lembrete da véspera',
  'booking-review-request': 'E-mail de avaliação',
  'crew-assignment': 'E-mail de escala da equipe',
};

const SHOWN_ACTIONS = ['PROPOSAL_SENT', 'EMAIL_SENT', 'EMAIL_FAILED', 'REVIEW_REQUESTED'];

const dateTimeBR = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

const entryText = (entry: HistoryEntry) => {
  if (entry.action === 'EMAIL_SENT' || entry.action === 'EMAIL_FAILED') {
    const label = (entry.details.type && EMAIL_TYPE_TEXT[entry.details.type]) || 'E-mail';
    return `${label} ${entry.action === 'EMAIL_SENT' ? 'enviado' : 'falhou'}`;
  }
  if (entry.action === 'REVIEW_REQUESTED') return 'Avaliação no Google pedida pelo WhatsApp';
  const text = (entry.details.emailStatus && SENT_TEXT[entry.details.emailStatus]) || 'Proposta enviada';
  return entry.details.rotated ? `${text}, com link novo` : text;
};

export function ProposalHistory({ bookingId, refreshKey }: { bookingId: string; refreshKey: number }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await bookingAPI.getAuditHistory(bookingId);
        if (!active) return;
        setEntries(Array.isArray(res.data) ? (res.data as HistoryEntry[]) : []);
        setFailed(false);
      } catch {
        if (active) setFailed(true);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [bookingId, refreshKey]);

  if (failed) {
    return (
      <li className="text-sm text-muted-foreground">Não foi possível carregar os envios desta reserva.</li>
    );
  }

  return (
    <>
      {entries
        .filter((entry) => SHOWN_ACTIONS.includes(entry.action))
        .map((entry, index) => (
          <li key={`${entry.timestamp}-${entry.action}-${index}`} className="flex gap-3">
            <span className={`h-2 w-2 mt-1.5 rounded-full shrink-0 ${entry.action === 'EMAIL_FAILED' ? 'bg-destructive' : 'bg-info'}`} aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">{entryText(entry)}</p>
              <p className="text-sm text-muted-foreground">
                {dateTimeBR.format(new Date(entry.timestamp)).replace(', ', ' às ')}
                {entry.actorName ? ` · por ${entry.actorName}` : ''}
              </p>
            </div>
          </li>
        ))}
    </>
  );
}
