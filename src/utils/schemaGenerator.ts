export type SchemaType = 'Organization' | 'LocalBusiness' | 'Product' | 'BreadcrumbList' | 'Event' | 'WebSite';


export const COMPANY_INFO = {
  name: 'X-Produções',
  url: 'https://xproducoes.com.br', // Replace with actual domain
  logo: 'https://xproducoes.com.br/logo-complete.png', // Replace with actual logo URL
  description: 'Referência em aluguel de som, luz, painel de LED e estruturas para eventos em Belo Horizonte e região.',
  address: {
    streetAddress: 'Belo Horizonte', // Placeholder, update if real address found
    addressLocality: 'Belo Horizonte',
    addressRegion: 'MG',
    postalCode: '30000-000', // Placeholder
    addressCountry: 'BR'
  },
  contactPoint: {
    telephone: '+55 31 99999-9999', // Placeholder
    contactType: 'customer service',
    areaServed: ['BR', 'Belo Horizonte', 'Nova Lima', 'Contagem', 'Betim'],
    availableLanguage: 'Portuguese'
  },
  sameAs: [
    'https://www.instagram.com/xproducoes',
    'https://www.facebook.com/xproducoes',
    'https://www.linkedin.com/company/xproducoes'
  ],
  geo: {
    latitude: -19.9167, // BH coordinates
    longitude: -43.9345
  },
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
    image: COMPANY_INFO.logo,
    '@id': `${COMPANY_INFO.url}#localbusiness`,
    url: COMPANY_INFO.url,
    telephone: COMPANY_INFO.contactPoint.telephone,
    address: {
      '@type': 'PostalAddress',
      ...COMPANY_INFO.address
    },
    geo: {
      '@type': 'GeoCoordinates',
      ...COMPANY_INFO.geo
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00'
      }
    ],
    priceRange: COMPANY_INFO.priceRange,
    areaServed: [
      {
        '@type': 'City',
        name: 'Belo Horizonte',
        sameAs: 'https://en.wikipedia.org/wiki/Belo_Horizonte'
      },
      {
        '@type': 'City',
        name: 'Nova Lima'
      },
      {
        '@type': 'City',
        name: 'Contagem'
      },
      {
        '@type': 'City',
        name: 'Betim'
      }
    ]
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
}

export function generateProductSchema({
  name,
  description,
  image,
  sku,
  brand = COMPANY_INFO.name,
  price,
  currency = 'BRL',
  availability = 'InStock'
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
    offers: {
      '@type': 'Offer',
      url: typeof window !== 'undefined' ? window.location.href : '',
      priceCurrency: currency,
      price: price || '0',
      availability: `https://schema.org/${availability}`,
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: COMPANY_INFO.name
      }
    }
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
