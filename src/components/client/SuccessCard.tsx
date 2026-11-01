import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card } from '../ui/StandardComponents';
import { ClientPage } from './ClientPage';

// Tela de confirmação comum (pedido de orçamento enviado / reserva realizada). Achado (auditoria do
// design system): as duas telas tinham estruturas diferentes — uma com borda e h1 na cor da marca,
// outra sem; botões em linha sem quebra (estouravam a 375px) numa, empilhados na outra.
interface SuccessCardProps {
  title: string;
  children?: React.ReactNode;
  /** Botões/links de ação: lado a lado no desktop, empilhados (largura total) no celular. */
  actions?: React.ReactNode;
}

export const SuccessCard: React.FC<SuccessCardProps> = ({ title, children, actions }) => (
  <ClientPage width="2xl">
    <Card className="space-y-6 p-6 text-center shadow-xl sm:p-8">
      <div
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success"
        aria-hidden="true"
      >
        <CheckCircle2 className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
      {children && <div className="space-y-2 text-muted-foreground">{children}</div>}
      {actions && (
        <div className="flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">{actions}</div>
      )}
    </Card>
  </ClientPage>
);

export default SuccessCard;
