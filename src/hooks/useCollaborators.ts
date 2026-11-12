
import type { ICollaborator } from '@/types/types';
import { useCallback, useState } from 'react';
import { asArray } from '../utils/normalize';
// importação removida: tipos devem ser importados de '../types'
import { api } from '../services/api';

interface UseCollaboratorsReturn {
  collaborators: ICollaborator[];
  isLoading: boolean;
  error: string | null;
  fetchCollaborators: () => Promise<void>;
  getCollaboratorEvents: (id: string) => unknown[];
}

export const useCollaborators = (): UseCollaboratorsReturn => {
  const [collaborators, setCollaborators] = useState<ICollaborator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useCallback com deps vazias (só usa setters de estado, que são estáveis): a página chama
  // fetchCollaborators num useEffect que depende dela — recriada a cada render, cada busca
  // disparava outra, em loop (dezenas de requisições por segundo, até tomar 429).
  const fetchCollaborators = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Busca dados reais da API
      const response = await api.get('/collaborators');
      type RawCollaborator = {
        id: string;
        name?: string;
        email?: string;
        collaboratorRole?: string;
        role?: string;
        avatar?: string;
        user?: { name?: string; email?: string; avatar?: string; avatarUrl?: string };
      };
      
      const rawData = asArray<RawCollaborator>(response.data);
      
      // Mapear dados do backend (que podem vir aninhados com user) para o formato esperado pelo frontend
            const mappedData = rawData.map((item) => ({
        ...item,
        name: item.user?.name || item.name || 'Sem nome',
        email: item.user?.email || item.email || 'Sem email',
        role: (item.collaboratorRole || item.role) as ICollaborator['role'],
        avatar: item.user?.avatar || item.user?.avatarUrl || item.avatar,
      }));

      setCollaborators(mappedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar colaboradores');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Decisão de Alyson (12/11/2026): saiu daqui deleteCollaborator (DELETE /collaborators/:id, a exclusão definitiva, que
  // o servidor não faz mais). "Desativar acesso" e "Reativar" ficam na tela da equipe (AdminCollaboratorsPage).

  const getCollaboratorEvents = useCallback((_id: string) => {
    return [];
  }, []);

  // Remover auto-fetch para evitar loop infinito e erro 401
  // useEffect(() => {
  //   fetchCollaborators();
  // }, []);

  return {
    collaborators,
    isLoading,
    error,
    fetchCollaborators,
    getCollaboratorEvents,
  };
};
