import { useEffect, useState } from 'react';
import { apiFetch } from '@/services/api';
import type { Service } from '@/types/types';
import { isWholeEventService } from '@/utils/wholeEventService';

// Lote 13, técnico durante o evento (decisão do dono de 06/11/2026): os serviços da caixa "Quero um técnico durante
// todo o evento" do pedido, tirados da lista pública de serviços (GET /services, que o servidor guarda no cache
// público): só os marcados "Pode acompanhar o evento todo" e ativos. Vazio enquanto carrega ou se a consulta falhar:
// o pedido segue sem a caixa, como antes.
export function useWholeEventServices(): Service[] {
  const [services, setServices] = useState<Service[]>([]);
  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => apiFetch<Service[]>('/services'))
      .then((list) => {
        if (alive) setServices(Array.isArray(list) ? list.filter(isWholeEventService) : []);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return services;
}
