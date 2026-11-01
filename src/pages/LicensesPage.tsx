import React from 'react';
import { PageLayout } from '../components/layouts/PageLayout';

// Achados (auditoria do design system): 2º <h1> duplicando o do PageLayout e um parágrafo de
// enchimento ("práticas semelhantes às usadas por grandes projetos") — removidos.
export const LicensesPage: React.FC = () => (
  <PageLayout title="Licenças" description="Licenças de software e direitos">
    <div className="max-w-4xl mx-auto bg-card rounded-xl p-8 border border-border">
      <p className="text-muted-foreground">
        Lista de bibliotecas e licenças utilizadas no projeto. Para obter a lista completa, consulte o repositório
        público ou contate a equipe técnica.
      </p>
    </div>
  </PageLayout>
);

export default LicensesPage;
