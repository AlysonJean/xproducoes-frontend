import type { Equipment, Kit, Service } from '../types/types';
import { transformKit } from './transformKit';

// Auditoria do orçamento (12/11/2026), O19, O23, E1 e E5: regras do carrinho que dependem do catálogo de agora.
// O carrinho de visitante guarda no navegador a cópia inteira de cada item, do dia em que entrou: preço, tipo do kit,
// horas incluídas e status antigos apareciam no carrinho e no "Total estimado", e o servidor cobrava o atual.

/** Marca da cópia que o catálogo não devolve mais (item excluído): continua no carrinho, com o nome, marcada. */
export interface CatalogMark {
  catalogMissing?: boolean;
}

type AvailabilityLike = { status?: string | null; catalogMissing?: boolean } | null | undefined;

/**
 * O item pode ir no pedido: ativo no catálogo (o servidor só aceita item ATIVO no pedido de cliente). Sem o status
 * (cópia guardada antes, resposta antiga), vale como ativo: a releitura do catálogo e o servidor conferem.
 */
export function isAvailableForOrder(item: AvailabilityLike): boolean {
  if (!item || item.catalogMissing) return false;
  return !item.status || item.status === 'ACTIVE';
}

type KitItemsLike = { items?: Array<{ serviceId?: string | null; service?: { id?: string | null } | null } | null> | null } | null | undefined;

/** E1: ids dos serviços que já vêm dentro do kit (itens do kit com serviço), pela composição, não pelo nome. */
export function kitServiceIds(kit: KitItemsLike): Set<string> {
  const ids = new Set<string>();
  for (const item of kit?.items ?? []) {
    const id = item?.serviceId ?? item?.service?.id;
    if (id) ids.add(id);
  }
  return ids;
}

const plain = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type SetupCandidate = { name?: string | null; slug?: string | null; status?: string | null; coversWholeEvent?: boolean | null };

/**
 * E5: o serviço de montagem do catálogo ("Roadie / Auxiliar de Montagem"). O cadastro de serviço não tem um campo que
 * diga "este é o de montagem" (criar um pede migração), então vale a palavra, sem acento nem caixa, no nome ou no
 * endereço da página: "montagem" ou "roadie", como palavra inteira ("desmontagem" não conta). Fica de fora o serviço
 * que acompanha o evento todo (técnico) e o que não está ativo. Com mais de um, vence o que tem as duas palavras e,
 * depois, a ordem do nome. Renomear para "Auxiliar de Montagem" ou "Roadie" continua achando.
 */
export function findSetupService<T extends SetupCandidate>(services: readonly T[]): T | null {
  const ranked = services
    .filter((s) => isAvailableForOrder(s) && s.coversWholeEvent !== true)
    .map((s) => {
      const text = plain(`${s.name ?? ''} ${s.slug ?? ''}`);
      return { s, score: (/\bmontagem\b/.test(text) ? 1 : 0) + (/\broadie\b/.test(text) ? 1 : 0) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || String(a.s.name ?? '').localeCompare(String(b.s.name ?? ''), 'pt-BR'));
  return ranked[0]?.s ?? null;
}

type Fetch = <T>(endpoint: string) => Promise<T>;
type Fresh<T> = T | 'missing';

/** O catálogo de agora para os itens do carrinho: a cópia nova, 'missing' (404) ou nada (falha de rede: fica a cópia). */
export interface CatalogSnapshot {
  kits: Record<string, Fresh<Kit>>;
  equipments: Record<string, Fresh<Equipment>>;
  services: Record<string, Fresh<Service>>;
}

type GuestCartLike = { kit?: Kit | null; equipments?: unknown[] | null; services?: Service[] | null };

const idOf = (item: unknown): string | null => {
  const id = (item as { id?: unknown } | null)?.id;
  return typeof id === 'string' && id ? id : null;
};

async function readFresh<T>(fetchJson: Fetch, endpoint: string): Promise<Fresh<T> | null> {
  try {
    const data = await fetchJson<T>(endpoint);
    return data && typeof data === 'object' ? data : null;
  } catch (error) {
    return (error as { status?: number } | null)?.status === 404 ? 'missing' : null;
  }
}

/**
 * Relê do catálogo (GET /kits/:id, /equipments/:id, /services/:id, que o servidor guarda no cache público) cada item
 * do carrinho do navegador. As páginas de detalhe devolvem também o item inativo (com o status), e o 404 é o item que
 * sumiu.
 */
export async function fetchCatalogSnapshot(cart: GuestCartLike, fetchJson: Fetch): Promise<CatalogSnapshot> {
  const snapshot: CatalogSnapshot = { kits: {}, equipments: {}, services: {} };
  const jobs: Array<Promise<void>> = [];
  const read = <T>(bucket: Record<string, Fresh<T>>, path: string, id: string | null) => {
    if (!id || id in bucket) return;
    jobs.push(
      readFresh<T>(fetchJson, `${path}/${encodeURIComponent(id)}`).then((fresh) => {
        if (fresh) bucket[id] = fresh;
      }),
    );
  };
  read(snapshot.kits, '/kits', idOf(cart.kit));
  for (const eq of cart.equipments ?? []) read(snapshot.equipments, '/equipments', idOf(eq));
  for (const svc of cart.services ?? []) read(snapshot.services, '/services', idOf(svc));
  await Promise.all(jobs);
  return snapshot;
}

function refreshed<T extends object>(item: T, fresh: Fresh<T> | undefined, convert: (value: T) => T = (value) => value): T {
  if (!fresh) return item;
  if (fresh === 'missing') return { ...item, catalogMissing: true };
  return convert(fresh);
}

/**
 * Troca no carrinho cada cópia pela do catálogo (preço, tipo do kit, horas incluídas, composição, status) e marca a
 * que sumiu, guardando o nome. Feita sobre o carrinho mais recente (o visitante pode ter mexido durante a consulta):
 * item que entrou depois fica como está.
 */
export function applyCatalogSnapshot<C extends GuestCartLike>(cart: C, snapshot: CatalogSnapshot): C {
  const kitId = idOf(cart.kit);
  return {
    ...cart,
    kit: cart.kit && kitId ? refreshed<Kit>(cart.kit, snapshot.kits[kitId], transformKit) : cart.kit,
    equipments: (cart.equipments ?? []).map((eq) => {
      const id = idOf(eq);
      return id ? refreshed<Equipment>(eq as Equipment, snapshot.equipments[id]) : eq;
    }),
    services: (cart.services ?? []).map((svc) => {
      const id = idOf(svc);
      return id ? refreshed<Service>(svc, snapshot.services[id]) : svc;
    }),
  };
}
