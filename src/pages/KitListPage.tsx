import { useEffect, useState, useMemo, useCallback } from 'react';
import { apiFetch } from '../services/api';
import { asArray } from '../utils/normalize';
import { normalizeString } from '../utils/string';
import type { Kit, KitFilters } from '@/types/types';
import { KitCard } from '../components/ui/KitCard';
import { PageLayout, PageLoading, PageEmpty } from '../components/layouts/PageLayout';
import { SearchAndFilters, FilterSelect, Grid } from '../components/ui/StandardComponents';
import { SEO } from '../components/SEO';
import { transformKit } from '../utils/transformKit';

export const KitListPage = () => {
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<KitFilters>({
      sortBy: 'name',
      sortOrder: 'asc'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const kitsData = await apiFetch('/kits');
        const rawKits = asArray<Kit>(kitsData);
        setKits(rawKits.map(transformKit));
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setKits([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredAndSortedKits = useMemo(() => {
    let result = [...kits];

    if (filters.searchQuery) {
         const query = normalizeString(filters.searchQuery);
         result = result.filter((kit) =>
           normalizeString(kit.name).includes(query) ||
           normalizeString(kit.description).includes(query)
      );
    }

    if (filters.priceRange) {
      const [min, max] = filters.priceRange;
      result = result.filter(kit => {
        const price = Number(kit.price || 0);
        return price >= min && price <= max;
      });
    }

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
    return <PageLoading message="Preparando melhores ofertas..." />;
  }

  return (
    <PageLayout
      title="Kits Completos"
      description="Soluções prontas com o melhor custo-benefício para seu evento."
    >
      <SEO 
        title="Kits de Som e Iluminação" 
        description="Economize com nossos kits completos de som, luz e audiovisual em BH."
      />
      <SearchAndFilters
        searchQuery={filters.searchQuery}
        onSearchChange={(query) => handleFilterChange({ searchQuery: query })}
        searchPlaceholder="O que você precisa?"
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
                { value: 'price', label: 'Melhor Preço' }
              ]}
            />
          </>
        }
      />

      {filteredAndSortedKits.length > 0 ? (
        <Grid columns={{ sm: 1, md: 2, lg: 3, xl: 4 }} gap={8}>
          {filteredAndSortedKits.map((kit) => (
            <KitCard key={kit.id} kit={kit} />
          ))}
        </Grid>
      ) : (
        <PageEmpty
          title="Nenhum kit encontrado"
          message="Não encontramos exatamente o que você buscou. Que tal ver nossos equipamentos individuais?"
          actionLabel="Limpar filtros"
          onAction={clearFilters}
        />
      )}
    </PageLayout>
  );
};
