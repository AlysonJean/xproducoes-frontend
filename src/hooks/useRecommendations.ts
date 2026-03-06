// Caminho: frontend/src/hooks/useRecommendations.ts

import { useState, useEffect, useCallback } from 'react';
import { recommendationAPI } from '../services/api';
import { RecommendationItem, RecommendationType } from '../components/ui/RecommendationSection';
import { asArray } from '../utils/normalize';

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
    price?: number;
    dailyPrice?: number;
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
    minPrice,
    maxPrice,
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
            const mappedData: RecommendationItem[] = (data as RawRecommendationItem[]).map((item) => ({
                id: item.id || item._id || Math.random().toString(36).substr(2, 9),
                name: item.name || item.title || 'Sem título',
                description: item.description || item.shortDescription,
                imageUrl: item.imageUrl || item.image || item.thumbnailUrl,
                price: item.price || item.dailyPrice || 0,
                rating: item.rating || item.averageRating,
                reviewCount: item.reviewCount || item.totalReviews,
                isPopular: item.isPopular || item.popular || false,
                isNew: item.isNew || item.new || false,
                isFavorite: item.isFavorite || item.favorite || false,
                category: item.category?.name || item.categoryName,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                type: (item.type as any) || (item.equipments ? 'kit' : 'equipment'),
                discount: item.discount || item.discountPercentage || 0
            }));

            setRecommendations(mappedData);
        } catch (err) {
            console.error('Erro ao buscar recomendações:', err);
            setError(err instanceof Error ? err.message : 'Erro ao carregar recomendações');

            // Em caso de erro, tentar usar dados mockados como fallback
            setRecommendations([]);
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, limit, itemId, itemType, category, minPrice, maxPrice]);

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
            await Promise.all([
                personalized.refetch(),
                trending.refetch(),
                newItems.refetch()
            ]);
        }
    };
};
