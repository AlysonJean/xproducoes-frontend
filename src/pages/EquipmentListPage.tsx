import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EquipmentCard } from '../components/ui/EquipmentCard';
import { apiFetch } from '../services/api';
import { asArray } from '../utils/normalize';
import { transformEquipment } from '../utils/transformEquipment';
import { normalizeString } from '../utils/string';
import type { Equipment, Category, EquipmentFilters } from '@/types/types';
import { PageLayout, PageLoading, PageEmpty } from '../components/layouts/PageLayout';
import { SearchAndFilters, FilterSelect, Grid, Skeleton, ListSkeleton } from '../components/ui/StandardComponents';
import { BrandLoader } from '../components/ui/BrandLoader';

const EquipmentListSkeleton = () => (
  <PageLayout
    title="Equipamentos"
    description="Sincronizando o melhor do som e luz profissional."
  >
    <div className="mb-12">
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
    <div className="space-y-12">
      {[1, 2].map(i => (
        <section key={i} className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <ListSkeleton cards={4} />
        </section>
      ))}
    </div>
  </PageLayout>
);
import { SEO } from '../components/SEO';

export const EquipmentListPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EquipmentFilters>(() => ({
    availability: undefined,
    category: searchParams.get('categoryId') || undefined
  }));

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
  const [equipmentsData, categoriesData] = await Promise.all([
          apiFetch('/equipments'),
          apiFetch('/categories')
        ]);
        
        setEquipments(asArray<Equipment>(equipmentsData).map(transformEquipment));
        setCategories(asArray<Category>(categoriesData));
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        // setError('Erro ao carregar equipamentos. Tente novamente.');
        setEquipments([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and search logic
  const filteredEquipments = useMemo(() => {
    let result = equipments;

    // Search filter
    if (filters.searchQuery) {
      const query = normalizeString(filters.searchQuery);
      result = result.filter((equipment) =>
        normalizeString(equipment.name).includes(query) ||
        normalizeString(equipment.description).includes(query) ||
        (equipment.tags || []).some((tag) => normalizeString(tag).includes(query))
      );
    }

    // Category filter
    if (filters.category) {
      result = result.filter(equipment => equipment.categoryId === filters.category);
    }

    // Availability filter
    if (filters.availability !== undefined) {
      result = result.filter(equipment => equipment.isAvailable === filters.availability);
    }

    // Price range filter
    if (filters.priceRange) {
      const [min, max] = filters.priceRange;
      result = result.filter(equipment => {
        const price = Number(equipment.pricePerHour);
        return price >= min && price <= max;
      });
    }

    return result;
  }, [equipments, filters]);

  const handleFilterChange = (newFilters: Partial<EquipmentFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({ availability: undefined });
  };

  if (loading) {
    return (
      <div className="relative">
        <BrandLoader fullScreen size={140} label="Carregando catálogo..." />
        <EquipmentListSkeleton />
      </div>
    );
  }

  // if (error) { return <PageError ... />; }

  return (
    <PageLayout
      title="Equipamentos Profissionais"
      description="Descubra nossa coleção completa de equipamentos profissionais para eventos de alta qualidade."
    >
      <SEO 
        title="Catálogo de Equipamentos de Som e Luz" 
        description="Aluguel de caixas de som, microfones, moving heads, painéis de LED e estruturas em Belo Horizonte. Equipamentos revisados e de marcas profissionais."
      />
      <SearchAndFilters
        searchQuery={filters.searchQuery}
        onSearchChange={(query) => handleFilterChange({ searchQuery: query })}
        searchPlaceholder="Buscar equipamentos por nome, descrição ou tags..."
        resultsCount={filteredEquipments.length}
        itemLabel="equipamento"
        showClearFilters={!!filters.searchQuery || !!filters.category}
        onClearFilters={clearFilters}
        className="mb-12"
        filters={
          <>
            <FilterSelect
              label="Categoria"
              value={filters.category || ''}
              onChange={(value) => handleFilterChange({ category: value || undefined })}
              options={[
                { value: '', label: 'Todas as categorias' },
                ...categories.map(category => ({
                  value: category.id || '',
                  label: category.name
                }))
              ]}
            />
            <FilterSelect
              label="Disponibilidade"
              value={filters.availability === undefined ? 'all' : filters.availability.toString()}
              onChange={(value) => handleFilterChange({ 
                availability: value === 'all' ? undefined : value === 'true' 
              })}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'true', label: 'Disponível' },
                { value: 'false', label: 'Indisponível' }
              ]}
            />
          </>
        }
      />

      {filteredEquipments.length > 0 ? (
        <div className="space-y-12">
          {/* Categorias Mapeadas */}
          {categories.map((category) => {
            const categoryEquipments = filteredEquipments.filter(eq => eq.categoryId === category.id);
            if (categoryEquipments.length === 0) return null;

            return (
              <section key={category.id} className="space-y-6">
                <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                  <h2 className="text-2xl font-bold heading-elegant text-foreground">
                    {category.name}
                  </h2>
                  <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {categoryEquipments.length}
                  </span>
                </div>
                
                <Grid columns={{ sm: 1, md: 2, lg: 3, xl: 4 }} gap={8}>
                  {categoryEquipments.map((equipment) => (
                    <EquipmentCard
                      key={equipment.id}
                      equipment={equipment}
                    />
                  ))}
                </Grid>
              </section>
            );
          })}

          {/* Itens sem categoria (se houver) */}
          {filteredEquipments.some(eq => !eq.categoryId || !categories.find(c => c.id === eq.categoryId)) && (
            <section className="space-y-6">
               <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                  <h2 className="text-2xl font-bold heading-elegant text-foreground">
                    Outros
                  </h2>
                  <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {filteredEquipments.filter(eq => !eq.categoryId || !categories.find(c => c.id === eq.categoryId)).length}
                  </span>
                </div>
                <Grid columns={{ sm: 1, md: 2, lg: 3, xl: 4 }} gap={8}>
                  {filteredEquipments
                    .filter(eq => !eq.categoryId || !categories.find(c => c.id === eq.categoryId))
                    .map((equipment) => (
                      <EquipmentCard
                        key={equipment.id}
                        equipment={equipment}
                      />
                    ))}
                </Grid>
            </section>
          )}
        </div>
      ) : (
        <PageEmpty
          title="Nenhum equipamento encontrado"
          message="Tente ajustar a sua pesquisa ou filtros para encontrar mais equipamentos."
          actionLabel="Limpar filtros"
          onAction={clearFilters}
          icon={
            <svg className="h-24 w-24 mx-auto mb-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          }
        />
      )}
    </PageLayout>
  );
};
