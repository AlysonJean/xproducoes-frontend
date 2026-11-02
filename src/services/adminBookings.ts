import { apiFetch } from './api';
import { asArray } from '../utils/normalize';
import type { BookingListItem } from '../types/types';

// GET /admin/bookings pagina no banco (padrão 20, máximo 100 por página, em ordem crescente de
// data do evento), e o apiFetch descarta o `meta` do envelope. A tela de Reservas chamava sem
// parâmetros e só via as 20 reservas MAIS ANTIGAS. Busca de 100 em 100 até vir uma página
// incompleta (sem precisar do total).
const PAGE_SIZE = 100;
const MAX_PAGES = 100; // trava de segurança: 10 mil reservas

export async function fetchAllAdminBookings(): Promise<BookingListItem[]> {
  const all: BookingListItem[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const batch = asArray<BookingListItem>(await apiFetch(`/admin/bookings?page=${page}&limit=${PAGE_SIZE}`));
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return all;
}

// Achado (auditoria ponta a ponta): "Próximos eventos" do painel baixava todas as páginas acima para
// mostrar 5. GET /admin/bookings já filtra pela data do evento (startDate), ordena do mais próximo ao
// mais distante e limita a quantidade (limit): uma chamada basta. "A partir de hoje" é a meia-noite no
// fuso do navegador, como no filtro que a tela fazia; sem filtro de status, como antes.
export async function fetchUpcomingAdminBookings(limit: number): Promise<BookingListItem[]> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const params = new URLSearchParams({ startDate: startOfToday.toISOString(), limit: String(limit) });
  return asArray<BookingListItem>(await apiFetch(`/admin/bookings?${params.toString()}`));
}
