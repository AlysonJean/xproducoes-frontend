/**
 * Itens e endereço de uma reserva na área do cliente ("Minhas Reservas", painel e agenda do cliente).
 *
 * Auditoria completa (19/11/2026): as telas liam `equipments[].equipment.name`, `kits[]` e `venue`, mas o
 * GET /bookings/user devolve os equipamentos já como objetos do catálogo (`equipments[].name`), o kit no campo `kit` e o
 * endereço nos campos da própria reserva (street, city...). Todo equipamento aparecia como "Equipamento", o kit nunca
 * aparecia (reserva só de kit dizia "Nenhum equipamento listado") e o endereço não saía. As duas formas são lidas aqui.
 */

interface NamedRef {
  name?: string | null;
}

interface BookingItemsSource {
  equipments?: Array<(NamedRef & { equipment?: NamedRef | null }) | null> | null;
  kit?: NamedRef | null;
  kits?: Array<{ kit?: NamedRef | null } | null> | null;
  street?: string | null;
  addressNumber?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  venue?: { street?: string | null; city?: string | null; state?: string | null; zipCode?: string | null } | null;
}

const clean = (value: string | null | undefined) => (typeof value === 'string' ? value.trim() : '');

/** Nomes dos equipamentos avulsos ("Equipamento" quando a API não manda o nome). */
export function bookingEquipmentNames(booking: BookingItemsSource): string[] {
  return (booking.equipments ?? [])
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => clean(item.name) || clean(item.equipment?.name) || 'Equipamento');
}

/** Nome do kit da reserva (uma reserva leva um kit só), vazio sem kit. */
export function bookingKitNames(booking: BookingItemsSource): string[] {
  const names = [clean(booking.kit?.name), ...(booking.kits ?? []).map((entry) => clean(entry?.kit?.name))].filter(Boolean);
  return [...new Set(names)];
}

/** Quantos itens a reserva leva (kit + equipamentos avulsos). */
export function bookingItemCount(booking: BookingItemsSource): number {
  return bookingEquipmentNames(booking).length + bookingKitNames(booking).length;
}

/** "Rua X, 10, Bairro, Cidade - UF, CEP 30000-000", só com o que a reserva tem. */
export function bookingAddressText(booking: BookingItemsSource): string {
  const street = clean(booking.street) || clean(booking.venue?.street);
  const number = clean(booking.addressNumber);
  const city = clean(booking.city) || clean(booking.venue?.city);
  const state = clean(booking.state) || clean(booking.venue?.state);
  const zip = clean(booking.zipCode) || clean(booking.venue?.zipCode);
  const cityState = [city, state].filter(Boolean).join(' - ');
  return [street && number ? `${street}, ${number}` : street, clean(booking.neighborhood), cityState, zip ? `CEP ${zip}` : '']
    .filter(Boolean)
    .join(', ');
}
