import { useState, type Ref } from 'react';
import axios from 'axios';
import { Copy, MessageSquare, RefreshCw, Send } from 'lucide-react';
import { Alert, Button, ConfirmModal, Modal } from '@/components/ui/StandardComponents';
import { bookingAPI } from '@/services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { bookingPhone, toWhatsAppNumber } from '@/utils/bookingContact';
import { bookingPricing, toArrangeKinds, type PricedBookingLike, type ToArrangeKind } from '@/utils/bookingPricing';
import type { ProposalSummaryView } from '@/utils/bookingStatus';
import { formatPrice } from '@/utils/formatPrice';
import { formatBrasiliaDate, openWhatsAppUntracked } from '@/utils/whatsapp';
import { proposalWhatsAppText } from '@/utils/whatsappTemplates';

// D11 (aprovada em 02/11/2026), parte (a): "a ficha ganha 'Enviar proposta': e-mail com o link seguro, WhatsApp com o
// mesmo link e registro do envio". O botão chama POST /admin/bookings/:id/proposal/send (o servidor grava, manda o
// e-mail pela fila e devolve o link) e abre a janela com o que aconteceu com o e-mail, a prévia do WhatsApp, "Abrir
// WhatsApp", "Copiar link" e "Gerar novo link". O WhatsApp é envio manual do admin: o botão abre o WhatsApp com o
// texto pronto, sem o evento de conversão do GA, dentro do próprio clique (depois de um await o navegador bloquearia
// a aba). Reenviar manda o mesmo link; "Gerar novo link" pede confirmação, porque o link anterior para de funcionar.
// Auditoria do orçamento (12/11/2026), decisão da dona de 12/11 (o link mostra sempre a reserva atual):
// - O2/C2: o painel mostra o valor enviado (o da última vez, do resumo `proposal` da reserva, e o deste envio, na
//   janela) e avisa "A reserva mudou depois do último envio — reenvie a proposta" (proposal.changedSinceSent, conta do
//   servidor). Com envio anterior, o botão vira "Reenviar proposta" (7 dias novos de validade).
// - O21/D9: com frete a combinar ou pedágio à parte (linha marcada pelo servidor), o botão pede confirmação antes de
//   enviar. Não bloqueia: o frete pode não ter saído (Google fora, endereço não achado) e o admin pode querer mandar já
//   e combinar o valor depois; a janela do envio repete o aviso com o que o servidor viu na hora (a ficha pode estar
//   desatualizada, outra aba).

export type ProposalEmailStatus = 'queued' | 'skipped_no_email' | 'skipped_preference' | 'failed';

interface SendProposalResult {
  link: string;
  expiresAt: string;
  email: { status: ProposalEmailStatus };
  /** O total que o link mostrava no envio (servidor novo; pode faltar durante o deploy). */
  total?: number;
  toArrange?: ToArrangeKind[];
}

const PROPOSAL_EMAIL_STATUS_TEXT: Record<ProposalEmailStatus, string> = {
  queued: 'O e-mail com o link entrou na fila de envio e chega ao cliente em instantes.',
  skipped_no_email: 'A reserva não tem e-mail do cliente. Mande o link pelo WhatsApp ou copie o link.',
  skipped_preference: 'O cliente desligou os e-mails de reserva no perfil. Mande o link pelo WhatsApp ou copie o link.',
  failed: 'O e-mail não saiu. Mande o link pelo WhatsApp ou copie o link.',
};

const TO_ARRANGE_NAME: Record<ToArrangeKind, string> = { freight: 'frete a combinar', toll: 'pedágio à parte' };
const toArrangeNames = (kinds: ToArrangeKind[]) => kinds.map((kind) => TO_ARRANGE_NAME[kind]).join(' e ');

/** O aviso antes de enviar com linha sem preço. */
const toArrangeConfirmText = (kinds: ToArrangeKind[]): string =>
  kinds.length > 1
    ? `A proposta tem ${toArrangeNames(kinds)}. No link, o cliente vê esses itens sem valor ("a combinar"/"à parte"), e o total não os inclui. Para mandar com o valor, edite a reserva antes de enviar.`
    : `A proposta tem ${toArrangeNames(kinds)}. No link, o cliente vê esse item sem valor ("a combinar"/"à parte"), e o total não o inclui. Para mandar com o valor, edite a reserva antes de enviar.`;

interface SendProposalPanelProps {
  booking: PricedBookingLike & {
    id: string;
    eventTitle?: string | null;
    eventDate?: string | null;
    clientName?: string | null;
    clientContact?: string | null;
    client?: { phone?: string | null; user?: { name?: string | null; email?: string | null } | null } | null;
    /** O resumo da proposta que a ficha recebe da API (GET /bookings/:id). */
    proposal?: ProposalSummaryView | null;
  };
  /** Depois de cada envio: a ficha recarrega (o rascunho vira pendente) e o histórico também. */
  onSent: () => void;
  /**
   * Auditoria do orçamento (12/11/2026), E8: o botão de envio ("Enviar proposta"/"Reenviar proposta"), para a ficha
   * acionar o mesmo envio pelo "Enviar link pelo WhatsApp" do cabeçalho e pôr o foco nele quando vem da Proposta
   * Rápida, sem depender da ordem dos botões do painel.
   */
  sendButtonRef?: Ref<HTMLButtonElement>;
}

const errorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Não foi possível enviar a proposta agora. Tente de novo em alguns instantes.';
};

const sentAtText = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function SendProposalPanel({ booking, onSent, sendButtonRef }: SendProposalPanelProps) {
  const { addNotification } = useNotifications();
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendProposalResult | null>(null);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [confirmToArrange, setConfirmToArrange] = useState(false);
  const phone = toWhatsAppNumber(bookingPhone(booking));
  const lastSent = booking.proposal?.sentAt ? booking.proposal : null;
  // O21/D9: as linhas sem preço da reserva como a ficha a tem (marcadas pelo servidor em `pricing`).
  const toArrange = toArrangeKinds(bookingPricing(booking).lines);

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
      setConfirmToArrange(false);
    }
  };

  const startSend = () => {
    if (toArrange.length > 0) setConfirmToArrange(true);
    else void send(false);
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
  const sentToArrange = result?.toArrange ?? [];

  return (
    <>
      {lastSent && (
        <p className="text-xs text-muted-foreground">
          Último envio: {sentAtText.format(new Date(lastSent.sentAt as string)).replace(', ', ' às ')}
          {typeof lastSent.sentTotal === 'number' ? ` · valor enviado ${formatPrice(lastSent.sentTotal)}` : ''}
          {lastSent.validUntil ? ` · ${lastSent.expired ? 'venceu em' : 'vale até'} ${formatBrasiliaDate(lastSent.validUntil)}` : ''}
        </p>
      )}
      {lastSent?.changedSinceSent === true && (
        <Alert
          variant="warning"
          title="A reserva mudou depois do último envio — reenvie a proposta"
          description="O link já mostra a reserva atual, mas o cliente não foi avisado. Reenviar manda o mesmo link e dá 7 dias novos de validade."
        />
      )}
      {lastSent?.changedSinceSent !== true && lastSent?.expired === true && (
        <Alert variant="warning" title="A proposta venceu" description="Reenvie para o link voltar a abrir, com 7 dias novos de validade." />
      )}
      <Button ref={sendButtonRef} fullWidth size="sm" variant="secondary" onClick={startSend} isLoading={sending && !result} leftIcon={<Send className="h-4 w-4" />}>
        {lastSent ? 'Reenviar proposta' : 'Enviar proposta'}
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
            {typeof result.total === 'number' && (
              <p className="text-sm text-foreground">
                Valor enviado: {formatPrice(result.total)}. O link mostra sempre a reserva atual: se ela mudar, reenvie.
              </p>
            )}
            {sentToArrange.length > 0 && (
              <Alert
                variant="warning"
                title={`Enviada com ${toArrangeNames(sentToArrange)}`}
                description={
                  sentToArrange.length > 1
                    ? 'No link, esses itens aparecem sem valor e ficam fora do total. Combine os valores com o cliente.'
                    : 'No link, esse item aparece sem valor e fica fora do total. Combine o valor com o cliente.'
                }
              />
            )}

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
        isOpen={confirmToArrange}
        onClose={() => setConfirmToArrange(false)}
        onConfirm={() => send(false)}
        title={`Enviar com ${toArrangeNames(toArrange)}?`}
        message={toArrangeConfirmText(toArrange)}
        variant="warning"
        isLoading={sending}
        confirmText="Enviar assim mesmo"
        cancelText="Voltar"
      />

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
