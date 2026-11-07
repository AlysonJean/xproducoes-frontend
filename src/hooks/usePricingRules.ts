import { useEffect, useState } from 'react';
import { apiFetch } from '@/services/api';
import { priceUnitOf, type EquipmentPriceUnit } from '@/utils/bookingPricing';

// Decisões do dono de 06/11 (P16): o equipamento avulso custa por hora ou por diária conforme a chave
// EQUIPMENT_PRICE_UNIT do servidor (o kit é sempre por evento). O site lê a unidade em
// GET /equipments/pricing-rules para estimar e rotular igual ao servidor. Enquanto carrega, ou se a
// consulta falhar, vale "hour", a regra de hoje e o padrão do servidor.
// Diária nas telas (lote 13, decisão do dono de 06/11 de virar a chave para "day"): várias telas e cartões
// usam este hook ao mesmo tempo, então os que montam juntos dividem uma consulta só, e a última resposta vale
// de partida para a próxima tela (sem "/ hora" piscando antes de "/ diária" a cada troca de página). No
// servidor (SSR) os efeitos não rodam e a partida é sempre "hour", a mesma da primeira pintura do navegador:
// a hidratação não diverge.
let lastUnit: EquipmentPriceUnit | null = null;
let pending: Promise<EquipmentPriceUnit> | null = null;

function loadEquipmentPriceUnit(): Promise<EquipmentPriceUnit> {
  if (!pending) {
    pending = Promise.resolve()
      .then(() => apiFetch<{ equipmentPriceUnit?: string }>('/equipments/pricing-rules'))
      .then((rules): EquipmentPriceUnit => (rules?.equipmentPriceUnit === 'day' ? 'day' : 'hour'))
      .then((unit) => {
        lastUnit = unit;
        return unit;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

/** A unidade da chave do servidor. Com `enabled` false não consulta (a tela já tem a unidade pelos dados). */
export function useEquipmentPriceUnit(enabled = true): EquipmentPriceUnit {
  const [unit, setUnit] = useState<EquipmentPriceUnit>(() => lastUnit ?? 'hour');
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    loadEquipmentPriceUnit()
      .then((next) => {
        if (alive) setUnit(next);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [enabled]);
  return unit;
}

/**
 * Unidade do preço de um equipamento que veio da API: o priceUnit que o servidor põe em cada equipamento
 * público. Ele chega junto com o preço, então a primeira pintura com o preço já diz "/ diária", sem esperar
 * outra consulta. Sem o campo (carrinho da conta, versão anterior da API), vale a chave do servidor. `ready`
 * false espera os dados chegarem antes de consultar.
 */
export function useEquipmentUnitOf(item: unknown, ready = true): EquipmentPriceUnit {
  const own = priceUnitOf(item);
  const fallback = useEquipmentPriceUnit(ready && own === null);
  // O priceUnit é a chave do servidor lida na resposta: vale de partida para as telas seguintes que leem a
  // chave (carrinho, comparação, orçamento), sem "/ hora" piscando antes de "/ diária" para quem vem do
  // catálogo, onde a chave nunca é consultada. Num efeito: no servidor (SSR) nada fica guardado entre pedidos.
  useEffect(() => {
    if (own) lastUnit = own;
  }, [own]);
  return own ?? fallback;
}
