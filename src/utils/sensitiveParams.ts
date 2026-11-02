// Achado (revisão antes do deploy): os links dos e-mails levam credenciais na URL (?token= em
// /redefinir-senha, /verify-email e /complete-registration; ?token=&email= em /cadastro-convite;
// ?code= em /data-deletion-status; #token= na volta do OAuth em /auth/oauth-concluido), e o Sentry
// e o Vercel Analytics recebiam a URL inteira. Estes três parâmetros saem da query e do fragmento;
// o resto (caminho, utm_*, filtros como ?categoryId=) fica como veio, para o erro continuar
// rastreável. O Google Analytics tem filtro próprio, mais restrito (useGoogleAnalytics.ts).
const SENSITIVE_PARAM = /^(?:token|email|code)=/;

// Cada trecho que começa em ? (query) ou # (fragmento) vai até o próximo # e é filtrado par a par.
export const stripSensitiveParams = (url: string): string =>
  url.replace(/([?#])([^#]*)/g, (_match: string, separator: string, params: string) => {
    const kept = params
      .split('&')
      .filter((pair) => !SENSITIVE_PARAM.test(pair))
      .join('&');
    return kept ? separator + kept : '';
  });
