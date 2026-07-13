import React from 'react';
import { PageLayout } from '../components/layouts/PageLayout';
import { Button } from '../components/ui/Button';
import { useCookieConsent } from '../contexts/CookieConsentContext';

// Achado (auditoria): esta página antes só dizia "gerencie via seu navegador", sem
// descrever quais cookies existem nem oferecer um jeito real de aceitar/recusar. Agora
// reflete o mecanismo real (CookieConsentBanner + CookieConsentContext) e permite revogar
// o consentimento a qualquer momento, como exige a LGPD.
export const CookiesPage: React.FC = () => {
  const { consent, reset } = useCookieConsent();

  const statusLabel: Record<typeof consent, string> = {
    unset: 'ainda não definida',
    accepted: 'aceita',
    declined: 'recusada',
  };

  return (
    <PageLayout title="Política de Cookies" description="Como usamos cookies e tecnologias semelhantes">
      <div className="max-w-4xl mx-auto bg-card rounded-xl p-8 border border-border space-y-6">
        <h1 className="text-2xl font-bold">Política de Cookies</h1>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">Cookies essenciais</h2>
          <p className="text-muted-foreground">
            Necessários para o funcionamento do site (login, carrinho, proteção contra CSRF). Não podem ser
            desativados e não dependem do seu consentimento, pois são estritamente necessários para o serviço
            que você solicitou.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">Cookies de análise (Google Analytics)</h2>
          <p className="text-muted-foreground">
            Usamos o Google Analytics para entender como as páginas são usadas (visitas, origem do tráfego) e
            melhorar o site. Esses cookies só são gravados depois que você aceita, através do banner exibido na
            sua primeira visita.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted-foreground mb-3">
            Sua preferência atual de cookies de análise: <strong>{statusLabel[consent]}</strong>.
          </p>
          <Button variant="outline" size="sm" onClick={reset}>
            Gerenciar preferências
          </Button>
        </section>
      </div>
    </PageLayout>
  );
};

export default CookiesPage;
