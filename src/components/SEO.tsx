/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
    jsonLd?: Record<string, any>;
}

export const SEO: React.FC<SEOProps> = ({ 
  title, 
  description = "Líder em aluguel de som, iluminação, painel de LED e equipamentos audiovisuais em Belo Horizonte e região.",
  keywords = "aluguel de som, iluminação, painel de led, eventos, belo horizonte",
  image = "/xproducoes-logo.svg",
  url = typeof window !== 'undefined' ? window.location.href : '',
  type = 'website',
  jsonLd
}) => {
  const siteTitle = "X Produções";
  const fullTitle = `${title} | ${siteTitle}`;
  
  // Canonical URL logic: remove query params to avoid duplicate content issues
  const canonicalUrl = url.split('?')[0];

  // Schema.org Local Business data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "X Produções",
    "image": [image],
    "@id": "https://xproducoes.com.br",
    "url": "https://xproducoes.com.br",
    "telephone": "+5531999999999", // Placeholder, deve ser substituído pelo real
    "priceRange": "$$",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Belo Horizonte",
      "addressRegion": "MG",
      "addressCountry": "BR"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": -19.9208, // BH Coordinates placeholder
      "longitude": -43.9378
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday"
      ],
      "opens": "09:00",
      "closes": "18:00"
    }
  };

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteTitle} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data (JSON-LD) */}
      <script type="application/ld+json">
        {JSON.stringify(jsonLd || structuredData)}
      </script>
    </Helmet>
  );
};
