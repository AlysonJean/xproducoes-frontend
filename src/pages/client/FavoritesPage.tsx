import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { EquipmentCard } from '../../components/ui/EquipmentCard';
import { ServiceCard } from '../../components/ui/ServiceCard';
import { KitCard } from '../../components/ui/KitCard';
import { Badge, Card, buttonVariants } from '../../components/ui/StandardComponents';
import { ClientPage, ClientPageError, ClientPageLoading } from '../../components/client/ClientPage';
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
  // Incrementado pelo "Tentar de novo" do estado de erro para refazer a busca.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const fetchFavorites = async () => {
      setError(null);
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
  }, [favorites, reloadKey]);

  // Get trending recommendations when no favorites
  const trendingRecommendations = useRecommendations({
    type: 'trending',
    limit: 8,
    autoFetch: favorites.length === 0
  });

  const hasFavorites = favorites.length > 0;
  const pageDescription = hasFavorites
    ? `${favorites.length} ${favorites.length === 1 ? 'item favorito' : 'itens favoritos'}`
    : 'Você ainda não tem itens favoritos';

  if (loading) {
    return (
      <ClientPage title="Meus Favoritos">
        <ClientPageLoading label="Carregando favoritos..." />
      </ClientPage>
    );
  }

  if (error) {
    return (
      <ClientPage title="Meus Favoritos">
        <ClientPageError message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      </ClientPage>
    );
  }

  return (
    <ClientPage title="Meus Favoritos" description={pageDescription}>
      {!hasFavorites ? (
        <Card className="px-6 py-12 text-center">
          <div className="mx-auto max-w-md">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
              <Heart className="h-10 w-10" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">
              Nenhum favorito ainda
            </h2>
            <p className="mb-6 text-muted-foreground">
              Explore nossos equipamentos, kits e serviços e adicione seus favoritos clicando no ícone de coração.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              {/* <Link> (antes <a href>, que recarregava o app inteiro) */}
              <Link to="/equipamentos" className={buttonVariants()}>
                Equipamentos
              </Link>
              <Link to="/servicos" className={buttonVariants({ variant: 'outline' })}>
                Serviços
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-10">
          {[
            { key: 'equipments', title: 'Equipamentos', count: equipments.length, items: equipments.map((equipment) => (
              <EquipmentCard key={equipment.id} equipment={equipment} />
            )) },
            { key: 'kits', title: 'Kits', count: kits.length, items: kits.map((kit) => (
              <KitCard key={kit.id} kit={kit} showFavorite={true} />
            )) },
            { key: 'services', title: 'Serviços', count: services.length, items: services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            )) },
          ].filter((section) => section.count > 0).map((section) => (
            <section key={section.key}>
              <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-foreground">
                {section.title}
                <Badge variant="ghost" size="md">{section.count}</Badge>
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {section.items}
              </div>
            </section>
          ))}
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
    </ClientPage>
  );
};
