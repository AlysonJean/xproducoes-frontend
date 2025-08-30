import React, { useState } from 'react';
import { FormModal } from './FormModal';
import { FilterModalProps, FilterData } from '../../types/types';
import { Select, Input, Button } from '../ui/StandardComponents';

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  onClearFilters,
  initialFilters = {},
  availableCategories = [],
  availableLocations = [],
  priceRange = { min: 0, max: 1000 },
  filterType = 'general',
  title = 'Filtros',
  ...props
}) => {
  const [filters, setFilters] = useState<FilterData>(initialFilters);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(initialFilters.features || []);

  // Helpers locais (fallbacks) – podem ser substituídos via props futuramente
  const categories = availableCategories;
  const statusOptions = ['DRAFT','PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED'];
  const features = ['Entrega Rápida','Seguro incluído','Instalação','Suporte 24/7'];
  const sortOptions = [
    { value: 'price', label: 'Preço' },
    { value: 'name', label: 'Nome' },
    { value: 'createdAt', label: 'Mais recentes' },
  ];

  const toggleFeature = (feature: string) => {
    setSelectedFeatures(prev => prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]);
  };

  const handleClear = () => {
    setFilters({});
    setSelectedFeatures([]);
    onClearFilters?.();
  };

  const handleSubmit = (data: unknown) => {
    if (typeof data !== 'object' || data === null) return;
    const d = data as Record<string, unknown>;
    const appliedFilters: FilterData = {
      ...filters,
      category: typeof d.category === 'string' ? d.category : undefined,
      location: typeof d.location === 'string' ? d.location : undefined,
      availability: d.availability === 'true',
      status: typeof d.status === 'string' ? d.status : undefined,
      features: selectedFeatures,
      sortBy: typeof d.sortBy === 'string' ? d.sortBy : undefined,
      sortOrder:
        typeof d.sortOrder === 'string' && (d.sortOrder === 'asc' || d.sortOrder === 'desc')
          ? d.sortOrder
          : 'asc',
    };
    onApplyFilters?.(appliedFilters);
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={title}
      submitText="Aplicar Filtros"
      size="lg"
      {...props}
    >
      <div className="space-y-6 text-primary">
        {/* Categoria */}
        {categories.length > 0 && (
          <div>
            <Select
              label="Categoria"
              name="category"
              options={[{ value: '', label: 'Todas as categorias' }, ...categories.map(c => ({ value: String(c), label: String(c) }))]}
              defaultValue={filters.category || ''}
              placeholder="Categoria"
            />
          </div>
        )}

        {/* Preço */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-2">Preço</label>
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              name="minPrice"
              label="Mínimo"
              min={priceRange.min}
              max={priceRange.max}
              placeholder={priceRange.min.toString()}
              defaultValue={filters.priceRange?.min}
            />
            <Input
              type="number"
              name="maxPrice"
              label="Máximo"
              min={priceRange.min}
              max={priceRange.max}
              placeholder={priceRange.max.toString()}
              defaultValue={filters.priceRange?.max}
            />
          </div>
        </div>

        {/* Localização */}
        {availableLocations.length > 0 && (
          <div>
            <Select
              label="Localização"
              name="location"
              options={[{ value: '', label: 'Todas as localizações' }, ...availableLocations.map(l => ({ value: l, label: l }))]}
              defaultValue={filters.location || ''}
              placeholder="Localização"
            />
          </div>
        )}

        {/* Disponibilidade */}
        <div>
          <Select
            label="Disponibilidade"
            name="availability"
            options={[
              { value: '', label: 'Todos' },
              { value: 'true', label: 'Disponível' },
              { value: 'false', label: 'Indisponível' }
            ]}
            defaultValue={filters.availability !== undefined ? String(filters.availability) : ''}
            placeholder="Disponibilidade"
          />
        </div>

        {/* Status */}
        {statusOptions.length > 0 && (
          <div>
            <Select
              label="Status"
              name="status"
              options={[{ value: '', label: 'Todos os status' }, ...statusOptions.map(s => ({ value: String(s), label: String(s) }))]}
              defaultValue={filters.status || ''}
              placeholder="Status"
            />
          </div>
        )}

        {/* Período */}
        <div>
          <label className="block text-sm font-medium text-secondary mb-2">Período</label>
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              name="startDate"
              label="Data Inicial"
              defaultValue={filters.dateRange?.start}
              placeholder="Data Inicial"
            />
            <Input
              type="date"
              name="endDate"
              label="Data Final"
              defaultValue={filters.dateRange?.end}
              placeholder="Data Final"
            />
          </div>
        </div>

        {/* Características */}
  {features.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Características</label>
            <div className="grid grid-cols-2 gap-2">
              {features.map((feature) => (
                <label key={feature} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedFeatures.includes(feature)}
                    onChange={() => toggleFeature(feature)}
                    className="form-checkbox h-4 w-4 text-accent focus:ring-accent border-border rounded"
                  />
                  <span className="text-sm text-primary">{feature}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Ordenação */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Ordenar por"
            name="sortBy"
            options={[{ value: '', label: 'Ordenação padrão' }, ...sortOptions]}
            defaultValue={filters.sortBy || ''}
            placeholder="Ordenar por"
          />
          <Select
            label="Ordem"
            name="sortOrder"
            options={[
              { value: 'asc', label: 'Crescente' },
              { value: 'desc', label: 'Decrescente' }
            ]}
            defaultValue={filters.sortOrder || 'asc'}
            placeholder="Ordem"
          />
        </div>

        {/* Limpar filtros */}
        <div className="pt-4 border-t border-border">
          <Button type="button" variant="destructive" onClick={handleClear} fullWidth>
            Limpar Todos os Filtros
          </Button>
        </div>
      </div>
    </FormModal>
  );
};
 
