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

// Achado: o JSON-LD publicava +55 31 99852-2380 (o WhatsApp do site é (31) 98925-2272), rua/CEP
// de placeholder e perfis sociais não confirmados.
describe('schemaGenerator - contato publicado para o Google', () => {
  it('telefone é o mesmo do WhatsApp do site', () => {
    expect(generateLocalBusinessSchema().telephone).toBe('+5531989252272');
    expect(generateOrganizationSchema().contactPoint.telephone).toBe('+5531989252272');
  });

  // O CEP entrou depois de confirmado pelo dono (06/11/2026); o Perfil da Empresa no Google entrou no sameAs em 09/11.
  it('endereço com o CEP confirmado (não o de placeholder), o Instagram oficial e o Perfil no Google', () => {
    expect(COMPANY_INFO.address.postalCode).toBe('30810-310');
    expect(COMPANY_INFO.address.streetAddress).toMatch(/Flor d'Água/);
    expect(COMPANY_INFO.sameAs).toEqual([
      'https://www.instagram.com/x_producoeseventos',
      'https://maps.google.com/?cid=1473271925537970059',
    ]);
  });
});
