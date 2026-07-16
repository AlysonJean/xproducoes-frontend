import React from 'react';

interface SearchAndFiltersProps {
  searchQuery?: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  resultsCount?: number;
  itemLabel?: string;
  onClearFilters?: () => void;
  showClearFilters?: boolean;
  className?: string;
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filters,
  resultsCount,
  itemLabel = 'item',
  onClearFilters,
  showClearFilters = false,
  className = ''
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Bar */}
      <div className="relative max-w-2xl mx-auto group">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-14 pr-4 py-5 bg-card/40 backdrop-blur-md border border-white/20 rounded-2xl text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 shadow-xl group-hover:shadow-2xl group-hover:-translate-y-1"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-5">
            <svg className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground hover:text-foreground transition-colors duration-200"
              title="Limpar busca"
              aria-label="Limpar busca"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Additional Filters */}
      {filters && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex flex-wrap justify-center gap-4">
            {filters}
          </div>
        </div>
      )}

      {/* Results Summary */}
      {resultsCount !== undefined && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 text-center sm:text-left">
          <p className="text-muted-foreground text-lg font-medium">
            <span className="text-foreground font-semibold">{resultsCount}</span> {itemLabel}{resultsCount !== 1 ? 's' : ''} encontrado{resultsCount !== 1 ? 's' : ''}
          </p>
          
          {showClearFilters && onClearFilters && (
            <button 
              onClick={onClearFilters}
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors duration-200 bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-lg"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
  label,
  value,
  onChange,
  options,
  className = ''
}) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    <label className="text-sm font-medium text-muted-foreground">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-4 py-3 bg-card border-2 border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 cursor-pointer hover:border-primary/50"
      aria-label={label}
    >
      {options.map(option => (
        <option key={option.value} value={option.value} className="bg-card text-foreground">
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

interface FilterPriceRangeProps {
  label: string;
  min: string;
  max: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  className?: string;
}

// Achado (auditoria de produto): EquipmentListPage/KitListPage/ServiceListPage já
// calculavam filters.priceRange no useMemo de filtragem, mas nenhuma das três tinha um
// input na tela para alimentar esse estado — o filtro de preço existia só no código.
export const FilterPriceRange: React.FC<FilterPriceRangeProps> = ({
  label,
  min,
  max,
  onMinChange,
  onMaxChange,
  className = ''
}) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    <label className="text-sm font-medium text-muted-foreground">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        inputMode="numeric"
        placeholder="Mín."
        value={min}
        onChange={(e) => onMinChange(e.target.value)}
        aria-label={`${label} — valor mínimo`}
        className="w-24 px-3 py-3 bg-card border-2 border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 hover:border-primary/50"
      />
      <span className="text-muted-foreground">—</span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        placeholder="Máx."
        value={max}
        onChange={(e) => onMaxChange(e.target.value)}
        aria-label={`${label} — valor máximo`}
        className="w-24 px-3 py-3 bg-card border-2 border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 hover:border-primary/50"
      />
    </div>
  </div>
);
