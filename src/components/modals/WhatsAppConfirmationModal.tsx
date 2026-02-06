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
      message=""
      size="md"
      isLoading={isSending}
      cancelText="Cancelar"
      confirmText="Enviar via WhatsApp"
      variant="success"
    >
      <div className="space-y-4">
        <p className="text-muted-foreground">
          A seguinte mensagem será enviada para o número {contactNumber}.
        </p>
        <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-muted-foreground text-sm">
          {message}
        </div>
      </div>
    </ConfirmModal>
  );
};
