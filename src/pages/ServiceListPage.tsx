import React, { useState, useEffect, useMemo } from 'react';
import { ServiceCard } from '../components/ui/ServiceCard';
import { apiFetch } from '../services/api';
import { asArray } from '../utils/normalize';
import { normalizeString } from '../utils/string';
import type { Service } from '@/types/types';
import { PageLayout, PageEmpty } from '../components/layouts/PageLayout';
import { SearchAndFilters, FilterPriceRange, Grid } from '../components/ui/StandardComponents';
import { BrandLoader } from '../components/ui/BrandLoader';

import { SEO } from '../components/SEO';
import { transformService } from '../utils/transformService';
import { logger } from '../utils/logger';

interface ServiceFilters {
  searchQuery?: string;
  priceRange?: [number, number];
  status?: string;
}

export const ServiceListPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ServiceFilters>({
    status: 'ACTIVE'
  });
  const [priceMinInput, setPriceMinInput] = useState('');
  const [priceMaxInput, setPriceMaxInput] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const servicesData = await apiFetch('/services');
        const rawServices = asArray<Service>(servicesData);
        setServices(rawServices.map(transformService));
      } catch (err) {
        logger.error('Erro ao carregar serviços:', 'ServiceListPage', err);
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredServices = useMemo(() => {
    let result = services;

    if (filters.searchQuery) {
      const query = normalizeString(filters.searchQuery);
      result = result.filter((service) =>
        normalizeString(service.name).includes(query) ||
        normalizeString(service.description).includes(query)
      );
    }

    if (filters.status && filters.status !== 'ALL') {
       if (filters.status === 'ACTIVE') {
         result = result.filter(s => s.status === 'ACTIVE' || s.isActive === true);
       } else {
         result = result.filter(s => s.status === filters.status);
       }
    }

    if (filters.priceRange) {
      const [min, max] = filters.priceRange;
      result = result.filter(service => {
        const price = Number(service.price);
        return price >= min && price <= max;
      });
    }

    return result;
  }, [services, filters]);

  const handleFilterChange = (newFilters: Partial<ServiceFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handlePriceChange = (min: string, max: string) => {
    setPriceMinInput(min);
    setPriceMaxInput(max);
    if (!min && !max) {
      handleFilterChange({ priceRange: undefined });
      return;
    }
    handleFilterChange({ priceRange: [Number(min) || 0, max ? Number(max) : Number.MAX_SAFE_INTEGER] });
  };

  const clearFilters = () => {
    setFilters({ status: 'ACTIVE' });
    setPriceMinInput('');
    setPriceMaxInput('');
  };

  if (loading) {
    return (
      <PageLayout
        title="Carregando serviços..."
        description="Preparando as melhores opções de DJ, Som e Luz para você."
      >
        {/* Achado: useEffect nunca roda durante o SSR, então o servidor SEMPRE renderiza este
            branch de loading — sem o <SEO> real aqui, crawlers/robôs de preview recebiam
            título/descrição genéricos de "carregando" em vez do conteúdo real da página. */}
        <SEO
          title="Serviços para Eventos"
          description="DJs, Técnicos de Som, Iluminadores e Produtores para seu evento em Belo Horizonte."
        />
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Carregando serviços..." />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Serviços Especializados"
      description="Conheça nossos serviços de DJ, iluminação, sonorização e produção de eventos."
    >
      <SEO 
        title="Serviços para Eventos" 
        description="DJs, Técnicos de Som, Iluminadores e Produtores para seu evento em Belo Horizonte."
      />
      <SearchAndFilters
        searchQuery={filters.searchQuery}
        onSearchChange={(query) => handleFilterChange({ searchQuery: query })}
        searchPlaceholder="Buscar serviços..."
        resultsCount={filteredServices.length}
        itemLabel="serviço"
        showClearFilters={!!filters.searchQuery || !!priceMinInput || !!priceMaxInput}
        onClearFilters={clearFilters}
        className="mb-12"
        filters={
          <FilterPriceRange
            label="Preço (R$)"
            min={priceMinInput}
            max={priceMaxInput}
            onMinChange={(value) => handlePriceChange(value, priceMaxInput)}
            onMaxChange={(value) => handlePriceChange(priceMinInput, value)}
          />
        }
      />

      {filteredServices.length > 0 ? (
        <Grid columns={{ sm: 1, md: 2, lg: 3, xl: 4 }} gap={8}>
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
            />
          ))}
        </Grid>
      ) : (
        <PageEmpty
          title="Nenhum serviço encontrado"
          message="Tente ajustar a sua pesquisa."
          actionLabel="Limpar filtros"
          onAction={clearFilters}
          icon={
            <svg className="h-24 w-24 mx-auto mb-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          }
        />
      )}
    </PageLayout>
  );
};
