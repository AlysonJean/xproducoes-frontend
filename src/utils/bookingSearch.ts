import { searchText } from './string';

type SearchableBooking = {
  id?: string; clientName?: string | null; clientEmail?: string | null; clientContact?: string | null; location?: string | null;
  client?: { companyName?: string | null; phone?: string | null; user?: { name?: string | null; email?: string | null } | null } | null;
};

// Onda 4 da auditoria de 19/11 (F7admin2-11): a busca da lista de reservas do painel olha nome, empresa, e-mail, local e código;
// com 4 dígitos ou mais, também o telefone (antes só nome e código, embora o campo prometesse "empresa").
export function bookingMatchesSearch(booking: SearchableBooking, searchTerm: string): boolean {
  // A-14 (teste do painel de 25/11/2026): sem acento dos dois lados ("Joao" acha "João").
  const q = searchText(searchTerm.trim());
  if (!q) return true;
  const haystack = searchText([
    booking.client?.user?.name, booking.clientName, booking.client?.companyName, booking.client?.user?.email,
    booking.clientEmail, booking.location, booking.id,
  ].filter(Boolean).join(' '));
  if (haystack.includes(q)) return true;
  const digits = searchTerm.replace(/\D/g, '');
  return digits.length >= 4 && `${booking.clientContact || ''} ${booking.client?.phone || ''}`.replace(/\D/g, '').includes(digits);
}
