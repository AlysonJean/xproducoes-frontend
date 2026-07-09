// Provider + hook(s) co-localizados de propósito (padrão oficial de Context do React) —
// só afeta a granularidade do Fast Refresh em dev, sem efeito em produção/correção.
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';
import { ICollaborator } from '../types/types';
import type { Event } from '../types/domains/dashboard';
import { apiFetch } from '../services/api';

export interface CollaboratorContextType {
  collaborators: ICollaborator[];
  isLoading: boolean;
  error: string | null;
  fetchCollaborators: () => Promise<void>;
  deleteCollaborator: (id: string) => Promise<void>;
  getCollaboratorEvents: (id: string) => Event[];
}

export const CollaboratorContext = createContext<CollaboratorContextType | undefined>(undefined);

export const useCollaborators = () => {
  const context = useContext(CollaboratorContext);
  if (!context) throw new Error('useCollaborators must be used within a CollaboratorProvider');
  return context;
};

export const CollaboratorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collaborators, setCollaborators] = useState<ICollaborator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollaborators = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiFetch<ICollaborator[]>('/collaborators');
      setCollaborators(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar colaboradores';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCollaborator = async (id: string) => {
    try {
      await apiFetch(`/collaborators/${id}`, { method: 'DELETE' });
      setCollaborators(prev => prev.filter(collab => collab.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao deletar colaborador';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getCollaboratorEvents = (_id: string): Event[] => {
    return [];
  };

  // Remover auto-fetch para evitar loop infinito e erro 401
  // useEffect(() => {
  //   fetchCollaborators();
  // }, []);

  const value = {
    collaborators,
    isLoading,
    error,
    fetchCollaborators,
    deleteCollaborator,
    getCollaboratorEvents,
  };

  return (
    <CollaboratorContext.Provider value={value}>
      {children}
    </CollaboratorContext.Provider>
  );
};
