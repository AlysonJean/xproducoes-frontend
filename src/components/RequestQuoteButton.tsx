import React from 'react';
import { Link } from 'react-router-dom';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { buttonVariants } from './ui/StandardComponents';

// "Solicitar Orçamento" leva sempre ao briefing. Achado: o mesmo texto abria a janela do WhatsApp no
// topo do site, o WhatsApp direto na home e a página de contato nas páginas por cidade. Quem prefere
// conversar segue com o botão flutuante do WhatsApp; quem já montou o carrinho usa "Seguir para Orçamento".
export const RequestQuoteButton: React.FC<{ className?: string }> = ({ className }) => (
  <Link to="/briefing" className={buttonVariants({ size: 'sm', className })} aria-label="Solicitar orçamento">
    <ClipboardDocumentListIcon className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
    <span className="hidden lg:inline">Solicitar Orçamento</span>
    <span className="lg:hidden">Orçamento</span>
  </Link>
);

export default RequestQuoteButton;
