import { apiFetch } from './api';
import { asArray } from '../utils/normalize';

// Onda 2 da auditoria de 19/11 (F7admin2-05, F7admin2-04, F4-09, F6P1-04): as listas do painel que precisam de tudo.
// A 1ª página traz o total (meta.total, pedido com envelope: true); as demais saem em paralelo. A lista de Reservas
// fazia ~7 idas e voltas em série a cada abertura e a cada salvamento. Sem o total na resposta, segue página a página
// até vir uma incompleta, como antes. Itens com o mesmo id (uma página que mudou entre as consultas) entram uma vez só.
type Envelope = { data?: unknown; meta?: { total?: unknown } };

export async function fetchAllPages<T>(path: (page: number) => string, pageSize: number, maxPages = 100): Promise<T[]> {
  const first = await apiFetch<unknown>(path(1), { envelope: true });
  const env = first && typeof first === 'object' && !Array.isArray(first) && 'data' in first ? (first as Envelope) : null;
  const firstBatch = asArray<T>(env ? env.data : first);
  const total = typeof env?.meta?.total === 'number' ? env.meta.total : undefined;

  const all = [...firstBatch];
  if (total !== undefined) {
    const pages = Math.min(Math.ceil(total / pageSize), maxPages);
    const rest = await Promise.all(
      Array.from({ length: Math.max(pages - 1, 0) }, (_, i) => apiFetch<unknown>(path(i + 2), { envelope: true })),
    );
    for (const r of rest) all.push(...asArray<T>(r && typeof r === 'object' && !Array.isArray(r) && 'data' in r ? (r as Envelope).data : r));
  } else {
    let batch = firstBatch;
    for (let page = 2; page <= maxPages && batch.length >= pageSize; page++) {
      const r = await apiFetch<unknown>(path(page), { envelope: true });
      batch = asArray<T>(r && typeof r === 'object' && !Array.isArray(r) && 'data' in r ? (r as Envelope).data : r);
      all.push(...batch);
    }
  }

  const seen = new Set<unknown>();
  return all.filter((item) => {
    const id = item && typeof item === 'object' ? (item as { id?: unknown }).id : undefined;
    if (id === undefined) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** F4-09, F6P1-04: todos os clientes (GET /admin/clients pagina; 50 por padrão em produção, até 100). */
export function fetchAllAdminClients<T>(): Promise<T[]> {
  return fetchAllPages<T>((page) => `/admin/clients?page=${page}&pageSize=100`, 100);
}
