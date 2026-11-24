import React from 'react';
import { PageLayout } from '../components/layouts/PageLayout';
import { SUPPORT_EMAIL } from '../data/site';

// Achados (auditoria do design system): 2º <h1> duplicando o do PageLayout e um parágrafo de
// enchimento ("práticas semelhantes às usadas por grandes projetos") — removidos.
export const LicensesPage: React.FC = () => (
  <PageLayout title="Licenças" description="Licenças de software e direitos">
    {/* Onda 4 da auditoria de 19/11 (F3-20/F5-17, texto aprovado por Alyson em 24/11): antes mandava a um "repositório público", que
        não existe. */}
    <div className="max-w-4xl mx-auto bg-card rounded-xl p-8 border border-border">
      <p className="text-muted-foreground">
        Este site é feito com bibliotecas de código aberto (entre elas React, Vike e Tailwind CSS), cada uma usada
        conforme a sua licença. As fontes Inter e Outfit vêm do Google Fonts, com a licença SIL Open Font, e as fotos de
        capa dos guias vêm do Unsplash, pela licença do Unsplash. Dúvidas:{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-primary hover:underline underline-offset-4 break-all">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </div>
  </PageLayout>
);

export default LicensesPage;
