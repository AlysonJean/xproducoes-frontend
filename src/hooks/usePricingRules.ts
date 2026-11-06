import { useEffect, useState } from 'react';
import { apiFetch } from '@/services/api';
import type { EquipmentPriceUnit } from '@/utils/bookingPricing';

// Decisões do dono de 06/11 (P16): o equipamento avulso custa por hora ou por diária conforme a chave
// EQUIPMENT_PRICE_UNIT do servidor (o kit é sempre por evento). O site lê a unidade em
// GET /equipments/pricing-rules para estimar e rotular igual ao servidor. Enquanto carrega, ou se a
// consulta falhar, vale "hour", a regra de hoje e o padrão do servidor.
export function useEquipmentPriceUnit(): EquipmentPriceUnit {
  const [unit, setUnit] = useState<EquipmentPriceUnit>('hour');
  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => apiFetch<{ equipmentPriceUnit?: string }>('/equipments/pricing-rules'))
      .then((rules) => {
        if (alive && rules?.equipmentPriceUnit === 'day') setUnit('day');
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return unit;
}
