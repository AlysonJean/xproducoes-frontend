import React, { useState, useEffect, useMemo } from 'react';
import { ServiceCard } from '../components/ui/ServiceCard';
import { apiFetch } from '../services/api';
import { asArray } from '../utils/normalize';
import { normalizeString } from '../utils/string';
import type { Service } from '@/types/types';
import { PageLayout, PageLoading, PageEmpty } from '../components/layouts/PageLayout';
import { SearchAndFilters, Grid } from '../components/ui/StandardComponents';
import { SEO } from '../components/SEO';

// Reusing EquipmentFilters for now or simplified version
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

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Assuming endpoint exists
        const servicesData = await apiFetch('/services');
        setServices(asArray<Service>(servicesData));
      } catch (err) {
        console.error('Erro ao carregar serviços:', err);
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and search logic
  const filteredServices = useMemo(() => {
    let result = services;

    // Search filter
    if (filters.searchQuery) {
      const query = normalizeString(filters.searchQuery);
      result = result.filter((service) =>
        normalizeString(service.name).includes(query) ||
        normalizeString(service.description).includes(query)
      );
    }

    // Status filter
    if (filters.status && filters.status !== 'ALL') {
       // Assuming backend returns status field. If not, logic might need adjustment.
       // Filter logic: if status is ACTIVE, showing only active. 
       if (filters.status === 'ACTIVE') {
         // Check both status enum and isActive boolean for compatibility
         result = result.filter(s => s.status === 'ACTIVE' || s.isActive === true);
       } else {
         result = result.filter(s => s.status === filters.status);
       }
    }

    // Price range filter
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

  const clearFilters = () => {
    setFilters({ status: 'ACTIVE' });
  };

  if (loading) {
    return <PageLoading message="Carregando serviços..." />;
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
        showClearFilters={!!filters.searchQuery}
        onClearFilters={clearFilters}
        className="mb-12"
        filters={
           null // No categories for now, maybe add later if Services have categories
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
