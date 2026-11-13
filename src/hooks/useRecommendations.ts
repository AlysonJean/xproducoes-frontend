
// Caminho: frontend/src/hooks/useRecommendations.ts

import { useState, useEffect, useCallback } from 'react';
import { recommendationAPI } from '../services/api';
import { logger } from '../utils/logger';
import { RecommendationItem, RecommendationType } from '../components/ui/RecommendationSection';
import { asArray } from '../utils/normalize';
import { toNumber } from '../utils/typeSafeFormatters';
import { equipmentUnitSuffix, priceUnitOf } from '../utils/bookingPricing';

interface APIResponse {
    data?: unknown[];
}

interface RawRecommendationItem {
    id?: string;
    _id?: string;
    name?: string;
    title?: string;
    description?: string;
    shortDescription?: string;
    imageUrl?: string;
    image?: string;
    thumbnailUrl?: string;
    price?: number | string;
    dailyPrice?: number | string;
    // Equipamento: o preço vem em pricePerHour (o Decimal chega como texto) e a unidade em priceUnit (hour ou day).
    pricePerHour?: number | string;
    priceUnit?: string;
    // Kit: os itens dele (a API não manda "type").
    items?: unknown[];
    rating?: number;
    averageRating?: number;
    reviewCount?: number;
    totalReviews?: number;
    isPopular?: boolean;
    popular?: boolean;
    isNew?: boolean;
    new?: boolean;
    isFavorite?: boolean;
    favorite?: boolean;
    category?: { name?: string };
    categoryName?: string;
    type?: string;
    equipments?: unknown[];
    discount?: number;
    discountPercentage?: number;
}

interface UseRecommendationsOptions {
    type: RecommendationType;
    limit?: number;
    itemId?: string;
    itemType?: 'equipment' | 'kit' | 'service';
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    autoFetch?: boolean;
}

interface UseRecommendationsResult {
    recommendations: RecommendationItem[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export const useRecommendations = ({
    type,
    limit = 8,
    itemId,
    itemType = 'equipment',
    category,
    autoFetch = true
}: UseRecommendationsOptions): UseRecommendationsResult => {
    const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRecommendations = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            let response;

            switch (type) {
                case 'personalized':
                    response = await recommendationAPI.getPersonalized(limit);
                    break;

                case 'similar':
                    if (!itemId) {
                        throw new Error('itemId é obrigatório para recomendações similares');
                    }
                    response = await recommendationAPI.getSimilar(itemId, itemType, limit);
                    break;

                case 'frequently-bought':
                    if (!itemId) {
                        throw new Error('itemId é obrigatório para recomendações de compra frequente');
                    }
                    response = await recommendationAPI.getFrequentlyBought(itemId, itemType, limit);
                    break;

                case 'trending':
                    response = await recommendationAPI.getTrending(limit, category);
                    break;

                case 'new':
                    response = await recommendationAPI.getNew(limit, category);
                    break;

                case 'seasonal':
                    response = await recommendationAPI.getSeasonal(limit);
                    break;

                default:
                    // Fallback para personalized
                    response = await recommendationAPI.getPersonalized(limit);
            }

            // Normalizar resposta
            const data = asArray((response as APIResponse)?.data || response);

            // Mapear para o formato esperado
            // Auditoria do orçamento (12/11/2026), O41: o preço lia price/dailyPrice, mas a API manda o do equipamento em
            // pricePerHour (com a unidade em priceUnit) e o do kit em price, e todo equipamento aparecia "Consultar". Agora
            // o preço real com a unidade: "/diária" ou "/h" no equipamento, "por evento" no kit (decisão de 06/11).
            const mappedData: RecommendationItem[] = (data as RawRecommendationItem[]).map((item): RecommendationItem => {
                const isKit = item.type === 'kit' || Array.isArray(item.items) || Array.isArray(item.equipments);
                const unit = priceUnitOf(item);
                const discount = toNumber(item.discount ?? item.discountPercentage);
                return {
                    id: item.id || item._id || Math.random().toString(36).substr(2, 9),
                    name: item.name || item.title || 'Sem título',
                    description: item.description || item.shortDescription,
                    imageUrl: item.imageUrl || item.image || item.thumbnailUrl,
                    price: toNumber(isKit ? item.price : (item.pricePerHour ?? item.price ?? item.dailyPrice)),
                    priceSuffix: isKit ? 'por evento' : unit ? equipmentUnitSuffix(unit) : undefined,
                    rating: item.rating || item.averageRating,
                    reviewCount: item.reviewCount || item.totalReviews,
                    isPopular: item.isPopular || item.popular || false,
                    isNew: item.isNew || item.new || false,
                    isFavorite: item.isFavorite || item.favorite || false,
                    category: item.category?.name || item.categoryName,
                    type: isKit ? 'kit' : 'equipment',
                    // Sem desconto: undefined (o 0 aparecia solto no canto do cartão).
                    discount: discount > 0 ? discount : undefined
                };
            });

            setRecommendations(mappedData);
        } catch (err) {
            logger.error('Erro ao buscar recomendações', 'useRecommendations', err);
            setError(err instanceof Error ? err.message : 'Erro ao carregar recomendações');

            // Em caso de erro, tentar usar dados mockados como fallback
            setRecommendations([]);
        } finally {
            setLoading(false);
        }
        }, [type, limit, itemId, itemType, category]);

    useEffect(() => {
        if (autoFetch) {
            fetchRecommendations();
        }
    }, [autoFetch, fetchRecommendations]);

    return {
        recommendations,
        loading,
        error,
        refetch: fetchRecommendations
    };
};

// Hook especializado para múltiplas seções de recomendações
export const useMultipleRecommendations = () => {
    const personalized = useRecommendations({ type: 'personalized', limit: 4 });
    const trending = useRecommendations({ type: 'trending', limit: 4 });
    const newItems = useRecommendations({ type: 'new', limit: 4 });

    return {
        personalized,
        trending,
        newItems,
        loading: personalized.loading || trending.loading || newItems.loading,
        refetchAll: async () => {
            await Promise.allSettled([
                personalized.refetch(),
                trending.refetch(),
                newItems.refetch()
            ]);
        }
    };
};
