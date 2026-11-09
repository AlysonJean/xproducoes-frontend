import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { apiFetch } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/StandardComponents';
import { SITE_NAME, SUPPORT_EMAIL, buildPageTitle } from '@/data/site';

// D8c (aprovada em 02/11/2026), parte 2: quem entra com o Google e não sabe a senha confirma o "Excluir minha conta"
// por um link no e-mail da conta (/lgpd/confirmar-exclusao#token=..., 1 hora, uma vez). O código vem depois do "#"
// (fora dos registros da Vercel e do Render e do Referer) e é lido só no navegador, dentro do useEffect. A exclusão é um
// POST pelo botão, nunca ao abrir a página: os filtros de e-mail abrem os links sozinhos. Layout mínimo (App.tsx), sem
// Analytics (utils/analyticsExclusions), noindex e no-referrer no HTML do SSR e fora do sitemap.

type View =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'ready'; token: string }
  | { kind: 'sending'; token: string }
  | { kind: 'deleted' }
  | { kind: 'postponed'; message: string }
  | { kind: 'invalid'; message: string }
  | { kind: 'error'; token: string };

const INVALID_LINK = 'Este link venceu ou já foi usado. Peça um novo na página LGPD, com a conta conectada.';

/** O código do link: o valor de token= no fragmento (#token=...). Só no navegador. */
function readTokenFromHash(): string | null {
  const token = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token');
  return token && token.trim() ? token.trim() : null;
}

export default function AccountDeletionConfirmPage() {
  const [view, setView] = useState<View>({ kind: 'loading' });
  // Lido uma vez só (o efeito pode rodar duas vezes em desenvolvimento, e o código já terá saído do endereço).
  const tokenRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    if (tokenRef.current === undefined) {
      tokenRef.current = readTokenFromHash();
      // O código sai da barra de endereço (e do histórico do navegador) assim que é lido.
      if (tokenRef.current) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    }
    const token = tokenRef.current;
    // A tela troca fora do corpo do efeito, como na página da proposta.
    void Promise.resolve().then(() => {
      if (active) setView(token ? { kind: 'ready', token } : { kind: 'missing' });
    });
    return () => {
      active = false;
    };
  }, []);

  const confirm = async (token: string) => {
    setView({ kind: 'sending', token });
    try {
      // referrerPolicy "origin": com o no-referrer da página, o pedido ainda leva a origem do site, que a conferência
      // do CSRF do servidor exige (o mesmo arranjo da página da proposta).
      const result = await apiFetch<{ outcome: 'deleted' | 'postponed'; message?: string }>('/users/confirm-deletion', {
        method: 'POST',
        body: JSON.stringify({ token }),
        referrerPolicy: 'origin',
      });
      if (result?.outcome === 'postponed') {
        setView({ kind: 'postponed', message: result.message || 'Seu pedido foi registrado. A exclusão da conta fica adiada.' });
        return;
      }
      // A conta saiu: se este aparelho estava conectado, sai também (os cookies o servidor já apagou).
      window.dispatchEvent(new Event('auth:logout'));
      setView({ kind: 'deleted' });
    } catch (error) {
      const status = (error as { status?: number } | null)?.status;
      if (status === 400) setView({ kind: 'invalid', message: INVALID_LINK });
      else if (status === 403) setView({ kind: 'invalid', message: error instanceof Error && error.message ? error.message : INVALID_LINK });
      else setView({ kind: 'error', token });
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <Helmet>
        <title>{buildPageTitle('Confirmar exclusão da conta')}</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="referrer" content="no-referrer" />
      </Helmet>
      <div className="mx-auto max-w-lg space-y-6">
        <p className="text-center text-2xl font-black uppercase tracking-tight text-foreground">{SITE_NAME}</p>
        <Card padding className="space-y-4">
          <h1 className="text-xl font-bold text-foreground">Excluir minha conta</h1>

          {view.kind === 'loading' && <p className="text-sm text-muted-foreground">Abrindo o link...</p>}

          {(view.kind === 'ready' || view.kind === 'sending' || view.kind === 'error') && (
            <>
              <p className="text-sm text-foreground">
                Você pediu para excluir a sua conta na X Produções e Eventos. O que sai e o que fica guardado está na{' '}
                <Link to="/lgpd" className="font-semibold text-primary underline-offset-4 hover:underline">página LGPD</Link>. Se
                não foi você que pediu, feche esta página: nada muda.
              </p>
              {view.kind === 'error' && (
                <p className="text-sm text-destructive" role="alert">
                  Não conseguimos confirmar agora. Tente de novo em alguns minutos.
                </p>
              )}
              <Button variant="destructive" isLoading={view.kind === 'sending'} onClick={() => confirm(view.token)}>
                Excluir minha conta
              </Button>
            </>
          )}

          {view.kind === 'deleted' && (
            <p className="text-sm text-foreground" role="status">
              Sua conta foi excluída. Se havia reservas contratadas ou pagas, elas ficam guardadas só com o que a
              contabilidade precisa, sem o seu nome, e-mail e telefone.
            </p>
          )}

          {view.kind === 'postponed' && (
            <p className="text-sm text-foreground" role="status">
              {view.message}
            </p>
          )}

          {(view.kind === 'missing' || view.kind === 'invalid') && (
            <p className="text-sm text-foreground" role="alert">
              {view.kind === 'missing' ? INVALID_LINK : view.message}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Dúvidas: <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-4">{SUPPORT_EMAIL}</a>.{' '}
            <Link to="/" className="underline underline-offset-4">Voltar ao site</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
