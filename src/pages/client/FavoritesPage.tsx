import { useState, useEffect } from 'react';
import { EquipmentCard } from '../../components/ui/EquipmentCard';
import { ServiceCard } from '../../components/ui/ServiceCard';
import { KitCard } from '../../components/ui/KitCard';
import BrandLoader from '../../components/ui/BrandLoader';
import { useFavorites } from '../../contexts/FavoritesContext';
import { apiFetch } from '../../services/api';
import type { Equipment, Kit, Service } from '../../types/types';
import { RecommendationSection } from '../../components/ui/RecommendationSection';
import { useRecommendations } from '../../hooks/useRecommendations';

export const FavoritesPage = () => {
  const { favorites } = useFavorites();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (favorites.length === 0) {
        setEquipments([]);
        setKits([]);
        setServices([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const equipmentIds = favorites.filter(f => f.type === 'equipment').map(f => f.id);
        const kitIds = favorites.filter(f => f.type === 'kit').map(f => f.id);
        const serviceIds = favorites.filter(f => f.type === 'service').map(f => f.id);

        const promises = [];

        if (equipmentIds.length > 0) {
           promises.push(
               Promise.allSettled(equipmentIds.map(id => apiFetch<{ equipment?: Equipment } | Equipment>(`/equipments/${encodeURIComponent(id)}`)))
               .then(results => {
                   const valid: Equipment[] = [];
                   results.forEach(res => {
                       if (res.status === 'fulfilled') {
                           const val = res.value;
                           const item = 'id' in val ? val : val.equipment;
                           if (item && item.id) valid.push(item);
                       }
                   });
                   setEquipments(valid);
               })
           );
        } else {
            setEquipments([]);
        }

        if (kitIds.length > 0) {
            promises.push(
                Promise.allSettled(kitIds.map(id => apiFetch<{ kit?: Kit } | Kit>(`/kits/${encodeURIComponent(id)}`)))
                .then(results => {
                    const valid: Kit[] = [];
                    results.forEach(res => {
                        if (res.status === 'fulfilled') {
                            const val = res.value;
                            const item = 'id' in val ? val : val.kit;
                            if (item && item.id) valid.push(item);
                        }
                    });
                    setKits(valid);
                })
            );
         } else {
             setKits([]);
         }

         if (serviceIds.length > 0) {
            promises.push(
                Promise.allSettled(serviceIds.map(id => apiFetch<{ service?: Service } | Service>(`/services/${encodeURIComponent(id)}`)))
                .then(results => {
                    const valid: Service[] = [];
                    results.forEach(res => {
                        if (res.status === 'fulfilled') {
                            const val = res.value;
                            // Assuming backend returns { service } or direct object
                            const item = 'id' in val ? val : val.service;
                            if (item && item.id) valid.push(item);
                        }
                    });
                    setServices(valid);
                })
            );
         } else {
             setServices([]);
         }

        await Promise.all(promises);

            } catch {
        setError('Não foi possível carregar alguns favoritos.');
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [favorites]);

  // Get trending recommendations when no favorites
  const trendingRecommendations = useRecommendations({
    type: 'trending',
    limit: 8,
    autoFetch: favorites.length === 0
  });

  if (loading) {
    return <BrandLoader fullScreen size={140} label="Carregando favoritos..." />;
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="text-destructive text-lg">{error}</div>
      </div>
    );
  }

  const hasFavorites = favorites.length > 0;

  return (
    <div className="space-y-12">
      <div className="text-center">
        <h1 className="text-title-1 font-bold mb-4 text-foreground">Meus Favoritos</h1>
        <p className="text-muted-foreground text-lg">
          {hasFavorites
            ? `${favorites.length} ${favorites.length === 1 ? 'item favorito' : 'itens favoritos'}`
            : 'Você ainda não tem itens favoritos'}
        </p>
      </div>

      {!hasFavorites ? (
        <div className="text-center py-20">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              Nenhum favorito ainda
            </h3>
            <p className="text-muted-foreground mb-6">
              Explore nossos equipamentos, kits e serviços e adicione seus favoritos clicando no ícone de coração.
            </p>
            <div className="flex justify-center gap-4">
                <a
                href="/equipamentos"
                className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                Equipamentos
                </a>
                 <a
                href="/servicos"
                className="inline-flex items-center px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                >
                Serviços
                </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
            {/* Equipments Section */}
            {equipments.length > 0 && (
                <section>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        Equipamentos
                        <span className="text-sm font-normal bg-muted px-2 py-1 rounded-full">{equipments.length}</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {equipments.map((equipment) => (
                            <div key={equipment.id}>
                            <EquipmentCard equipment={equipment} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Kits Section */}
            {kits.length > 0 && (
                <section>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        Kits
                        <span className="text-sm font-normal bg-muted px-2 py-1 rounded-full">{kits.length}</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {kits.map((kit) => (
                            <div key={kit.id}>
                            <KitCard kit={kit} showFavorite={true} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Services Section */}
            {services.length > 0 && (
                <section>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        Serviços
                        <span className="text-sm font-normal bg-muted px-2 py-1 rounded-full">{services.length}</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {services.map((service) => (
                            <div key={service.id}>
                            <ServiceCard service={service} />
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
      )}

      {/* Recomendações quando não há favoritos */}
      {!hasFavorites && trendingRecommendations.recommendations.length > 0 && (
        <div className="mt-12">
          <RecommendationSection
            type="trending"
            title="Talvez você goste destes"
            subtitle="Explore nossos equipamentos mais populares"
            items={trendingRecommendations.recommendations}
            maxItems={8}
            loading={trendingRecommendations.loading}
            viewAllLink="/equipamentos"
            viewAllText="Ver Todos"
            columns={{ sm: 1, md: 2, lg: 4 }}
          />
        </div>
      )}
    </div>
  );
};
