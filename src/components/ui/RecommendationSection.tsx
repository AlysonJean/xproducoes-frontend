// Caminho: frontend/src/components/ui/RecommendationSection.tsx

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Card, 
  Grid, 
  Button,
  Badge 
} from './StandardComponents';
import { 
  Package, 
  TrendingUp, 
  Heart, 
  Star,
  ArrowRight,
  Sparkles,
  Users,
  Zap,
  Award,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import { toNumber } from '../../utils/typeSafeFormatters';

export type RecommendationType = 
  | 'personalized' // Baseado no histórico do usuário
  | 'similar' // Produtos similares ao que está vendo
  | 'frequently-bought' // Frequentemente comprados juntos
  | 'trending' // Tendências/populares
  | 'new' // Novos produtos
  | 'seasonal'; // Sazonais/relevantes para a época

export interface RecommendationItem {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  rating?: number;
  reviewCount?: number;
  isPopular?: boolean;
  isNew?: boolean;
  isFavorite?: boolean;
  category?: string;
  type?: 'equipment' | 'kit';
  discount?: number;
}

export interface RecommendationSectionProps {
  title?: string;
  subtitle?: string;
  type: RecommendationType;
  items: RecommendationItem[];
  maxItems?: number;
  showNavigation?: boolean;
  onItemClick?: (item: RecommendationItem) => void;
  onViewAll?: () => void;
  viewAllText?: string;
  viewAllLink?: string;
  loading?: boolean;
  emptyMessage?: string;
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
  };
}

const getRecommendationConfig = (type: RecommendationType) => {
  const configs = {
    personalized: {
      icon: Sparkles,
      title: 'Recomendado para Você',
      subtitle: 'Com base no seu histórico e preferências',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    similar: {
      icon: Package,
      title: 'Produtos Similares',
      subtitle: 'Você também pode gostar',
      color: 'text-info',
      bgColor: 'bg-info/10'
    },
    'frequently-bought': {
      icon: Users,
      title: 'Frequentemente Reservados Juntos',
      subtitle: 'Clientes que reservaram este item também reservaram',
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    trending: {
      icon: TrendingUp,
      title: 'Tendências',
      subtitle: 'Os mais populares no momento',
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    new: {
      icon: Zap,
      title: 'Novidades',
      subtitle: 'Recém-adicionados ao catálogo',
      color: 'text-secondary',
      bgColor: 'bg-secondary/10'
    },
    seasonal: {
      icon: Award,
      title: 'Destaque da Temporada',
      subtitle: 'Perfeitos para esta época do ano',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    }
  };

  return configs[type];
};

export const RecommendationSection = ({
  title,
  subtitle,
  type,
  items,
  maxItems = 4,
  showNavigation = true,
  onItemClick,
  onViewAll,
  viewAllText = 'Ver Todos',
  viewAllLink,
  loading = false,
  emptyMessage = 'Nenhuma recomendação disponível no momento',
  columns = { sm: 1, md: 2, lg: 4 }
}: RecommendationSectionProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const config = getRecommendationConfig(type);
  const Icon = config.icon;

  // Limitar items ao maxItems
  const displayItems = items.slice(currentIndex, currentIndex + maxItems);
  const hasMore = items.length > maxItems;
  const canGoNext = currentIndex + maxItems < items.length;
  const canGoPrev = currentIndex > 0;

  const handleNext = () => {
    if (canGoNext) {
      setCurrentIndex(prev => Math.min(prev + maxItems, items.length - maxItems));
    }
  };

  const handlePrev = () => {
    if (canGoPrev) {
      setCurrentIndex(prev => Math.max(prev - maxItems, 0));
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-6"></div>
          <Grid columns={columns} gap={4}>
            {[...Array(maxItems)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-video bg-muted rounded-lg"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </Grid>
        </div>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className={clsx('w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center', config.bgColor)}>
          <Icon className={clsx('h-8 w-8', config.color)} />
        </div>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-start space-x-3">
            <div className={clsx('w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0', config.bgColor)}>
              <Icon className={clsx('h-6 w-6', config.color)} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">
                {title || config.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {subtitle || config.subtitle}
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          {showNavigation && hasMore && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={!canGoPrev}
                aria-label="Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={!canGoNext}
                aria-label="Próximo"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Items Grid/Scroll Container */}
        <div className="relative group/scroll">
          <div className={clsx(
            "flex overflow-x-auto pb-4 -mb-4 gap-4 snap-x snap-mandatory scrollbar-hide lg:grid lg:pb-0 lg:mb-0 lg:snap-none",
            columns.sm === 1 && "lg:grid-cols-1",
            columns.md === 2 && "md:grid-cols-2",
            columns.lg === 4 && "lg:grid-cols-4"
          )}>
            {displayItems.map((item) => (
              <div
                key={item.id}
                className="min-w-[280px] sm:min-w-[320px] lg:min-w-0 snap-start cursor-pointer transition-all duration-300"
                onClick={() => onItemClick?.(item)}
              >

              <Link 
                to={viewAllLink ? `${viewAllLink}/${item.id}` : `/${item.type === 'kit' ? 'kits' : 'equipamentos'}/${item.id}`}
                className="block"
              >
                <div className="border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-all duration-200 hover:shadow-md">
                  {/* Image */}
                  <div className="relative aspect-video bg-muted">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}

                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {item.isNew && (
                        <Badge variant="secondary" size="sm">
                          <Zap className="h-3 w-3 mr-1" />
                          Novo
                        </Badge>
                      )}
                      {item.isPopular && (
                        <Badge variant="warning" size="sm">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                      {item.discount && item.discount > 0 && (
                        <Badge variant="destructive" size="sm">
                          -{item.discount}%
                        </Badge>
                      )}
                    </div>

                    {/* Favorite Icon */}
                    {item.isFavorite && (
                      <div className="absolute top-2 right-2">
                        <Heart className="h-5 w-5 text-destructive fill-destructive" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h4 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {item.name}
                    </h4>

                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    {/* Rating */}
                    {item.rating && (
                      <div className="flex items-center mt-2">
                        <Star className="h-4 w-4 text-warning fill-warning" />
                        <span className="text-sm font-medium text-foreground ml-1">
                          {item.rating.toFixed(1)}
                        </span>
                        {item.reviewCount && (
                          <span className="text-sm text-muted-foreground ml-1">
                            ({item.reviewCount})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Price */}
                    <div className="flex items-center justify-between mt-3">
                      {item.price ? (
                        <div className="flex items-baseline gap-2">
                          {item.discount && item.discount > 0 ? (
                            <>
                              <span className="text-lg font-bold text-primary">
                                {formatCurrency(toNumber(item.price) * (1 - item.discount / 100))}
                              </span>
                              <span className="text-sm text-muted-foreground line-through">
                                {formatCurrency(item.price)}
                              </span>
                            </>
                          ) : (
                            <span className="text-lg font-bold text-primary">
                              {formatCurrency(item.price)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Consultar</span>
                      )}

                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
                    </div>

                    {/* Category Badge */}
                    {item.category && (
                      <div className="mt-2">
                        <Badge variant="outline" size="sm">
                          {item.category}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

        {/* View All Button */}
        {(onViewAll || viewAllLink) && items.length > maxItems && (
          <div className="mt-6 text-center">
            {viewAllLink ? (
              <Link to={viewAllLink}>
                <Button variant="outline" size="lg">
                  {viewAllText}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size="lg" onClick={onViewAll}>
                {viewAllText}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
