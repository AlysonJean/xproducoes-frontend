import { getWhatsAppPhone } from './whatsapp';
import {
  COMPANY_ADDRESS_LINE,
  COMPANY_LEGAL_NAME,
  COMPANY_POSTAL_CODE,
  GOOGLE_MAPS_URL,
  INSTAGRAM_URL,
  OPENING_HOURS_SCHEMA,
  SITE_NAME,
} from '../data/site';
import { TARGET_CITIES } from './localSeoConfig';

export const COMPANY_INFO = {
  // O nome do Perfil da Empresa no Google e do rodapé (o Perfil dizia "X produçõe e Eventos"; o dono corrige lá); a
  // marca curta vai em alternateName. Era "X-Produções", com hífen, que não aparece em lugar nenhum do site.
  name: COMPANY_LEGAL_NAME,
  alternateName: SITE_NAME,
  url: 'https://www.xproducoeseeventos.com.br',
  logo: 'https://www.xproducoeseeventos.com.br/xproducoes-logo.png',
  // Conferido com o catálogo em 09/11/2026: não há painel de LED cadastrado; o dono o oferece sob consulta (parceiro).
  description: 'Aluguel de som, luz e estruturas para eventos em Belo Horizonte e região, com painel de LED sob consulta.',
  address: {
    // Achado: rua e CEP eram placeholders ("Belo Horizonte", "30000-000") publicados para o Google. O CEP entrou
    // depois de confirmado pelo dono (06/11/2026).
    streetAddress: COMPANY_ADDRESS_LINE,
    postalCode: COMPANY_POSTAL_CODE,
    addressLocality: 'Belo Horizonte',
    addressRegion: 'MG',
    addressCountry: 'BR'
  },
  contactPoint: {
    // Achado: era +55 31 99852-2380, diferente do WhatsApp do site. Mesma fonte do botão de WhatsApp.
    telephone: `+${getWhatsAppPhone()}`,
    contactType: 'customer service',
    // F2-07: as cidades atendidas são as das landings (TARGET_CITIES), com Lagoa Santa.
    areaServed: ['BR', ...TARGET_CITIES.map((c) => c.name)],
    availableLanguage: 'Portuguese'
  },
  // Achado: listava instagram.com/xproducoes, facebook.com/xproducoes e linkedin.com/company/xproducoes,
  // perfis não confirmados (o Instagram oficial é @x_producoeseventos). Fica só o perfil confirmado.
  // + o Perfil da Empresa no Google (Maps), conferido em 09/11/2026.
  sameAs: [INSTAGRAM_URL, GOOGLE_MAPS_URL],
  // Onda 4 da auditoria de 19/11 (F2-07): sem `geo` até ter a coordenada certa do Perfil da Empresa no Google (era o centro de BH,
  // longe da Rua Flor d'Água); o campo é opcional e coordenada errada é pior que nenhuma.
  priceRange: '$$'
};

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: COMPANY_INFO.name,
    url: COMPANY_INFO.url,
    logo: COMPANY_INFO.logo,
    contactPoint: {
      '@type': 'ContactPoint',
      ...COMPANY_INFO.contactPoint
    },
    sameAs: COMPANY_INFO.sameAs
  };
}

export function generateLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: COMPANY_INFO.name,
    alternateName: COMPANY_INFO.alternateName,
    image: COMPANY_INFO.logo,
    '@id': `${COMPANY_INFO.url}#localbusiness`,
    url: COMPANY_INFO.url,
    telephone: COMPANY_INFO.contactPoint.telephone,
    address: {
      '@type': 'PostalAddress',
      ...COMPANY_INFO.address
    },
    openingHoursSpecification: [OPENING_HOURS_SCHEMA],
    priceRange: COMPANY_INFO.priceRange,
    areaServed: TARGET_CITIES.map((c) => ({ '@type': 'City', name: c.name }))
  };
}

export interface ProductSchemaProps {
  name: string;
  description: string;
  image: string | string[];
  sku?: string;
  brand?: string;
  price?: number;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  /** F2-07: o endereço canônico da página do produto (window.location ficava vazio no SSR e divergia na hidratação). */
  url?: string;
}

export function generateProductSchema({
  name,
  description,
  image,
  sku,
  brand = COMPANY_INFO.name,
  price,
  currency = 'BRL',
  availability = 'InStock',
  url,
}: ProductSchemaProps) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: Array.isArray(image) ? image : [image],
    sku: sku || `sku-${name.toLowerCase().replace(/\s+/g, '-')}`,
    brand: {
      '@type': 'Brand',
      name: brand
    },
    // F2-07: a oferta só com preço (antes "0" no item sob consulta) e com o endereço canônico.
    ...(Number(price) > 0 ? {
      offers: {
        '@type': 'Offer',
        ...(url ? { url } : {}),
        priceCurrency: currency,
        price: Number(price),
        availability: `https://schema.org/${availability}`,
        itemCondition: 'https://schema.org/NewCondition',
        seller: {
          '@type': 'Organization',
          name: COMPANY_INFO.name
        }
      },
    } : {}),
    // Achado (auditoria): havia um aggregateRating fixo ("5.0" / 10 avaliações) em TODO produto —
    // avaliação inventada nos dados estruturados (o Google trata como spam de review). Removido; só
    // deve voltar com a média real das avaliações.
  };
}

export function generateBreadcrumbSchema(items: { name: string; item: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.item.startsWith('http') ? item.item : `${COMPANY_INFO.url}${item.item}`
    }))
  };
}
