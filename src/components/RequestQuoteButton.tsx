import React from 'react';
import { Button } from './ui/StandardComponents';
import { useWhatsAppModal } from './modals/ModalContext';

export const RequestQuoteButton: React.FC<{ className?: string }> = ({ className }) => {
  const { openWhatsAppModal } = useWhatsAppModal();

  const handleOpenQuote = () => {
    openWhatsAppModal({
      phoneNumber: '+55 31 98925 2272',
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
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span className="hidden lg:inline">Solicitar Orçamento</span>
        <span className="lg:hidden">Orçamento</span>
      </span>
    </Button>
  );
};

export default RequestQuoteButton;
