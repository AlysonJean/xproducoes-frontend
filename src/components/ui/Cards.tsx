import React from 'react';

// Componente de Card de Estatísticas reutilizável
export interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    type: 'positive' | 'negative' | 'neutral';
  };
  className?: string;
  onClick?: () => void;
}

const getTrendColor = (type: 'positive' | 'negative' | 'neutral') => {
  switch (type) {
    case 'positive':
      return 'text-success';
    case 'negative':
      return 'text-destructive';
    default:
      return 'text-muted-foreground';
  }
};

const TrendIcon = ({ type }: { type: 'positive' | 'negative' | 'neutral' }) => {
  if (type === 'positive') {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    );
  }
  if (type === 'negative') {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
      </svg>
    );
  }
  return null;
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  description,
  icon,
  trend,
  className = '',
  onClick,
}) => {
  return (
    <div
      className={`bg-card rounded-xl p-6 shadow-sm border transition-all duration-200 ${
        onClick ? 'hover:shadow-md hover:bg-muted/40 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30' : 'hover:shadow-lg'
      } ${className}`}
      {...(onClick
        ? {
            role: 'button',
            tabIndex: 0,
            onClick,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            },
          }
        : {})}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          {icon && (
            <div className="p-2 bg-muted rounded-lg text-muted-foreground">
              {icon}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 text-sm ${getTrendColor(trend.type)}`}>
            <TrendIcon type={trend.type} />
            <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
          </div>
        )}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

// Componente de Card de Métrica com Progress Bar
export interface MetricCardProps {
  title: string;
  value: string | number;
  total?: number;
  description?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'destructive' | 'info';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  total,
  description,
  icon,
  color = 'primary',
  className = '',
}) => {
  const getColorClasses = (colorType: string) => {
    const colors = {
      primary: 'bg-primary/10 text-primary border-primary/20',
      success: 'bg-success/10 text-success border-success/20',
      warning: 'bg-warning/10 text-warning border-warning/20',
      destructive: 'bg-destructive/10 text-destructive border-destructive/20',
      info: 'bg-info/10 text-info border-info/20',
    };
    return colors[colorType as keyof typeof colors] || colors.primary;
  };


  const percentage = total ? (Number(value) / total) * 100 : 0;
  const progressVariant = {
    primary: 'progress-primary',
    success: 'progress-success',
    warning: 'progress-warning',
    destructive: 'progress-destructive',
    info: 'progress-info',
  }[color] || 'progress-primary';

  return (
    <div className={`bg-card rounded-xl p-6 shadow-sm border hover:shadow-lg transition-all duration-200 ${className}`}>
      <div className="flex items-center space-x-3 mb-4">
        {icon && (
          <div className={`p-3 rounded-lg ${getColorClasses(color)}`}>
            {icon}
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-foreground">{value}</span>
            {total && (
              <span className="text-sm text-muted-foreground">/ {total}</span>
            )}
          </div>
        </div>
      </div>
      
      {total && (
        <div className="mb-2">
          <progress
            className={`progress ${progressVariant}`}
            value={Math.min(percentage, 100)}
            max={100}
            aria-label={`${title} progresso`}
          />
        </div>
      )}
      
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

// Card simples para conteúdo geral
export interface SimpleCardProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  headerRight?: React.ReactNode;
}

export const SimpleCard: React.FC<SimpleCardProps> = ({
  children,
  title,
  description,
  className = '',
  headerRight,
}) => {
  return (
    <div className={`bg-card rounded-xl shadow-sm border ${className}`}>
      {(title || description || headerRight) && (
        <div className="p-6 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {title && (
                <h3 className="text-lg font-semibold text-foreground truncate">{title}</h3>
              )}
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            {headerRight && (
              <div className="flex-shrink-0">{headerRight}</div>
            )}
          </div>
        </div>
      )}
      <div className={title || description ? 'p-6 pt-4' : 'p-6'}>
        {children}
      </div>
    </div>
  );
};

// Componente Card padrão (Compatível com StandardComponents)
export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  padding = false 
}) => {
  return (
    <div className={`rounded-lg border border-border bg-card text-card-foreground shadow-sm ${padding ? 'p-6' : ''} ${className}`}>
      {children}
    </div>
  );
};

// Componente GlassCard (Efeito de vidro modernizado)
export interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', hoverEffect = true }) => {
  return (
    <div className={`relative bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 ${
      hoverEffect ? 'hover:bg-white/15 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)]' : ''
    } ${className}`}>
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 p-6">
        {children}
      </div>
    </div>
  );
};
