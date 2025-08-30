import { useEffect, useState, useMemo, useCallback } from 'react';
import { apiFetch } from '../services/api';
import { asArray } from '../utils/normalize';
import { normalizeString } from '../utils/string';
import type { Kit } from '../types/types';
import { KitCard } from '../components/ui/KitCard';
import { PageLayout, PageLoading, PageError, PageEmpty } from '../components/layouts/PageLayout';
import { SearchAndFilters, FilterSelect, Grid } from '../components/ui/StandardComponents';

interface KitFilters {
  priceRange?: [number, number];
  searchQuery?: string;
  sortBy?: 'name' | 'price';
  sortOrder?: 'asc' | 'desc';
}

export const KitListPage = () => {
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<KitFilters>({
      sortBy: 'name',
      sortOrder: 'asc'
  });

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
  const kitsData = await apiFetch('/kits');
  setKits(asArray<Kit>(kitsData));
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Erro ao carregar os kits. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and sort logic
  const filteredAndSortedKits = useMemo(() => {
    let result = [...kits];

    // Search filter
    if (filters.searchQuery) {
         const query = normalizeString(filters.searchQuery);
         result = result.filter((kit) =>
           normalizeString(kit.name).includes(query) ||
           normalizeString(kit.description).includes(query)
      );
    }

    // Price range filter
    if (filters.priceRange) {
      const [min, max] = filters.priceRange;
      result = result.filter(kit => {
        const price = Number(kit.price || 0);
        return price >= min && price <= max;
      });
    }

    // Sort
    if (filters.sortBy) {
      result.sort((a, b) => {
        let aValue: string | number = '';
        let bValue: string | number = '';

        switch (filters.sortBy) {
          case 'name':
            aValue = a.name || '';
            bValue = b.name || '';
            break;
          case 'price':
            aValue = Number(a.price || 0);
            bValue = Number(b.price || 0);
            break;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return filters.sortOrder === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return filters.sortOrder === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      });
    }

    return result;
  }, [kits, filters]);

  const handleFilterChange = useCallback((newFilters: Partial<KitFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      sortBy: 'name',
      sortOrder: 'asc'
    });
  }, []);

  if (loading) {
    return <PageLoading message="Carregando kits..." />;
  }

  if (error) {
    return <PageError message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <PageLayout
      title="Kits de Equipamentos"
      description="Soluções completas para o seu evento com preços especiais."
    >
      <SearchAndFilters
        searchQuery={filters.searchQuery}
        onSearchChange={(query) => handleFilterChange({ searchQuery: query })}
        searchPlaceholder="Buscar kits por nome ou descrição..."
        resultsCount={filteredAndSortedKits.length}
        itemLabel="kit"
        showClearFilters={!!filters.searchQuery}
        onClearFilters={clearFilters}
        className="mb-12"
        filters={
          <>
            <FilterSelect
              label="Ordenar por"
              value={filters.sortBy || 'name'}
              onChange={(value) => handleFilterChange({ sortBy: value as 'name' | 'price' })}
              options={[
                { value: 'name', label: 'Nome' },
                { value: 'price', label: 'Preço' }
              ]}
            />
            <FilterSelect
              label="Ordem"
              value={filters.sortOrder || 'asc'}
              onChange={(value) => handleFilterChange({ sortOrder: value as 'asc' | 'desc' })}
              options={[
                { value: 'asc', label: 'Crescente' },
                { value: 'desc', label: 'Decrescente' }
              ]}
            />
          </>
        }
      />

      {filteredAndSortedKits.length > 0 ? (
        <Grid columns={{ sm: 1, md: 2, lg: 3, xl: 4 }} gap={6}>
          {filteredAndSortedKits.map((kit) => (
            <KitCard key={kit.id} kit={kit} />
          ))}
        </Grid>
      ) : (
        <PageEmpty
          title="Nenhum kit encontrado"
          message="Tente ajustar a sua pesquisa ou filtros para encontrar mais kits."
          actionLabel="Limpar filtros"
          onAction={clearFilters}
          icon={
            <svg className="h-24 w-24 mx-auto mb-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
      )}
    </PageLayout>
  );
};
