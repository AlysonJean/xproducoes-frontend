import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SITE_NAME, buildPageTitle } from '../data/site';
import { generateLocalBusinessSchema } from '../utils/schemaGenerator';

interface SEOProps {
  title: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  // D23 (decisão do dono de 08/11/2026): a página do item INATIVO continua abrindo pelo link, mas sai do Google
  // (noindex, follow) e sem o JSON-LD da página (o produto não está à venda).
  noindex?: boolean;
}

export const SEO: React.FC<SEOProps> = ({ 
  title, 
  description = "Aluguel de som, iluminação e estruturas para eventos em Belo Horizonte e região, com painel de LED sob consulta.",
  keywords = "aluguel de som, iluminação, painel de led, eventos, belo horizonte",
  image = "https://www.xproducoeseeventos.com.br/xproducoes-logo.png",
  url = typeof window !== 'undefined' ? window.location.href : '',
  type = 'website',
  jsonLd,
  noindex = false
}) => {
  const siteTitle = SITE_NAME;
  // Achado: páginas que já passavam "… | X-Produções" ganhavam o sufixo duas vezes
  // ("Comparar Itens | X-Produções | X Produções"). buildPageTitle não duplica.
  const fullTitle = buildPageTitle(title);
  const safeUrl = typeof url === 'string' ? url : '';
  
  // Canonical URL logic: remove query params to avoid duplicate content issues
  const canonicalUrl = safeUrl.split('?')[0];

  // Schema.org LocalBusiness: o mesmo do PageLayout (utils/schemaGenerator), com o mesmo @id. Antes este arquivo tinha
  // uma cópia própria (outro @id, sem rua, horário de seg–sex) e as páginas mandavam ao Google duas empresas diferentes.
  const structuredData = generateLocalBusinessSchema();

  // Logic to build a hybrid schema array (LocalBusiness + custom jsonLd from page)
  const pageJsonLd = noindex ? undefined : jsonLd;
  const jsonLdArray = Array.isArray(pageJsonLd)
    ? [structuredData, ...pageJsonLd]
    : pageJsonLd
        ? [structuredData, pageJsonLd]
        : [structuredData];

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex, follow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteTitle} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={safeUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data (JSON-LD) Array-Based for rich hybrid snippets */}
      <script type="application/ld+json">
        {JSON.stringify(jsonLdArray)}
      </script>
    </Helmet>
  );
};
