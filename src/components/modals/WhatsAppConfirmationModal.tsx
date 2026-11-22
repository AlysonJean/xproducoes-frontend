import { useState } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { Checkbox } from '../ui/Checkbox';
import { Textarea } from '../ui/Textarea';
import { reserveWhatsAppTab, sendWhatsAppToTab } from '../../utils/whatsapp';

interface WhatsAppConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Muda o status da reserva. Devolve false quando a troca não deu certo (a janela fica aberta e o WhatsApp não abre).
   * Com askReason, recebe o motivo digitado.
   */
  onConfirm: (reason?: string) => Promise<boolean | void> | boolean | void;
  /** Título da janela e texto do botão da ação (ex.: "Cancelar a reserva?" e "Cancelar reserva"). */
  title: string;
  confirmText: string;
  variant?: 'default' | 'danger' | 'success';
  message: string;
  /** Número do cliente já com DDI; null quando a reserva não tem telefone válido. */
  contactNumber: string | null;
  isSending: boolean;
  /** Auditoria do status (21/11/2026), C7: pede o motivo (o cancelamento grava nas observações internas). */
  askReason?: boolean;
}

// Achado (auditoria do design system): a prévia abaixo era passada como children, mas o ConfirmModal
// descartava children — o admin confirmava o envio sem ver o texto que ia para o cliente. O
// ConfirmModal agora renderiza children; a prévia aparece.
// P14 (aprovada em 02/11/2026), parte 2: a troca de status da ficha (confirmar, cancelar, equipe a caminho) não
// depende mais do telefone. Antes, sem telefone, o botão parava com "Sem telefone" e a reserva não mudava; com
// telefone, o status só mudava junto com o WhatsApp. Agora o WhatsApp é uma caixa, marcada quando há telefone:
// desmarcada (ou sem telefone, "Sem telefone na reserva") só o status muda. O WhatsApp abre sem o evento de
// conversão do GA (D7: o clique do admin não é conversão de cliente).
// Auditoria do status (21/11/2026), M7: a troca grava primeiro e o WhatsApp só abre se ela deu certo (a aba é
// reservada no clique, ver utils/whatsapp.ts). Antes, com o kit em conflito, a reserva continuava pendente e a aba já
// estava aberta com "sua reserva está confirmada".
export const WhatsAppConfirmationModal = (props: WhatsAppConfirmationModalProps) => {
  // O conteúdo só existe com a janela aberta: cada abertura começa com a caixa do WhatsApp marcada.
  if (!props.isOpen) return null;
  return <OpenWhatsAppConfirmation {...props} />;
};

const OpenWhatsAppConfirmation = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  confirmText,
  variant = 'default',
  message,
  contactNumber,
  isSending,
  askReason = false,
}: WhatsAppConfirmationModalProps) => {
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const hasPhone = Boolean(contactNumber);
  const handleConfirm = async () => {
    const motivo = reason.trim();
    if (askReason && !motivo) {
      setReasonError('Escreva o motivo do cancelamento.');
      return;
    }
    const wantsWhatsApp = Boolean(contactNumber && sendWhatsApp);
    const tab = wantsWhatsApp ? reserveWhatsAppTab() : null;
    let ok: boolean | void;
    try {
      ok = await onConfirm(askReason ? motivo : undefined);
    } catch {
      // Revisão de 21/11/2026: quem chama mostra o erro; a aba em branco não fica para trás.
      ok = false;
    }
    if (ok === false) {
      tab?.close();
      return;
    }
    if (wantsWhatsApp && contactNumber) sendWhatsAppToTab(tab, contactNumber, message);
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => void handleConfirm()}
      title={title}
      size="md"
      isLoading={isSending}
      cancelText="Voltar"
      confirmText={confirmText}
      variant={variant}
    >
      <div className="space-y-3">
        {askReason && (
          <Textarea
            label="Motivo do cancelamento"
            description="Fica nas observações internas da reserva (o cliente não vê)."
            value={reason}
            maxLength={500}
            rows={3}
            error={reasonError ?? undefined}
            onChange={(e) => {
              setReason(e.target.value);
              if (reasonError) setReasonError(null);
            }}
          />
        )}
        <Checkbox
          label="Avisar o cliente pelo WhatsApp"
          description={hasPhone ? `Abre o WhatsApp do número ${contactNumber} com a mensagem abaixo.` : 'Sem telefone na reserva'}
          checked={hasPhone && sendWhatsApp}
          disabled={!hasPhone}
          onChange={(e) => setSendWhatsApp(e.target.checked)}
        />
        {/* Teste de ponta a ponta (21/11/2026): a prévia ficava na tela depois de desmarcar a caixa, como se a mensagem
            fosse sair. Agora ela aparece só com a caixa marcada. */}
        {hasPhone && sendWhatsApp && (
          // tabIndex: texto longo rola — quem usa teclado precisa conseguir rolar a prévia.
          <blockquote
            tabIndex={0}
            aria-label="Prévia da mensagem do WhatsApp"
            className="max-h-72 overflow-y-auto rounded-md border border-border bg-muted p-4 text-sm text-foreground whitespace-pre-wrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {message}
          </blockquote>
        )}
      </div>
    </ConfirmModal>
  );
};
