import React from 'react';
import { PageLayout } from '../components/layouts/PageLayout';
import { SUPPORT_EMAIL } from '../data/site';

// Achados (auditoria do design system): 2º <h1> duplicando o do PageLayout, classe `text-md`
// (não existe), um "Kit de imprensa" listado sem nenhum arquivo para baixar e um parágrafo de
// enchimento ("padrões de grandes players") — removidos. O pedido de materiais vai por e-mail.
export const PressPage: React.FC = () => {
  return (
    <PageLayout title="Imprensa" description="Materiais e contato para a imprensa">
      <div className="max-w-4xl mx-auto bg-card rounded-xl p-8 border border-border space-y-6">
        <p className="text-muted-foreground">
          Solicitações de imprensa, entrevistas, logotipos e imagens: entre em contato por{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-primary hover:underline underline-offset-4 break-all">
            {SUPPORT_EMAIL}
          </a>
          . Enviamos os materiais conforme a pauta.
        </p>
      </div>
    </PageLayout>
  );
};

export default PressPage;
