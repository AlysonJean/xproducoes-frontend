import React from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/layouts/PageLayout';
import { PolicyTable } from '../components/PolicyTable';
import { Button } from '../components/ui/Button';
import { useCookieConsent } from '../contexts/CookieConsentContext';
import {
  ANALYTICS_COOKIES,
  BROWSER_STORAGE,
  ESSENTIAL_COOKIES,
  GOOGLE_ANALYTICS_TRANSFER_NOTICE,
  INSTAGRAM_PLAYER_NOTICE,
  type BrowserDataEntry,
} from '../data/cookiePolicy';

const COLUMNS = ['Nome', 'Para quê', 'Por quanto tempo'] as const;

const entryRows = (entries: readonly BrowserDataEntry[]) =>
  entries.map((entry) => [<code key="nome" className="break-all">{entry.name}</code>, entry.purpose, entry.duration]);

// Achado (auditoria): esta página antes só dizia "gerencie via seu navegador", sem
// descrever quais cookies existem nem oferecer um jeito real de aceitar/recusar. Agora
// reflete o mecanismo real (CookieConsentBanner + CookieConsentContext) e permite revogar
// o consentimento a qualquer momento, como exige a LGPD.
// D7 e D8c (aprovadas em 02/11/2026): a página lista os cookies e o que o site guarda no navegador, com nome, para quê
// e prazo (src/data/cookiePolicy.ts), e diz em destaque que o Google pode tratar os dados do Google Analytics fora do
// Brasil (LGPD, art. 33, VIII). O botão "Gerenciar preferências" continua chamando o reset do CookieConsentContext.
export const CookiesPage: React.FC = () => {
  const { consent, reset } = useCookieConsent();

  const statusLabel: Record<typeof consent, string> = {
    unset: 'ainda não definida',
    accepted: 'aceita',
    declined: 'recusada',
  };

  return (
    <PageLayout
      title="Política de Cookies"
      description="Quais cookies e dados do navegador o site usa, para quê e por quanto tempo."
    >
      {/* Achado: havia um 2º <h1> "Política de Cookies" (o PageLayout já renderiza o título). */}
      <div className="max-w-4xl mx-auto bg-card rounded-xl p-5 sm:p-8 border border-border space-y-8">
        <section>
          <p className="text-muted-foreground leading-relaxed">
            Cookies são pequenos arquivos que o site grava no seu navegador. O site também guarda algumas informações
            no próprio navegador, sem cookie. Abaixo está tudo o que ele usa.
          </p>
        </section>

        <section aria-labelledby="cookies-necessarios">
          <h2 id="cookies-necessarios" className="text-lg font-semibold text-foreground mb-2">
            Cookies necessários
          </h2>
          <p className="text-muted-foreground mb-4">
            Gravados pelo nosso servidor quando você usa o site. Sem eles, o login e os formulários não funcionam, por
            isso não dependem do seu consentimento.
          </p>
          <PolicyTable caption="Cookies necessários" columns={COLUMNS} rows={entryRows(ESSENTIAL_COOKIES)} />
        </section>

        <section aria-labelledby="cookies-analise">
          <h2 id="cookies-analise" className="text-lg font-semibold text-foreground mb-2">
            Cookies de análise (Google Analytics)
          </h2>
          <p className="text-muted-foreground mb-4">
            Usamos o Google Analytics para entender como as páginas são usadas (visitas, origem do tráfego, aparelho).
            Esses cookies só são gravados depois que você clica em &quot;Aceitar&quot; no aviso de cookies.
          </p>
          <p className="rounded-md border border-primary/40 bg-primary/5 p-4 mb-4 font-semibold leading-relaxed text-foreground">
            {GOOGLE_ANALYTICS_TRANSFER_NOTICE} Ao aceitar, você concorda com essa transferência (LGPD, art. 33, VIII).
          </p>
          <PolicyTable caption="Cookies de análise" columns={COLUMNS} rows={entryRows(ANALYTICS_COOKIES)} />
        </section>

        <section aria-labelledby="navegador">
          <h2 id="navegador" className="text-lg font-semibold text-foreground mb-2">
            Guardado no seu navegador, sem cookie
          </h2>
          <p className="text-muted-foreground mb-4">
            Estas informações ficam no seu aparelho e somem quando você limpa os dados do site no navegador.
          </p>
          <PolicyTable caption="Dados guardados no navegador" columns={COLUMNS} rows={entryRows(BROWSER_STORAGE)} />
          <p className="text-muted-foreground mt-4">
            No painel da equipe, o site também guarda rascunhos dos formulários e a posição do menu lateral. Em todas
            as páginas, para abrir mais rápido e funcionar com internet fraca, o site guarda ainda cópias dos próprios
            arquivos e das fontes de letra.
          </p>
        </section>

        <section aria-labelledby="sem-cookies">
          <h2 id="sem-cookies" className="text-lg font-semibold text-foreground mb-2">
            Serviços que não usam cookies
          </h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
            <li>Vercel Analytics: conta as visitas às páginas, sem cookies.</li>
            <li>Sentry: recebe os relatórios de erro do site, sem cookies e sem o seu endereço IP.</li>
            <li>
              Google Fonts: as fontes de letra do site vêm do Google, que recebe o endereço IP de quem abre as
              páginas. O Google Fonts não grava cookies.
            </li>
            <li>
              Login com Google: nas páginas Entrar e Criar conta, o site carrega um código do Google para o botão
              &quot;Entrar com Google&quot;. Se você usar o botão, valem também as regras de privacidade do Google.
            </li>
          </ul>
        </section>

        {/* Pedido do dono de 09/11/2026 (Instagram): o player dos vídeos é da Meta e só carrega depois do clique. */}
        <section aria-labelledby="instagram">
          <h2 id="instagram" className="text-lg font-semibold text-foreground mb-2">
            Vídeos do Instagram (só se você clicar)
          </h2>
          <p className="text-muted-foreground leading-relaxed">{INSTAGRAM_PLAYER_NOTICE}</p>
        </section>

        <section className="rounded-lg border border-border bg-muted p-4">
          <p className="text-sm text-muted-foreground mb-3">
            Sua preferência atual de cookies de análise: <strong className="text-foreground">{statusLabel[consent]}</strong>.
          </p>
          <Button variant="outline" size="sm" onClick={reset}>
            Gerenciar preferências
          </Button>
        </section>

        <p className="text-sm text-muted-foreground">
          Mais detalhes sobre os seus dados na{' '}
          <Link to="/privacidade" className="text-primary hover:underline underline-offset-4">
            Política de Privacidade
          </Link>
          .
        </p>
      </div>
    </PageLayout>
  );
};

export default CookiesPage;
