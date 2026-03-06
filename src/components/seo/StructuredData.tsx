import React from 'react';
import { Helmet } from 'react-helmet-async';

interface StructuredDataProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: Record<string, any>;
}

export const StructuredData: React.FC<StructuredDataProps> = ({ schema }) => {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};
