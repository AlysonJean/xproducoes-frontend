import { ConfirmModal } from './ConfirmModal';
import { normalizePhone, openWhatsApp } from '../../utils/whatsapp';

interface WhatsAppConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
  contactNumber: string;
  isSending: boolean;
}

// Achado (auditoria do design system): a prévia abaixo era passada como children, mas o ConfirmModal
// descartava children — o admin confirmava o envio sem ver o texto que ia para o cliente. O
// ConfirmModal agora renderiza children; a prévia aparece.
export const WhatsAppConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  message,
  contactNumber,
  isSending,
}: WhatsAppConfirmationModalProps) => {
  if (!isOpen) return null;

  const handleSend = () => {
    openWhatsApp(normalizePhone(contactNumber), message);
    onConfirm();
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleSend}
      title="Confirmar Envio de Mensagem"
      size="md"
      isLoading={isSending}
      cancelText="Cancelar"
      confirmText="Enviar via WhatsApp"
      variant="success"
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          A seguinte mensagem será enviada para o número{' '}
          <strong className="text-foreground">{contactNumber}</strong>:
        </p>
        {/* tabIndex: texto longo rola — quem usa teclado precisa conseguir rolar a prévia. */}
        <blockquote
          tabIndex={0}
          className="max-h-72 overflow-y-auto rounded-md border border-border bg-muted p-4 text-sm text-foreground whitespace-pre-wrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {message}
        </blockquote>
      </div>
    </ConfirmModal>
  );
};
