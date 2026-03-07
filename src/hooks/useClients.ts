/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import type { Client } from '@/types/types';
import { clientAPI } from '../services/api';
import { asArray } from '../utils/normalize';

interface UseClientsReturn {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
    fetchClients: (filters?: any) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
    meta: any;
}

export const useClients = (): UseClientsReturn => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
    const [meta, setMeta] = useState<any>(null);

    const fetchClients = useCallback(async (filters?: any) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await clientAPI.getAll(filters);
      // O Axios retorna os dados em response.data
      const result = response.data;
      
      if (result && result.data) {
        setClients(asArray(result.data));
        setMeta(result.meta);
      } else {
        setClients(asArray(result));
      }
        } catch (err: any) {
      setError(err?.message || 'Erro ao buscar clientes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteClient = async (id: string) => {
    try {
      setError(null);
      await clientAPI.delete(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
        } catch (err: any) {
      setError(err?.message || 'Erro ao remover cliente');
      throw err;
    }
  };

  return {
    clients,
    isLoading,
    error,
    fetchClients,
    deleteClient,
    meta,
  };
};
