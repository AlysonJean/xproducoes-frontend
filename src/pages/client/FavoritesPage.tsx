import { useState, useEffect, useRef } from 'react';
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

type FavoriteItem = Equipment | Kit | Service;

// F8-19: a rota e a chave de cada tipo de favorito (a resposta vem direta ou dentro de { equipment | kit | service }).
const FAVORITE_ENDPOINTS: Record<string, { path: string; key: 'equipment' | 'kit' | 'service' }> = {
  equipment: { path: '/equipments/', key: 'equipment' },
  kit: { path: '/kits/', key: 'kit' },
  service: { path: '/services/', key: 'service' },
};

async function fetchFavoriteItem(type: string, id: string): Promise<FavoriteItem | null> {
  const endpoint = FAVORITE_ENDPOINTS[type];
  if (!endpoint) return null;
  const value = await apiFetch<Record<string, unknown>>(`${endpoint.path}${encodeURIComponent(id)}`);
  const item = (value && 'id' in value ? value : value?.[endpoint.key]) as FavoriteItem | undefined;
  return item && item.id ? item : null;
}

export const FavoritesPage = () => {
  const { favorites } = useFavorites();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Incrementado pelo "Tentar de novo" do estado de erro para refazer a busca.
  const [reloadKey, setReloadKey] = useState(0);

  // Onda 4 da auditoria de 19/11 (F8-19): os itens já carregados ficam guardados. Quando a lista de favoritos muda, sai da tela o
  // que foi desfavoritado (sem rede) e só os novos são buscados; o "carregando" aparece só na primeira vez. Antes,
  // desfavoritar um item refazia a busca de todos os outros, com a tela trocada pelo carregando.
  const loadedItems = useRef(new Map<string, FavoriteItem>());
  const firstLoad = useRef(true);

  useEffect(() => {
    let cancelled = false;
    const keyOf = (f: { type: string; id: string }) => `${f.type}:${f.id}`;
    const publish = () => {
      const pick = <T,>(type: string) =>
        favorites.filter((f) => f.type === type).map((f) => loadedItems.current.get(keyOf(f)) as T | undefined).filter((x): x is T => Boolean(x));
      setEquipments(pick<Equipment>('equipment'));
      setKits(pick<Kit>('kit'));
      setServices(pick<Service>('service'));
    };
    const run = async () => {
      setError(null);
      const keys = new Set(favorites.map(keyOf));
      for (const key of [...loadedItems.current.keys()]) if (!keys.has(key)) loadedItems.current.delete(key);
      const missing = favorites.filter((f) => FAVORITE_ENDPOINTS[f.type] && !loadedItems.current.has(keyOf(f)));
      if (missing.length > 0) {
        if (firstLoad.current) setLoading(true);
        const results = await Promise.allSettled(missing.map((f) => fetchFavoriteItem(f.type, f.id)));
        if (cancelled) return;
        results.forEach((res, index) => {
          if (res.status === 'fulfilled' && res.value) loadedItems.current.set(keyOf(missing[index]), res.value);
        });
      }
      publish();
      firstLoad.current = false;
      setLoading(false);
    };
    void run();
    return () => { cancelled = true; };
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
