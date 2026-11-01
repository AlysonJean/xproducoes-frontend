import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PageLayout } from '../components/layouts/PageLayout';
import { Alert, Card } from '../components/ui/StandardComponents';
import { PRIVACY_CONTACT_EMAIL } from '../data/site';

/**
 * Página de Status de Exclusão de Dados
 * Exibida quando um usuário solicita exclusão de dados via Facebook
 *
 * Achado (auditoria do design system): a página inteira era fixa no tema claro (bg-gray-100,
 * bg-white, text-gray-900…), com azul/verde do Tailwind e fora do PageLayout (sem título da aba
 * nem noindex). Agora usa o PageLayout, tokens do tema, <Card> e <Alert>.
 */
export function DataDeletionStatusPage() {
  const [searchParams] = useSearchParams();
  const confirmationCode = searchParams.get('code');

  return (
    <PageLayout
      title="Solicitação de Exclusão de Dados"
      description="Sua solicitação de exclusão de dados foi recebida e está sendo processada."
    >
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Card className="max-w-md w-full mx-auto p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-success/10 mb-6">
            <svg
              className="h-8 w-8 text-success"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {confirmationCode && (
            <div className="bg-muted rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-1">Código de Confirmação:</p>
              <p className="font-mono text-lg font-semibold text-foreground break-all">
                {confirmationCode}
              </p>
            </div>
          )}

          <Alert variant="info" title="O que acontece agora?" className="text-left mb-6">
            <ul className="text-sm space-y-2 mt-2">
              <li>• Seus dados pessoais serão removidos do nosso sistema</li>
              <li>• Este processo pode levar até 30 dias para ser concluído</li>
              <li>• Você receberá um email de confirmação quando a exclusão for finalizada</li>
            </ul>
          </Alert>

          <p className="text-sm text-muted-foreground">
            Se você tiver dúvidas, entre em contato conosco através do email{' '}
            <a
              href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
              className="text-primary hover:underline underline-offset-4 break-all"
            >
              {PRIVACY_CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </Card>
    </PageLayout>
  );
}

export default DataDeletionStatusPage;
