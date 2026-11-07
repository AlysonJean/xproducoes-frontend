import { useState } from 'react';
import axios from 'axios';
import { Copy, MessageSquare, RefreshCw, Send } from 'lucide-react';
import { Alert, Button, ConfirmModal, Modal } from '@/components/ui/StandardComponents';
import { bookingAPI } from '@/services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { bookingPhone, toWhatsAppNumber } from '@/utils/bookingContact';
import { formatBrasiliaDate, openWhatsAppUntracked } from '@/utils/whatsapp';
import { proposalWhatsAppText } from '@/utils/whatsappTemplates';

// D11 (aprovada em 02/11/2026), parte (a): "a ficha ganha 'Enviar proposta': e-mail com o link seguro, WhatsApp com o
// mesmo link e registro do envio". O botão chama POST /admin/bookings/:id/proposal/send (o servidor grava, manda o
// e-mail pela fila e devolve o link) e abre a janela com o que aconteceu com o e-mail, a prévia do WhatsApp, "Abrir
// WhatsApp", "Copiar link" e "Gerar novo link". O WhatsApp é envio manual do admin: o botão abre o WhatsApp com o
// texto pronto, sem o evento de conversão do GA, dentro do próprio clique (depois de um await o navegador bloquearia
// a aba). Reenviar manda o mesmo link; "Gerar novo link" pede confirmação, porque o link anterior para de funcionar.

export type ProposalEmailStatus = 'queued' | 'skipped_no_email' | 'skipped_preference' | 'failed';

interface SendProposalResult {
  link: string;
  expiresAt: string;
  email: { status: ProposalEmailStatus };
}

const PROPOSAL_EMAIL_STATUS_TEXT: Record<ProposalEmailStatus, string> = {
  queued: 'O e-mail com o link entrou na fila de envio e chega ao cliente em instantes.',
  skipped_no_email: 'A reserva não tem e-mail do cliente. Mande o link pelo WhatsApp ou copie o link.',
  skipped_preference: 'O cliente desligou os e-mails de reserva no perfil. Mande o link pelo WhatsApp ou copie o link.',
  failed: 'O e-mail não saiu. Mande o link pelo WhatsApp ou copie o link.',
};

interface SendProposalPanelProps {
  booking: {
    id: string;
    eventTitle?: string | null;
    eventDate?: string | null;
    clientName?: string | null;
    clientContact?: string | null;
    client?: { phone?: string | null; user?: { name?: string | null; email?: string | null } | null } | null;
  };
  /** Depois de cada envio: a ficha recarrega (o rascunho vira pendente) e o histórico também. */
  onSent: () => void;
}

const errorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Não foi possível enviar a proposta agora. Tente de novo em alguns instantes.';
};

export function SendProposalPanel({ booking, onSent }: SendProposalPanelProps) {
  const { addNotification } = useNotifications();
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendProposalResult | null>(null);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const phone = toWhatsAppNumber(bookingPhone(booking));

  const send = async (rotate: boolean) => {
    setSending(true);
    try {
      const res = await bookingAPI.sendProposal(booking.id, rotate ? { rotate: true } : undefined);
      setResult(res.data as SendProposalResult);
      onSent();
      if (rotate) addNotification({ type: 'success', title: 'Novo link gerado', message: 'O link anterior deixou de funcionar.' });
    } catch (error) {
      addNotification({ type: 'error', title: 'Proposta não enviada', message: errorMessage(error) });
    } finally {
      setSending(false);
      setConfirmRotate(false);
    }
  };

  const whatsappText = result
    ? proposalWhatsAppText({
        clientName: booking.clientName || booking.client?.user?.name,
        eventTitle: booking.eventTitle,
        eventDate: booking.eventDate,
        link: result.link,
        validUntil: result.expiresAt,
      })
    : '';

  const copyLink = () => {
    if (!result) return;
    const fail = () =>
      addNotification({ type: 'warning', title: 'Não deu para copiar', message: 'Selecione o link na janela e copie.' });
    if (!navigator.clipboard?.writeText) {
      fail();
      return;
    }
    navigator.clipboard
      .writeText(result.link)
      .then(() => addNotification({ type: 'success', title: 'Link copiado', message: 'O link da proposta está na área de transferência.' }))
      .catch(fail);
  };

  const emailOk = result?.email.status === 'queued';

  return (
    <>
      <Button fullWidth size="sm" variant="secondary" onClick={() => send(false)} isLoading={sending && !result} leftIcon={<Send className="h-4 w-4" />}>
        Enviar proposta
      </Button>

      <Modal isOpen={result !== null} onClose={() => setResult(null)} title="Proposta enviada" size="md">
        {result && (
          <div className="space-y-5 pt-2">
            <Alert
              variant={emailOk ? 'success' : 'warning'}
              title={emailOk ? 'E-mail a caminho' : 'Sem e-mail'}
              description={PROPOSAL_EMAIL_STATUS_TEXT[result.email.status]}
            />
            <p className="text-sm text-foreground">A proposta vale até {formatBrasiliaDate(result.expiresAt)}.</p>

            <div className="space-y-1">
              <label htmlFor={`proposal-link-${booking.id}`} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Link da proposta
              </label>
              <input
                id={`proposal-link-${booking.id}`}
                readOnly
                value={result.link}
                onFocus={(e) => e.target.select()}
                className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-foreground"
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Mensagem do WhatsApp</p>
              <p className="whitespace-pre-line break-words rounded-md border border-border bg-muted/30 p-3 text-sm text-foreground" aria-label="Prévia da mensagem do WhatsApp">
                {whatsappText}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                fullWidth
                size="sm"
                variant="success"
                disabled={!phone}
                onClick={() => {
                  if (phone) openWhatsAppUntracked(phone, whatsappText);
                }}
                leftIcon={<MessageSquare className="h-4 w-4" />}
              >
                Abrir WhatsApp
              </Button>
              {!phone && <p className="text-xs text-muted-foreground">Sem telefone na reserva</p>}
              <Button fullWidth size="sm" variant="outline" onClick={copyLink} leftIcon={<Copy className="h-4 w-4" />}>
                Copiar link
              </Button>
              <Button fullWidth size="sm" variant="ghost" onClick={() => setConfirmRotate(true)} leftIcon={<RefreshCw className="h-4 w-4" />}>
                Gerar novo link
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={confirmRotate}
        onClose={() => setConfirmRotate(false)}
        onConfirm={() => send(true)}
        title="Gerar novo link?"
        message="O link anterior deixa de funcionar. O novo link vai por e-mail quando a reserva tem e-mail e o cliente não desligou os e-mails de reserva."
        variant="warning"
        isLoading={sending}
        confirmText="Gerar novo link"
        cancelText="Cancelar"
      />
    </>
  );
}
