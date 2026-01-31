import { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { asArray } from '../../utils/normalize';
import { formatPrice } from '../../utils/formatPrice';
import { normalizeString } from '../../utils/string';
import { Link } from 'react-router-dom';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/StandardComponents';
import { SimpleCard, StatsCard } from '@/components/ui/Cards';
import type { BookingListItem } from '../../types/types';

// Função auxiliar para parsing seguro de preços
const safeParsePrice = (value: string | undefined): number => {
  if (!value || typeof value !== 'string') return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

export const BookingListPage = () => {
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
  const response = await apiFetch('/admin/bookings');
  // Garante que bookings seja sempre um array
  setBookings(asArray(response));
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Não foi possível carregar a lista de reservas.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const handleStatusChange = async (
    bookingId: string,
    field: 'status' | 'deliveryStatus',
    value: string
  ) => {
    try {
      const endpoint =
          field === 'status'
            ? `/api/admin/bookings/${bookingId}/status`
            : `/api/admin/bookings/${bookingId}/delivery-status`;

  const requestBody = { status: value };

      await apiFetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      setBookings((prevBookings) =>
        prevBookings.map((b) => (b.id === bookingId ? { ...b, [field]: value } : b))
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Erro ao atualizar o status: ${err.message}`);
      } else {
        alert('Ocorreu um erro desconhecido ao atualizar o status.');
      }
    }
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Data inválida';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data inválida';
      
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch (error) {
      return 'Data inválida';
    }
  };

  // Filter bookings based on search term and status
  const filteredBookings = (Array.isArray(bookings) ? bookings : []).filter(booking => {
    const q = normalizeString(searchTerm);
    const matchesSearch = normalizeString(booking.client?.user?.name).includes(q) || 
                         normalizeString(booking.id).includes(q);
    const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <AdminLayout title="Gestão de Reservas" breadcrumbs={[{ name: 'Admin' }, { name: 'Reservas' }]}>
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner label="A carregar reservas..." />
        </div>
      </AdminLayout>
    );
  }
  
  if (error) {
    return (
      <AdminLayout title="Gestão de Reservas" breadcrumbs={[{ name: 'Admin' }, { name: 'Reservas' }]}>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <div className="text-xl font-semibold text-destructive mb-2">Erro ao carregar reservas</div>
            <div className="text-muted-foreground">{error}</div>
            <Button 
              onClick={() => window.location.reload()} 
              variant="primary"
              className="mt-4"
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestão de Reservas" breadcrumbs={[{ name: 'Admin' }, { name: 'Reservas' }]}>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatsCard title="Total de Reservas" value={bookings.length} />
          <StatsCard title="Pendentes" value={bookings.filter(b => b?.status === 'PENDING').length} />
          <StatsCard title="Confirmadas" value={bookings.filter(b => b?.status === 'CONFIRMED').length} />
          <StatsCard title="Concluídas" value={bookings.filter(b => b?.status === 'COMPLETED').length} />
        </div>

        {/* Filters and Search */}
        <SimpleCard>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Buscar por cliente ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar reservas"
                className="w-full sm:w-64 pr-10"
              />
              <div className="pointer-events-none absolute right-3 top-2.5 text-muted-foreground">
                🔍
              </div>
            </div>
            
            <Select
              value={filterStatus}
              onChange={(e: any) => setFilterStatus(e.target.value)}
              aria-label="Filtrar por status"
              options={[
                { value: 'all', label: 'Todos os status' },
                { value: 'PENDING', label: 'Pendentes' },
                { value: 'CONFIRMED', label: 'Confirmadas' },
                { value: 'COMPLETED', label: 'Concluídas' },
                { value: 'CANCELLED', label: 'Canceladas' },
              ]}
            />
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline">📊 Exportar</Button>
              <Link to="/admin/reservas/nova">
                <Button variant="primary">➕ Nova Reserva</Button>
              </Link>
            </div>
          </div>
        </SimpleCard>

  {/* Table */}
  <SimpleCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Cliente</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Data do Evento</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Total</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Entrega</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8">
                      <div className="text-muted-foreground">
                        {searchTerm || filterStatus !== 'all' 
                          ? 'Nenhuma reserva encontrada com os filtros aplicados' 
                          : 'Nenhuma reserva encontrada'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-4">
                        <div>
                          <div className="font-medium text-foreground">
                            {booking.client?.user?.name || 'N/A'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ID: {booking.id ? booking.id.slice(0, 8) : 'N/A'}...
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-foreground">{formatDate(booking.eventDate)}</td>
                      <td className="p-4">
                        <span className="font-semibold text-foreground">
                          {formatPrice(safeParsePrice(booking.totalPrice))}
                        </span>
                      </td>
                      <td className="p-4">
                        <Select
                          aria-label="Status da reserva"
                          value={booking.status}
                          onChange={(e: any) => handleStatusChange(booking.id, 'status', e.target.value)}
                          options={[
                            { value: 'PENDING', label: 'Pendente' },
                            { value: 'CONFIRMED', label: 'Confirmada' },
                            { value: 'COMPLETED', label: 'Concluída' },
                            { value: 'CANCELLED', label: 'Cancelada' },
                          ]}
                        />
                      </td>
                      <td className="p-4">
                        <Select
                          aria-label="Status de entrega"
                          value={booking.deliveryStatus || 'PENDING'}
                          onChange={(e: any) => handleStatusChange(booking.id, 'deliveryStatus', e.target.value)}
                          options={[
                            { value: 'PENDING', label: 'Pendente' },
                            { value: 'ON_THE_WAY', label: 'A caminho' },
                            { value: 'ARRIVED', label: 'Chegou' },
                            { value: 'SETUP_COMPLETE', label: 'Montagem concluída' },
                          ]}
                        />
                      </td>
                      <td className="p-4">
                        <Link to={`/admin/reservas/${booking.id}`}>
                          <Button variant="outline" size="sm">Ver Detalhes</Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SimpleCard>

        {/* Pagination (placeholder) */}
        {filteredBookings.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {filteredBookings.length} de {bookings.length} reservas
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                ← Anterior
              </Button>
              <Button variant="outline" size="sm" disabled>
                Próximo →
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
