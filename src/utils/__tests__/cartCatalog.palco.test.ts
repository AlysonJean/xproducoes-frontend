import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchStructureCatalog,
  isStructureCategory,
  isStructureOffer,
  kitEquipmentIds,
  resetStructureCatalogCache,
  structureOffers,
  STRUCTURE_LIGHTING_HINT,
  STRUCTURE_PRICE_NOTE,
} from '../cartCatalog';

// Palco (13/11/2026): os Kits 06 e 08 deixam de trazer o conjunto de palco, que passa a ser vendido à parte. O opcional
// são os itens ativos da categoria "Estruturas" do catálogo, achados pela categoria (sem acento, sem caixa), nunca pelo
// nome do item.

// O equipamento como GET /equipments devolve (Decimal em texto, a categoria junto).
const estrutura = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id, name, pricePerHour: '200.00', status: 'ACTIVE', category: { id: 'cat-est', name: 'Estruturas' }, ...extra,
});

describe('Estruturas do catálogo (palco à parte, 13/11/2026)', () => {
  beforeEach(() => resetStructureCatalogCache());
  afterEach(() => vi.restoreAllMocks());

  it('a categoria "Estruturas" vale sem acento, sem caixa e com espaço nas pontas, no objeto da API ou no nome', () => {
    for (const categoria of ['Estruturas', 'ESTRUTURAS', 'estruturas', '  Estruturas ', 'Estrutúras', 'Estrutura', { name: 'ESTRUTURAS' }, { id: 'c', name: 'Estrutúras' }]) {
      expect(isStructureCategory(categoria)).toBe(true);
    }
    for (const categoria of ['Iluminação', 'Palco', 'Estruturas de Luz', 'Infraestruturas', '', null, undefined, { name: null }, { id: 'cat-est' }, 42]) {
      expect(isStructureCategory(categoria)).toBe(false);
    }
  });

  it('entra pela categoria, nunca pelo nome: a luz "de palco" de Iluminação fica fora; qualquer nome em Estruturas entra', () => {
    expect(isStructureOffer(estrutura('eq-tablado', 'Tablado de Palco Modular'))).toBe(true);
    expect(isStructureOffer(estrutura('eq-totem', 'Box Truss Par de Totens', { category: { name: 'ESTRUTURAS' } }))).toBe(true);
    expect(isStructureOffer(estrutura('eq-luz', 'Luz de Palco', { category: { name: 'Iluminação' } }))).toBe(false);
    expect(isStructureOffer(estrutura('eq-palco', 'Palco', { category: { name: 'Som' } }))).toBe(false);
    // Sem a categoria na resposta não há como saber: fica fora.
    expect(isStructureOffer(estrutura('eq-trave', 'Trave Multiuso Pro', { category: undefined, categoryId: 'cat-est' }))).toBe(false);
  });

  it('só o item ativo entra: em manutenção, em breve, inativo ou fora do catálogo, não', () => {
    for (const status of ['MAINTENANCE', 'COMING_SOON', 'INACTIVE']) {
      expect(isStructureOffer(estrutura('eq-tenda', 'Tenda Gazebo', { status }))).toBe(false);
    }
    expect(isStructureOffer(estrutura('eq-tenda', 'Tenda Gazebo', { catalogMissing: true }))).toBe(false);
    expect(isStructureOffer(null)).toBe(false);
  });

  it('structureOffers tira o que o kit traz e o que já está no carrinho, na ordem do catálogo', () => {
    const catalogo = [
      estrutura('eq-backdrop', 'Backdrop'),
      estrutura('eq-luz', 'Luz de Palco', { category: { name: 'Iluminação' } }),
      estrutura('eq-tablado', 'Tablado de Palco Modular'),
      estrutura('eq-trave', 'Trave Multiuso Pro'),
      estrutura('eq-tenda', 'Tenda Gazebo', { status: 'MAINTENANCE' }),
    ];
    expect(structureOffers(catalogo).map((it) => it.id)).toEqual(['eq-backdrop', 'eq-tablado', 'eq-trave']);
    expect(structureOffers(catalogo, ['eq-trave', 'eq-backdrop']).map((it) => it.id)).toEqual(['eq-tablado']);
    expect(structureOffers(catalogo, new Set(['eq-tablado'])).map((it) => it.id)).toEqual(['eq-backdrop', 'eq-trave']);
  });

  it('kitEquipmentIds: os equipamentos de dentro do kit (pelo equipmentId ou pelo equipamento); sem a lista de itens, null', () => {
    const kit = { items: [{ equipmentId: 'eq-trave' }, { equipment: { id: 'eq-tablado' } }, { serviceId: 'sv-log' }, null] };
    expect(kitEquipmentIds(kit)).toEqual(new Set(['eq-trave', 'eq-tablado']));
    expect(kitEquipmentIds({ items: [] })).toEqual(new Set());
    expect(kitEquipmentIds({})).toBeNull();
    expect(kitEquipmentIds(null)).toBeNull();
  });

  it('fetchStructureCatalog lê GET /equipments e devolve só as estruturas ativas; aceita o envelope { data }; falha de rede = null', async () => {
    const fetchJson = vi.fn().mockResolvedValue([
      estrutura('eq-tablado', 'Tablado de Palco Modular', { pricePerHour: '400.00' }),
      estrutura('eq-luz', 'Luz de Palco', { category: { name: 'Iluminação' } }),
      estrutura('eq-tenda', 'Tenda Gazebo', { status: 'COMING_SOON' }),
    ]);
    const lista = await fetchStructureCatalog(fetchJson);
    expect(fetchJson).toHaveBeenCalledWith('/equipments');
    expect(lista?.map((it) => it.id)).toEqual(['eq-tablado']);
    expect(lista?.[0].pricePerHour).toBe(400);

    const envelope = vi.fn().mockResolvedValue({ data: [estrutura('eq-trave', 'Trave Multiuso Pro')] });
    expect((await fetchStructureCatalog(envelope))?.map((it) => it.id)).toEqual(['eq-trave']);
    // null, não lista vazia: a página que já tinha a lista fica com ela.
    expect(await fetchStructureCatalog(vi.fn().mockRejectedValue(new Error('rede fora')))).toBeNull();
  });

  it('uma consulta para a visita: a 2ª chamada usa a lista guardada; fresh consulta de novo; vale 5 minutos; a falha não fica guardada', async () => {
    const agora = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const fetchJson = vi.fn().mockResolvedValue([estrutura('eq-tablado', 'Tablado de Palco Modular')]);
    const ids = async (lista: Promise<Array<{ id: string }> | null>) => (await lista)?.map((it) => it.id);
    expect(await ids(fetchStructureCatalog(fetchJson))).toEqual(['eq-tablado']);
    expect(await ids(fetchStructureCatalog(fetchJson))).toEqual(['eq-tablado']);
    expect(fetchJson).toHaveBeenCalledTimes(1);

    // Pedido recusado por item indisponível: consulta de novo, e a lista nova passa a valer.
    fetchJson.mockResolvedValue([estrutura('eq-trave', 'Trave Multiuso Pro')]);
    expect(await ids(fetchStructureCatalog(fetchJson, { fresh: true }))).toEqual(['eq-trave']);
    expect(await ids(fetchStructureCatalog(fetchJson))).toEqual(['eq-trave']);
    expect(fetchJson).toHaveBeenCalledTimes(2);

    // Depois de 5 minutos, consulta de novo.
    fetchJson.mockResolvedValue([estrutura('eq-backdrop', 'Backdrop')]);
    agora.mockReturnValue(1_000_000 + 5 * 60 * 1000 - 1);
    expect(await ids(fetchStructureCatalog(fetchJson))).toEqual(['eq-trave']);
    agora.mockReturnValue(1_000_000 + 5 * 60 * 1000 + 1);
    expect(await ids(fetchStructureCatalog(fetchJson))).toEqual(['eq-backdrop']);
    expect(fetchJson).toHaveBeenCalledTimes(3);

    // A falha não fica guardada: a próxima chamada consulta de novo.
    const instavel = vi.fn().mockRejectedValueOnce(new Error('rede fora')).mockResolvedValue([estrutura('eq-tenda', 'Tenda Gazebo')]);
    expect(await fetchStructureCatalog(instavel)).toBeNull();
    expect(await ids(fetchStructureCatalog(instavel))).toEqual(['eq-tenda']);
    expect(instavel).toHaveBeenCalledTimes(2);
  });

  it('os textos dizem a diária e a dica da luz, sem promessa', () => {
    expect(STRUCTURE_PRICE_NOTE).toBe('Palco, traves, backdrop e tenda são cobrados por diária.');
    expect(STRUCTURE_LIGHTING_HINT).toBe('Luzes no alto (moving heads) precisam de trave ou totens.');
  });
});
