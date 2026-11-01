// src/pages/NotFoundPage.tsx

import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PageLayout } from '../components/layouts/PageLayout';
import { buttonVariants } from '../components/ui/StandardComponents';

// Achados (auditoria do design system): a página tinha dois <h1> (o do PageLayout e o "404") e
// um <h2> repetindo "Página Não Encontrada"; o <title> também era definido duas vezes. Agora o
// título vem só do PageLayout e o "404" é decorativo.
export const NotFoundPage = () => {
  return (
    <PageLayout title="Página não encontrada" description="O recurso solicitado não existe.">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="flex flex-col items-center justify-center text-center p-8">
        <p className="text-8xl sm:text-9xl font-black text-muted-foreground" aria-hidden="true">404</p>
        <p className="text-muted-foreground mt-4">
          Lamentamos, mas a página que você procura não existe ou foi movida.
        </p>
        <Link to="/" className={buttonVariants({ size: 'md', className: 'mt-8' })}>
          Voltar à página inicial
        </Link>
      </div>
    </PageLayout>
  );
};
