import React from 'react';
import { PageLayout } from '../components/layouts/PageLayout';

export const LicensesPage: React.FC = () => (
  <PageLayout title="Licenças" description="Licenças de software e direitos">
    <div className="max-w-4xl mx-auto bg-card rounded-xl p-8 border border-border">
      <h1 className="text-2xl font-bold mb-4">Licenças</h1>
      <p className="text-muted-foreground">Lista de bibliotecas e licenças utilizadas no projeto. Para obter a lista completa, consulte o repositório público ou contate a equipe técnica.</p>
      <p className="text-muted-foreground mt-4">Adotamos práticas de compliance e inventário de dependências semelhantes às usadas por grandes projetos para garantir segurança e licenciamento adequado.</p>
    </div>
  </PageLayout>
);

export default LicensesPage;
