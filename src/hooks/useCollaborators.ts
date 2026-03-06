import type { ICollaborator } from '@/types/types';
import { useState } from 'react';
import { asArray } from '../utils/normalize';
// importação removida: tipos devem ser importados de '../types'
import { api } from '../services/api';

interface UseCollaboratorsReturn {
  collaborators: ICollaborator[];
  isLoading: boolean;
  error: string | null;
  fetchCollaborators: () => Promise<void>;
  deleteCollaborator: (id: string) => Promise<void>;
  getCollaboratorEvents: (id: string) => unknown[];
}

export const useCollaborators = (): UseCollaboratorsReturn => {
  const [collaborators, setCollaborators] = useState<ICollaborator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollaborators = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Busca dados reais da API
      const response = await api.get('/collaborators');
      const rawData = asArray(response.data);
      
      // Mapear dados do backend (que podem vir aninhados com user) para o formato esperado pelo frontend
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mappedData = rawData.map((item: any) => ({
        ...item,
        name: item.user?.name || item.name || 'Sem nome',
        email: item.user?.email || item.email || 'Sem email',
        role: item.collaboratorRole || item.role,
        avatar: item.user?.avatar || item.user?.avatarUrl || item.avatar,
      }));

      setCollaborators(mappedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar colaboradores');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCollaborator = async (id: string) => {
    try {
      setError(null);

      // Implementar endpoint real da API
      await api.delete(`/collaborators/${id}`);

      setCollaborators((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar colaborador');
    }
  };

  const getCollaboratorEvents = (_id: string) => {
    // TODO: Implementar busca de eventos do colaborador
    return [];
  };

  // Remover auto-fetch para evitar loop infinito e erro 401
  // useEffect(() => {
  //   fetchCollaborators();
  // }, []);

  return {
    collaborators,
    isLoading,
    error,
    fetchCollaborators,
    deleteCollaborator,
    getCollaboratorEvents,
  };
};
