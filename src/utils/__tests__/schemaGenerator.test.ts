import { describe, it, expect } from 'vitest';
import { COMPANY_INFO, generateOrganizationSchema, generateLocalBusinessSchema } from '../schemaGenerator';

const CANONICAL_DOMAIN = 'https://www.xproducoeseeventos.com.br';

// Achado (Fase 3): COMPANY_INFO.url/.logo apontavam para "https://xproducoes.com.br" (com
// um comentário "// Replace with actual domain" reconhecendo que era um placeholder) e
// para uma imagem de logo ("logo-complete.png") que não existe em public/.
describe('schemaGenerator - domínio e logo corretos nos dados estruturados (JSON-LD)', () => {
  it('COMPANY_INFO.url usa o domínio canônico confirmado', () => {
    expect(COMPANY_INFO.url).toBe(CANONICAL_DOMAIN);
  });

  it('COMPANY_INFO.logo aponta para um arquivo que existe em public/', () => {
    expect(COMPANY_INFO.logo).toBe(`${CANONICAL_DOMAIN}/xproducoes-logo.png`);
  });

  it('generateOrganizationSchema propaga o domínio/logo corretos', () => {
    const schema = generateOrganizationSchema();
    expect(schema.url).toBe(CANONICAL_DOMAIN);
    expect(schema.logo).toBe(`${CANONICAL_DOMAIN}/xproducoes-logo.png`);
  });

  it('generateLocalBusinessSchema propaga o domínio correto no @id/url', () => {
    const schema = generateLocalBusinessSchema();
    expect(schema['@id']).toBe(`${CANONICAL_DOMAIN}#localbusiness`);
    expect(schema.url).toBe(CANONICAL_DOMAIN);
  });
});
