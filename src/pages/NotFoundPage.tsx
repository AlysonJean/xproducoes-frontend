// src/pages/NotFoundPage.tsx

import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PageLayout } from '../components/layouts/PageLayout';

export const NotFoundPage = () => {
  return (
    <PageLayout title="Página não encontrada" description="O recurso solicitado não existe.">
      <Helmet>
        <title>Página Não Encontrada | X Produções</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="flex flex-col items-center justify-center text-center p-8">
        <h1 className="text-8xl sm:text-9xl font-black text-muted-foreground">404</h1>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mt-4">Página Não Encontrada</h2>
        <p className="text-muted-foreground mt-2">
          Lamentamos, mas a página que procura não existe ou foi movida.
        </p>
        <Link
          to="/"
          className="mt-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Voltar à Página Inicial
        </Link>
      </div>
    </PageLayout>
  );
};
