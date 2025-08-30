import { useState, useEffect } from 'react';
import { EquipmentCard } from '../../components/ui/EquipmentCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useFavorites } from '../../contexts/FavoritesContext';
import { apiFetch } from '../../services/api';
import type { Equipment } from '../../types/types';

export const FavoritesPage = () => {
  const { favorites } = useFavorites();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFavoriteEquipments = async () => {
      if (favorites.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Filtrar ids inválidos e garantir string
        const validIds = favorites
          .map((id) => (id !== null && id !== undefined ? String(id).trim() : ''))
          .filter((id) => id !== '');

        if (validIds.length === 0) {
          setEquipments([]);
          return;
        }

        // Buscar equipamentos pelos IDs dos favoritos (tolerante a falhas)
        const equipmentPromises = validIds.map((id) => apiFetch(`/equipments/${encodeURIComponent(id)}`));

        const equipmentResults = await Promise.allSettled(equipmentPromises);

        const validEquipments: Equipment[] = [];

        for (const res of equipmentResults) {
          if (res.status === 'fulfilled') {
            const value = res.value as any;
            // apiFetch normalmente retorna o resource diretamente; alguns endpoints retornam { equipment }
            const equipment: Equipment = value?.equipment ?? value;
            if (equipment && equipment.id) validEquipments.push(equipment);
          }
        }

        setEquipments(validEquipments);
      } catch (err) {
        // Erro ao carregar favoritos já tratado
        setError('Não foi possível carregar os equipamentos favoritos.');
      } finally {
        setLoading(false);
      }
    };

    fetchFavoriteEquipments();
  }, [favorites]);

  if (loading) {
    return <LoadingSpinner label="Carregando favoritos..." size="lg" className="py-20" />;
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="text-destructive text-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
  <h1 className="text-title-1 font-bold mb-4 text-foreground">Meus Favoritos</h1>
  <p className="text-muted-foreground text-lg">
          {favorites.length > 0
            ? `${favorites.length} ${favorites.length === 1 ? 'equipamento favorito' : 'equipamentos favoritos'}`
            : 'Você ainda não tem equipamentos favoritos'}
        </p>
      </div>

      {favorites.length === 0 ? (
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
              Explore nossos equipamentos e adicione seus favoritos clicando no ícone de coração.
            </p>
            <a
              href="/"
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Explorar Equipamentos
            </a>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {equipments.map((equipment) => (
            <div key={equipment.id}>
              <EquipmentCard equipment={equipment} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
