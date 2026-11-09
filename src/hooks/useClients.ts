
import { useState, useCallback } from 'react';
import type { Client } from '@/types/types';
import { clientAPI } from '../services/api';
import { asArray } from '../utils/normalize';

// D8c (aprovada em 02/11/2026), parte 2: a resposta do "Excluir cliente" diz o que aconteceu (apagado, anonimizado ou
// adiado) e traz o texto para o aviso da tela. O interceptor do axios já entrega só o data da resposta.
export interface DeleteClientResult {
  outcome?: 'removed' | 'anonymized' | 'postponed';
  until?: string | null;
  message?: string;
}

interface UseClientsReturn {
  clients: Client[];
  isLoading: boolean;
  error: string | null;
    fetchClients: (filters?: Record<string, unknown>) => Promise<void>;
  deleteClient: (id: string) => Promise<DeleteClientResult>;
    meta: Record<string, unknown> | null;
}

export const useClients = (): UseClientsReturn => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
    const [meta, setMeta] = useState<Record<string, unknown> | null>(null);

    const fetchClients = useCallback(async (filters?: Record<string, unknown>) => {
    try {
      setIsLoading(true);
      setError(null);
      // GET /admin/clients pagina (produção: 50 por padrão, máx. 100) e o interceptor do axios
      // descarta o `meta` — pedindo só a 1ª página, os clientes além dos 50 primeiros sumiam da
      // tela (que filtra no navegador). Busca de 100 em 100 até vir uma página incompleta.
      const PAGE_SIZE = 100;
      const all: Client[] = [];
      for (let page = 1; page <= 100; page++) {
        const response = await clientAPI.getAll({ ...filters, page, pageSize: PAGE_SIZE });
        const result = response.data;
        const batch = asArray<Client>(result && result.data ? result.data : result);
        all.push(...batch);
        if (batch.length < PAGE_SIZE) break;
      }
      setClients(all);
      setMeta({ total: all.length });
        } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)) || 'Erro ao buscar clientes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteClient = async (id: string): Promise<DeleteClientResult> => {
    try {
      setError(null);
      const response = await clientAPI.delete(id);
      const result: DeleteClientResult = (response?.data ?? {}) as DeleteClientResult;
      // Adiada: o cliente continua na lista, com a marca "Exclusão agendada".
      if (result.outcome === 'postponed') {
        const scheduledAt = new Date().toISOString();
        setClients((prev) => prev.map((c) => (c.id === id ? { ...c, deletionScheduledAt: c.deletionScheduledAt ?? scheduledAt } : c)));
      } else {
        setClients((prev) => prev.filter((c) => c.id !== id));
      }
      return result;
        } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)) || 'Erro ao remover cliente');
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
