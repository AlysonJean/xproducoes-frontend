import React from 'react';
import { Helmet } from 'react-helmet-async';

interface StructuredDataProps {
    schema: Record<string, unknown>;
}

export const StructuredData: React.FC<StructuredDataProps> = ({ schema }) => {
  return (
    <Helmet>
      <script type="application/ld+json">
        {/* Onda 4 da auditoria de 19/11 (F3-15): "<" escapado (ver SEO.tsx). */}
        {JSON.stringify(schema).replace(/</g, '\\u003c')}
      </script>
    </Helmet>
  );
};
