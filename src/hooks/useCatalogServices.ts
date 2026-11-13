import { useEffect, useState } from 'react';
import { apiFetch } from '@/services/api';
import type { Service } from '@/types/types';

// Auditoria do orçamento (12/11/2026), E1 e E5: a lista pública de serviços (GET /services, que o servidor guarda no cache
// público), numa consulta só, para o pedido de orçamento: a caixa do técnico (serviços que acompanham o evento todo), a
// caixa da montagem do equipamento avulso e o cadastro de agora dos serviços do carrinho. Vazia enquanto carrega ou se a
// consulta falhar: o pedido segue sem as caixas, como antes.
export function useCatalogServices(): Service[] {
  const [services, setServices] = useState<Service[]>([]);
  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => apiFetch<Service[]>('/services'))
      .then((list) => {
        if (alive) setServices(Array.isArray(list) ? list : []);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return services;
}
