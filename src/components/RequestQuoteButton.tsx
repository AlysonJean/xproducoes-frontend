import React from 'react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { Button } from './ui/StandardComponents';
import { useWhatsAppModal } from './modals/ModalContext';
import { getWhatsAppPhone } from '../utils/whatsapp';

// Achados (auditoria do design system): o telefone estava fixo aqui (e repetido no Header) em vez
// de vir de getWhatsAppPhone(), e o ícone era um envelope para uma ação que abre o WhatsApp.
export const RequestQuoteButton: React.FC<{ className?: string }> = ({ className }) => {
  const { openWhatsAppModal } = useWhatsAppModal();

  const handleOpenQuote = () => {
    openWhatsAppModal({
      phoneNumber: getWhatsAppPhone(),
      title: 'Pedir Orçamento',
      subject: 'Pedido de Orçamento',
      message:
        'Olá! Gostaria de receber um orçamento para o meu evento.\n- Tipo de evento: \n- Data (aprox.): \n- Cidade: Belo Horizonte, MG\n- Número aproximado de pessoas: \n- Observações / referências (link ou breve descrição): ',
    });
  };

  return (
    <Button
      variant="primary"
      size="sm"
      className={className}
      onClick={handleOpenQuote}
      aria-label="Solicitar orçamento"
    >
      <span className="flex items-center gap-2">
        <ChatBubbleLeftRightIcon className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
        <span className="hidden lg:inline">Solicitar Orçamento</span>
        <span className="lg:hidden">Orçamento</span>
      </span>
    </Button>
  );
};

export default RequestQuoteButton;
