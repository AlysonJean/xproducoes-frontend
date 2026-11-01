import React from 'react';
import { PageLayout } from '../components/layouts/PageLayout';
import { SUPPORT_EMAIL } from '../data/site';

// Achados (auditoria do design system): a página tinha um 2º <h1> (o PageLayout já renderiza o
// título), a classe `text-md` (não existe) e um parágrafo de enchimento ("abordagem similar à
// usada por equipes de produto em empresas líderes") — removidos. O e-mail virou link.
export const CareersPage: React.FC = () => {
  return (
    <PageLayout title="Carreiras" description="Trabalhe conosco — vagas e cultura da empresa">
      <div className="max-w-4xl mx-auto bg-card rounded-xl p-8 border border-border space-y-6">
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-4">Trabalhe na X Produções e Eventos</h2>
          <p className="text-muted-foreground">
            Procuramos pessoas apaixonadas por áudio, luz e eventos. Valorizamos autonomia, vontade de aprender e foco no cliente.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">Benefícios</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Ambiente colaborativo e técnico</li>
            <li>Oportunidades de crescimento e formação</li>
            <li>Remuneração compatível com o mercado</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-2">Vagas</h2>
          <p className="text-muted-foreground">
            Envie seu currículo para{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-primary hover:underline underline-offset-4 break-all">
              {SUPPORT_EMAIL}
            </a>{' '}
            com o título da vaga no assunto.
          </p>
        </section>
      </div>
    </PageLayout>
  );
};

export default CareersPage;
