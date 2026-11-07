import { useState } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { Checkbox } from '../ui/Checkbox';
import { openWhatsAppUntracked } from '../../utils/whatsapp';

interface WhatsAppConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Muda o status da reserva. Roda no mesmo clique, depois de abrir o WhatsApp (quando a caixa está marcada). */
  onConfirm: () => void;
  /** Título da janela e texto do botão da ação (ex.: "Cancelar a reserva?" e "Cancelar reserva"). */
  title: string;
  confirmText: string;
  variant?: 'default' | 'danger' | 'success';
  message: string;
  /** Número do cliente já com DDI; null quando a reserva não tem telefone válido. */
  contactNumber: string | null;
  isSending: boolean;
}

// Achado (auditoria do design system): a prévia abaixo era passada como children, mas o ConfirmModal
// descartava children — o admin confirmava o envio sem ver o texto que ia para o cliente. O
// ConfirmModal agora renderiza children; a prévia aparece.
// P14 (aprovada em 02/11/2026), parte 2: a troca de status da ficha (confirmar, cancelar, equipe a caminho) não
// depende mais do telefone. Antes, sem telefone, o botão parava com "Sem telefone" e a reserva não mudava; com
// telefone, o status só mudava junto com o WhatsApp. Agora o WhatsApp é uma caixa, marcada quando há telefone:
// desmarcada (ou sem telefone, "Sem telefone na reserva") só o status muda. O WhatsApp abre sem o evento de
// conversão do GA (D7: o clique do admin não é conversão de cliente) e no próprio clique, antes de qualquer espera.
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
}: WhatsAppConfirmationModalProps) => {
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const hasPhone = Boolean(contactNumber);
  const handleConfirm = () => {
    if (contactNumber && sendWhatsApp) openWhatsAppUntracked(contactNumber, message);
    onConfirm();
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title={title}
      size="md"
      isLoading={isSending}
      cancelText="Voltar"
      confirmText={confirmText}
      variant={variant}
    >
      <div className="space-y-3">
        <Checkbox
          label="Avisar o cliente pelo WhatsApp"
          description={hasPhone ? `Abre o WhatsApp do número ${contactNumber} com a mensagem abaixo.` : 'Sem telefone na reserva'}
          checked={hasPhone && sendWhatsApp}
          disabled={!hasPhone}
          onChange={(e) => setSendWhatsApp(e.target.checked)}
        />
        {hasPhone && (
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
