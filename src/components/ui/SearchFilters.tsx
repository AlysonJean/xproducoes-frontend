import { useState, useEffect } from 'react';
import ReactGA from 'react-ga4';
import type { Category } from '../../types/types';

interface Props {
  categories: Category[];
  onFiltersChange: (filters: {
    searchTerm: string;
    categoryId: string;
    minPrice: string;
    maxPrice: string;
    sortBy: string;
  }) => void;
}

export const SearchFilters = ({ categories, onFiltersChange }: Props) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    onFiltersChange({
      searchTerm,
      categoryId,
      minPrice,
      maxPrice,
      sortBy,
    });
  }, [searchTerm, categoryId, minPrice, maxPrice, sortBy, onFiltersChange]);

  // Analytics Tracking for Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.length > 2) {
        ReactGA.event({
          category: 'engagement',
          action: 'search',
          label: searchTerm,
        });
      }
    }, 2000);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Analytics Tracking for Category Filter
  useEffect(() => {
    if (categoryId) {
      const categoryName = categories.find(c => c.id === categoryId)?.name || categoryId;
      ReactGA.event({
        category: 'engagement',
        action: 'filter_category',
        label: categoryName,
      });
    }
  }, [categoryId, categories]);

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryId('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('');
  };

  const hasActiveFilters = searchTerm || categoryId || minPrice || maxPrice || sortBy;

  return (
    <div className="bg-card border border-border p-6 rounded-lg shadow-lg mb-6">
      {/* Barra de pesquisa principal */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Pesquisar equipamentos..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full p-3 bg-background text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pl-10 placeholder:text-muted-foreground"
          />
          <svg
            className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors flex items-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
            />
          </svg>
          Filtros
          {hasActiveFilters && (
            <span className="bg-destructive text-destructive-foreground rounded-full px-2 py-1 text-xs">
              {[searchTerm, categoryId, minPrice, maxPrice, sortBy].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Filtros avançados */}
      {showFilters && (
        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Categoria</label>
              <select
                title="Filtro de categoria"
                value={categoryId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setCategoryId(e.target.value)
                }
                className="w-full p-2 bg-background text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Todas as categorias</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Preço mínimo */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Preço mínimo (R$/hora)
              </label>
              <input
                type="number"
                placeholder="0"
                value={minPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMinPrice(e.target.value)}
                className="w-full p-2 bg-background text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
              />
            </div>

            {/* Preço máximo */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Preço máximo (R$/hora)
              </label>
              <input
                type="number"
                placeholder="1000"
                value={maxPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxPrice(e.target.value)}
                className="w-full p-2 bg-background text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
              />
            </div>

            {/* Ordenação */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Ordenar por</label>
              <select
                title="Filtro de status"
                value={sortBy}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value)}
                className="w-full p-2 bg-background text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Relevância</option>
                <option value="price_asc">Preço: menor para maior</option>
                <option value="price_desc">Preço: maior para menor</option>
                <option value="name_asc">Nome: A-Z</option>
                <option value="name_desc">Nome: Z-A</option>
              </select>
            </div>
          </div>

          {/* Botão limpar filtros */}
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
