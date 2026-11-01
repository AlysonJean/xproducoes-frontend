import { MessageCircle } from 'lucide-react';
import { Button } from './StandardComponents';
import { useWhatsAppModal } from '../modals/ModalContext';

interface AskOnWhatsAppButtonProps {
  /** Ex.: "Equipamento", "Kit", "Serviço". */
  kind: string;
  itemName: string;
}

// "Tirar dúvida no WhatsApp" nas páginas de produto: abre o WhatsAppModal (antes montado no
// ModalManager e nunca aberto) com o item já identificado no assunto da mensagem.
export function AskOnWhatsAppButton({ kind, itemName }: AskOnWhatsAppButtonProps) {
  const { openWhatsAppModal } = useWhatsAppModal();

  return (
    <Button
      variant="outline"
      size="lg"
      fullWidth
      leftIcon={<MessageCircle className="h-5 w-5" aria-hidden="true" />}
      onClick={() =>
        openWhatsAppModal({
          title: 'Tirar dúvida no WhatsApp',
          subject: `${kind}: ${itemName}`,
          message: 'Olá! Tenho uma dúvida sobre este item: ',
        })
      }
    >
      Tirar dúvida no WhatsApp
    </Button>
  );
}
