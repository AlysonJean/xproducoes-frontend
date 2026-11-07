import { CalendarClock, CheckCircle2, MessageSquare, Star } from 'lucide-react';
import { Button, Card } from '@/components/ui/StandardComponents';
import { bookingPhone, toWhatsAppNumber } from '@/utils/bookingContact';
import { formatBrasiliaDate, openWhatsAppUntracked } from '@/utils/whatsapp';
import {
  bookingConfirmedWhatsAppText,
  eventReminderWhatsAppText,
  requestReceivedWhatsAppText,
  reviewRequestWhatsAppText,
  type StageBooking,
} from '@/utils/whatsappTemplates';

// P14 (aprovada em 02/11/2026), parte 2: "o WhatsApp ao cliente vira botões 'Enviar no WhatsApp' com texto pronto em
// cada etapa". Pedido do cliente pendente: "Responder no WhatsApp"; reserva confirmada: confirmação e lembrete da
// véspera; concluída: "Pedir avaliação no Google". (A proposta é o "Enviar proposta" da D11.) Cada botão abre o
// WhatsApp no próprio clique (antes de qualquer espera, senão o navegador bloqueia a aba), sem o evento de conversão
// do GA (D7), com o texto de utils/whatsappTemplates. Sem telefone válido na reserva, os botões ficam desligados.

export interface StageWhatsAppBooking extends StageBooking {
  status?: string;
  clientContact?: string | null;
  client?: { phone?: string | null; user?: { name?: string | null; email?: string | null } | null } | null;
  creator?: { role?: string | null } | null;
  reviewRequestSentAt?: string | null;
  /** Link de avaliação do Google que a ficha traz da API (GOOGLE_REVIEW_LINK); null sem ele. */
  reviewLink?: string | null;
}

interface StageWhatsAppPanelProps {
  booking: StageWhatsAppBooking;
  /** "Pedir avaliação no Google": o WhatsApp já abriu; a ficha registra o pedido no servidor. */
  onReviewRequested: () => void;
}

const NO_PHONE = 'Sem telefone na reserva';

/** Cartão "WhatsApp ao cliente" com os botões da etapa; null quando a etapa não tem botão de WhatsApp. */
export function StageWhatsAppPanel({ booking, onReviewRequested }: StageWhatsAppPanelProps) {
  const phone = toWhatsAppNumber(bookingPhone(booking));
  const status = booking.status || 'PENDING';
  // Pedido do cliente: pendente e criado pela conta de um cliente (a regra do resumo de pedidos aguardando resposta).
  const clientRequest = status === 'PENDING' && booking.creator?.role === 'CLIENT';
  if (!clientRequest && status !== 'CONFIRMED' && status !== 'COMPLETED') return null;

  const open = (text: string) => {
    if (phone) openWhatsAppUntracked(phone, text);
  };
  const reviewLink = booking.reviewLink || null;
  const requestedAt = formatBrasiliaDate(booking.reviewRequestSentAt);

  return (
    <Card className="p-6">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">WhatsApp ao cliente</h3>
      <div className="space-y-2">
        {clientRequest && (
          <Button variant="outline" size="sm" fullWidth className="justify-start" disabled={!phone} onClick={() => open(requestReceivedWhatsAppText(booking))} leftIcon={<MessageSquare className="h-4 w-4" />}>
            Responder no WhatsApp
          </Button>
        )}
        {status === 'CONFIRMED' && (
          <>
            <Button variant="outline" size="sm" fullWidth className="justify-start" disabled={!phone} onClick={() => open(bookingConfirmedWhatsAppText(booking))} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
              Enviar confirmação no WhatsApp
            </Button>
            <Button variant="outline" size="sm" fullWidth className="justify-start" disabled={!phone} onClick={() => open(eventReminderWhatsAppText(booking))} leftIcon={<CalendarClock className="h-4 w-4" />}>
              Lembrete da véspera no WhatsApp
            </Button>
          </>
        )}
        {status === 'COMPLETED' && (
          <>
            <Button
              variant="outline"
              size="sm"
              fullWidth
              className="justify-start"
              disabled={!phone || !reviewLink}
              onClick={() => {
                if (!phone || !reviewLink) return;
                // Abre já, com o link que a ficha trouxe; o registro no servidor vem depois, sem segurar o clique.
                openWhatsAppUntracked(phone, reviewRequestWhatsAppText(booking, reviewLink));
                onReviewRequested();
              }}
              leftIcon={<Star className="h-4 w-4" />}
            >
              Pedir avaliação no Google
            </Button>
            {!reviewLink && <p className="text-xs text-muted-foreground">Configure o link de avaliação do Google</p>}
            {requestedAt && <p className="text-xs text-muted-foreground">Avaliação pedida em {requestedAt}</p>}
          </>
        )}
        {!phone && <p className="text-xs text-muted-foreground">{NO_PHONE}</p>}
      </div>
    </Card>
  );
}
