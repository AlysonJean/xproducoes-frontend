// Caminho: frontend/src/pages/admin/ClientEditPage.tsx

import { useState, useEffect } from 'react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import type { User } from '../../types/types';
import { useNotifications } from '@/contexts/NotificationContext';

import AdminLayout from '@/components/admin/AdminLayout';
import { asArray } from '../../utils/normalize';
import { bookingStatusLabel } from '../../utils/bookingStatus';
import { formatPrice } from '../../utils/formatPrice';
import { formatBrasiliaDate } from '../../utils/whatsapp';

// Onda 4 da auditoria de 19/11 (F7admin2-14): a ficha do cliente mostra as reservas dele e o total gasto (a mesma regra da tela de
// Clientes: confirmadas, em andamento e concluídas).
const SPENT_STATUSES = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];
interface ClientBookingRow { id: string; eventDate?: string; status?: string; totalPrice?: number | string | null; eventTitle?: string | null }

const PAGE_TITLE = 'Editar cliente';
const BREADCRUMBS = [
  { name: 'Admin', href: '/admin/painel' },
  { name: 'Clientes', href: '/admin/clientes' },
  { name: 'Editar' },
];

export const ClientEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  const [client, setClient] = useState<{ name: string; email: string; phone: string }>({
    name: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<ClientBookingRow[] | null>(null);
  const location = useLocation();
  // Depois de salvar, volta para onde a pessoa estava (a lista de Clientes quando a ficha foi aberta direto).
  const goBack = () => (location.key !== 'default' ? navigate(-1) : navigate('/admin/clientes'));

  useEffect(() => {
    if (!id) return;
    let active = true;
    apiFetch(`/admin/bookings?userId=${encodeURIComponent(id)}&limit=100`)
      .then((data) => { if (active) setBookings(asArray<ClientBookingRow>(data)); })
      .catch(() => { if (active) setBookings([]); });
    return () => { active = false; };
  }, [id]);
  const totalSpent = (bookings ?? []).filter((b) => SPENT_STATUSES.includes(String(b.status))).reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);

  useEffect(() => {
    if (!id) return;
    const fetchClient = async () => {
      try {
        setLoading(true);
        const clientData: User = await apiFetch(`/admin/clients/${id}`);
        setClient({
          name: clientData.name || '',
          email: clientData.email || '',
          phone: clientData.phone || '',
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Não foi possível carregar o cliente.');
      } finally {
        setLoading(false);
      }
    };
    fetchClient();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setClient((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!client.name || !client.email) {
      setError('Nome e e-mail são obrigatórios.');
      return;
    }
    try {
      await apiFetch(`/admin/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client),
      });
      addNotification({
        type: 'success',
        title: 'Sucesso',
        message: 'Dados do cliente atualizados com sucesso!'
      });
      setTimeout(goBack, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao atualizar os dados.';
      setError(msg);
      addNotification({
        type: 'error',
        title: 'Erro no salvamento',
        message: msg
      });
    }
  };

  // O loading ficava fora do AdminLayout — a tela perdia sidebar e título enquanto carregava.
  if (loading) {
    return (
      <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Carregando dados do cliente…" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
      <div className="w-full max-w-xl mx-auto bg-card p-8 rounded-2xl shadow-lg border border-border">
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="text"
            id="name"
            name="name"
            label="Nome"
            value={client.name}
            onChange={handleChange}
            required
          />
          <Input
            type="email"
            id="email"
            name="email"
            label="Email"
            value={client.email}
            onChange={handleChange}
            required
          />
          <Input
            type="tel"
            id="phone"
            name="phone"
            label="Telefone"
            value={client.phone}
            onChange={handleChange}
          />
          <div className="flex gap-4">
            <Button type="submit" variant="primary" size="md">
              Salvar Alterações
            </Button>
            <Button type="button" variant="outline" size="md" onClick={goBack}>
              Voltar
            </Button>
          </div>
        </form>
      </div>

      <section aria-labelledby="reservas-do-cliente" className="w-full max-w-xl mx-auto mt-6 bg-card p-8 rounded-2xl shadow-lg border border-border">
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h2 id="reservas-do-cliente" className="text-lg font-bold text-foreground">Reservas deste cliente</h2>
          {bookings && bookings.length > 0 && (
            <p className="text-sm text-muted-foreground">Total gasto: <strong className="text-foreground">{formatPrice(totalSpent)}</strong></p>
          )}
        </div>
        {bookings === null ? (
          <p className="text-sm text-muted-foreground">Carregando reservas…</p>
        ) : bookings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma reserva deste cliente.</p>
        ) : (
          <ul className="divide-y divide-border">
            {bookings.map((b) => (
              <li key={b.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/admin/reservas/${b.id}`} className="font-medium text-primary hover:underline break-all">{b.eventTitle || b.id}</Link>
                  <p className="text-xs text-muted-foreground">{formatBrasiliaDate(b.eventDate)} · {bookingStatusLabel(b.status)}</p>
                </div>
                <span className="text-sm font-semibold text-foreground shrink-0">{formatPrice(b.totalPrice)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminLayout>
  );
};
