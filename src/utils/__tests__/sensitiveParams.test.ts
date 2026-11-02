import { describe, it, expect } from 'vitest';
import { stripSensitiveParams } from '../sensitiveParams';

// Achado (revisão antes do deploy): os links dos e-mails levam credenciais na URL, e o Sentry e o
// Vercel Analytics recebiam a URL inteira. Estes casos fixam o que sai e o que fica.
describe('stripSensitiveParams', () => {
  it('tira token, email e code da query e mantém os outros parâmetros como vieram', () => {
    expect(stripSensitiveParams('https://xproducoeseeventos.com.br/cadastro-convite?token=abc123&email=fulano%40exemplo.com')).toBe(
      'https://xproducoeseeventos.com.br/cadastro-convite',
    );
    expect(stripSensitiveParams('/redefinir-senha?utm_source=email&token=abc123&utm_medium=link')).toBe(
      '/redefinir-senha?utm_source=email&utm_medium=link',
    );
    expect(stripSensitiveParams('/data-deletion-status?code=xyz789#topo')).toBe('/data-deletion-status#topo');
  });

  it('tira o token do fragmento (volta do OAuth em /auth/oauth-concluido)', () => {
    expect(stripSensitiveParams('https://xproducoeseeventos.com.br/auth/oauth-concluido#token=abc123')).toBe(
      'https://xproducoeseeventos.com.br/auth/oauth-concluido',
    );
  });

  it('não mexe em URL sem esses parâmetros, nem em nomes que só contêm a palavra', () => {
    expect(stripSensitiveParams('/equipamentos?categoryId=7&page=2#lista')).toBe('/equipamentos?categoryId=7&page=2#lista');
    expect(stripSensitiveParams('/equipamentos?barcode=789')).toBe('/equipamentos?barcode=789');
    expect(stripSensitiveParams('/admin/profile?google_connected=error')).toBe('/admin/profile?google_connected=error');
    expect(stripSensitiveParams('/login')).toBe('/login');
  });
});
