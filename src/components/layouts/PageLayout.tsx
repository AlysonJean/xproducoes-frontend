import React from 'react';
import { Helmet } from 'react-helmet-async';
import { StructuredData } from '../seo/StructuredData';
import { generateLocalBusinessSchema, generateOrganizationSchema } from '../../utils/schemaGenerator';
import { BrandLoader } from '../ui/BrandLoader';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { buildPageTitle } from '../../data/site';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  headerActions?: React.ReactNode;
  className?: string;
  image?: string;
  url?: string;
  keywords?: string;
  fullWidth?: boolean;
  breadcrumbs?: { label: string; path?: string }[];
  /**
   * Não renderiza o cabeçalho (h1 + descrição) — para páginas que têm o próprio h1 no layout
   * (detalhe de produto, landing com hero). O <title> da aba continua vindo de `title`.
   */
  hideTitle?: boolean;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  title,
  description,
  headerActions,
  className = '',
  image,
  url,
  keywords,
  fullWidth = false,
  breadcrumbs,
  hideTitle = false,
}) => {
  const localBusinessSchema = generateLocalBusinessSchema();
  const organizationSchema = generateOrganizationSchema();
  // Achado: o <title> daqui não tinha o sufixo da marca que o <SEO> põe — páginas que só usam o
  // PageLayout (legais, carreiras, ajuda…) ficavam com a aba "Termos de Uso" sem "| X Produções".
  const fullTitle = buildPageTitle(title);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <StructuredData schema={localBusinessSchema} />
      <StructuredData schema={organizationSchema} />
      <Helmet>
        <title>{fullTitle}</title>
        {description && <meta name="description" content={description} />}
        {keywords && <meta name="keywords" content={keywords} />}
        {url && <link rel="canonical" href={url} />}

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        {url && <meta property="og:url" content={url} />}
        <meta property="og:title" content={fullTitle} />
        {description && <meta property="og:description" content={description} />}
        {image && <meta property="og:image" content={image} />}

        {/* Twitter — usa `name` (o <SEO> também usa; com `property` as duas tags não se sobrepunham) */}
        <meta name="twitter:card" content="summary_large_image" />
        {url && <meta name="twitter:url" content={url} />}
        <meta name="twitter:title" content={fullTitle} />
        {description && <meta name="twitter:description" content={description} />}
        {image && <meta name="twitter:image" content={image} />}
      </Helmet>

      <div className={`flex-grow ${fullWidth ? '' : 'container mx-auto px-4 md:px-6 lg:px-8'} py-8 ${className}`}>
        {/* Breadcrumbs */}
        {!fullWidth && <Breadcrumbs items={breadcrumbs} />}

        {/* Page Header */}
        {!hideTitle && (
          <div className="mb-12">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="text-center md:text-left">
                <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight text-foreground">
                  {title}
                </h1>
                {description && (
                  <p className="text-muted-foreground text-lg md:text-xl max-w-3xl leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
              {headerActions && (
                <div className="flex-shrink-0 flex justify-center md:justify-start">
                  {headerActions}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Page Content */}
        <div className="space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
};

// Loading State Component
export const PageLoading: React.FC<{ message?: string }> = ({
  message = "Carregando..."
}) => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <BrandLoader size={140} label={message} />
  </div>
);

// Error State Component
// Achado: era um bloco `min-h-screen` com botão feito à mão — renderizado dentro do PageLayout
// (EquipmentList), dobrava a altura da página. Agora segue o padrão do guia: Alert de erro com
// a ação de tentar de novo, no fluxo normal da página.
export const PageError: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({
  title = "Erro ao carregar",
  message,
  onRetry
}) => (
  <div className="max-w-2xl mx-auto py-12">
    <Alert
      variant="error"
      title={title}
      description={message}
      action={onRetry ? (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      ) : undefined}
    />
  </div>
);

// Empty State Component
export const PageEmpty: React.FC<{
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}> = ({
  title,
  message,
  actionLabel,
  onAction,
  icon
}) => (
  <div className="text-center py-16 px-6">
    <div className="text-muted-foreground mb-8">
      {icon || (
        <svg className="h-24 w-24 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      )}
    </div>
    <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">{title}</h2>
    <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto leading-relaxed">{message}</p>
    {actionLabel && onAction && (
      <Button size="lg" onClick={onAction}>
        {actionLabel}
      </Button>
    )}
  </div>
);
