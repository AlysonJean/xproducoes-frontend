import type { Equipment, Kit, Service } from '../types/types';
import { asArray } from './normalize';
import { transformEquipment } from './transformEquipment';
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
 * que acompanha o evento todo (técnico) e o que não está ativo. Com mais de um, vence o que tem as duas palavras,
 * depois o que mais kits trazem dentro e, por fim, a ordem do nome. Renomear para "Auxiliar de Montagem" ou "Roadie"
 * continua achando. A Proposta Rápida usa esta mesma função (antes cada tela desempatava de um jeito).
 */
export function findSetupService<T extends SetupCandidate & { id?: string | null }>(
  services: readonly T[],
  kits: readonly KitItemsLike[] = [],
): T | null {
  const inKits = (id?: string | null) => (id ? kits.filter((kit) => kitServiceIds(kit).has(id)).length : 0);
  const ranked = services
    .filter((s) => isAvailableForOrder(s) && s.coversWholeEvent !== true)
    .map((s) => {
      const text = plain(`${s.name ?? ''} ${s.slug ?? ''}`);
      return { s, score: (/\bmontagem\b/.test(text) ? 1 : 0) + (/\broadie\b/.test(text) ? 1 : 0) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || inKits(b.s.id) - inKits(a.s.id) || String(a.s.name ?? '').localeCompare(String(b.s.name ?? ''), 'pt-BR'));
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

// Palco (13/11/2026): os Kits 06 e 08 deixam de trazer o conjunto de palco (tablado, trave e backdrop), que passa a ser
// vendido à parte. O opcional são os itens ativos da categoria "Estruturas" do catálogo (tablado, traves, backdrop,
// totens, tenda), oferecidos na página do kit de entrega e no pedido de orçamento. Vale a categoria, nunca o nome do
// item: uma luz chamada "de palco" fica fora, e o item novo cadastrado em "Estruturas" entra sem mexer no site.

/** Frase do preço das estruturas, a mesma na página do kit e no pedido. */
export const STRUCTURE_PRICE_NOTE = 'Palco, traves, backdrop e tenda são cobrados por diária.';
/** No Kit 06, sem palco não há luz aérea: moving heads e spiders ficam presos na trave ou nos totens. */
export const STRUCTURE_LIGHTING_HINT = 'Luzes no alto (moving heads) precisam de trave ou totens.';

type StructureCandidate = { id?: string | null; status?: string | null; catalogMissing?: boolean; category?: unknown };

const categoryName = (category: unknown): string => {
  if (typeof category === 'string') return category;
  const name = (category as { name?: unknown } | null | undefined)?.name;
  return typeof name === 'string' ? name : '';
};

/** A categoria "Estruturas" do catálogo (o objeto da API ou o nome), sem acento, sem caixa e sem espaço nas pontas. */
export function isStructureCategory(category: unknown): boolean {
  return /^estruturas?$/.test(plain(categoryName(category)).trim());
}

/** Equipamento da categoria "Estruturas" que pode ir no pedido (ativo, como o servidor pede). */
export function isStructureOffer(item: StructureCandidate | null | undefined): boolean {
  return Boolean(item?.id) && isStructureCategory(item?.category) && isAvailableForOrder(item);
}

/** As estruturas a oferecer, na ordem do catálogo, menos as de `exclude` (o que o kit traz, o que já está no carrinho). */
export function structureOffers<T extends StructureCandidate>(catalog: readonly T[], exclude: Iterable<string> = []): T[] {
  const skip = new Set(exclude);
  return catalog.filter((item) => isStructureOffer(item) && !skip.has(String(item.id)));
}

type KitEquipmentLike = { items?: Array<{ equipmentId?: string | null; equipment?: { id?: string | null } | null } | null> | null } | null | undefined;

/**
 * Ids dos equipamentos que já vêm dentro do kit (itens do kit com equipamento), pela composição. null sem a lista de
 * itens: aí não se sabe o que o kit traz.
 */
export function kitEquipmentIds(kit: KitEquipmentLike): Set<string> | null {
  const items = kit?.items;
  if (!Array.isArray(items)) return null;
  const ids = new Set<string>();
  for (const item of items) {
    const id = item?.equipmentId ?? item?.equipment?.id;
    if (id) ids.add(id);
  }
  return ids;
}

// Uma consulta para a visita: a página do kit (também ao passar de um kit para outro, que zera o kit e consultaria de
// novo) e o /orcamento dividem a lista, guardada por 5 minutos só no navegador (no SSR os efeitos não rodam e nada
// fica guardado entre pedidos). A falha não fica guardada: a próxima abertura consulta de novo.
const STRUCTURE_CATALOG_TTL_MS = 5 * 60 * 1000;
let structureCatalogCache: { fetchJson: Fetch; at: number; list: Promise<Equipment[] | null> } | null = null;

/**
 * As estruturas do catálogo: a lista pública de equipamentos (GET /equipments, no cache público do servidor, com a
 * categoria de cada item), filtrada aqui, porque a lista não filtra por categoria. null na falha de rede: a página
 * segue sem a seção ou com a lista que já tinha. `fresh` consulta de novo (pedido recusado por item indisponível).
 */
export function fetchStructureCatalog(fetchJson: Fetch, options: { fresh?: boolean } = {}): Promise<Equipment[] | null> {
  const cached = structureCatalogCache;
  if (!options.fresh && cached && cached.fetchJson === fetchJson && Date.now() - cached.at < STRUCTURE_CATALOG_TTL_MS) {
    return cached.list;
  }
  const list = Promise.resolve()
    .then(() => fetchJson<unknown>('/equipments'))
    .then((data) => asArray<Equipment>(data).filter(isStructureOffer).map(transformEquipment))
    .catch(() => null);
  if (typeof window !== 'undefined') {
    const entry = { fetchJson, at: Date.now(), list };
    structureCatalogCache = entry;
    void list.then((result) => {
      if (result === null && structureCatalogCache === entry) structureCatalogCache = null;
    });
  }
  return list;
}

/** Esquece a lista guardada (os testes começam do zero). */
export function resetStructureCatalogCache(): void {
  structureCatalogCache = null;
}
