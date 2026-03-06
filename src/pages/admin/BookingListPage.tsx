import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '../../services/api';
import { asArray } from '../../utils/normalize';
import { formatPrice } from '../../utils/formatPrice';
import { normalizeString } from '../../utils/string';
import { Link } from 'react-router-dom';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { 
  Button, 
  Input, 
  Select, 
  Modal, 
  Card, 
  Badge,
  Grid,
  Alert
} from '../../components/ui/StandardComponents';
import { AdminBookingForm as BookingForm } from '@/components/forms/AdminBookingForm';
import type { BookingListItem } from '../../types/types';
import { 
  Search, 
  Plus, 
  FileText, 
  Calendar, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreHorizontal,
  Eye,
  Edit2,
  Download,
  Filter
} from 'lucide-react';

// Aux function for safe price parsing
const safeParsePrice = (value: string | number | undefined): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

export const BookingListPage = () => {
  const { addNotification } = useNotifications();
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<BookingListItem | null>(null);
  const [initialClientType, setInitialClientType] = useState<'registered' | 'manual'>('registered');

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/admin/bookings');
      setBookings(asArray(response));
      setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar a lista de reservas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCreate = () => {
    setEditingBooking(null);
    setInitialClientType('registered');
    setIsModalOpen(true);
  };

  const handleCreateManual = () => {
    setEditingBooking(null);
    setInitialClientType('manual');
    setIsModalOpen(true);
  };

  const handleEdit = (booking: BookingListItem) => {
    setEditingBooking(booking);
    setInitialClientType('registered');
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    setEditingBooking(null);
    fetchBookings();
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingBooking(null);
  };

  const handleStatusChange = async (
    bookingId: string,
    field: 'status' | 'deliveryStatus',
    value: string
  ) => {
    try {
      const endpoint =
          field === 'status'
            ? `/admin/bookings/${bookingId}/status`
            : `/admin/bookings/${bookingId}/delivery-status`;

      await apiFetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: value }),
      });

      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, [field]: value } : b))
      );
      
      addNotification({
        type: 'success',
        title: 'Atualizado',
        message: `${field === 'status' ? 'Status' : 'Entrega'} atualizado com sucesso.`
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: err?.message || 'Erro ao atualizar o status.'
      });
    }
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Inválida';
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      const q = normalizeString(searchTerm);
      const clientName = normalizeString(booking.client?.user?.name || (booking as any).clientName || '');
      const bookingId = normalizeString(booking.id || '');
      const matchesSearch = clientName.includes(q) || bookingId.includes(q);
      const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;
      
      let matchesDate = true;
      if (booking.eventDate) {
        const bDate = new Date(booking.eventDate).getTime();
        if (startDate) {
          matchesDate = matchesDate && bDate >= new Date(startDate).getTime();
        }
        if (endDate) {
          matchesDate = matchesDate && bDate <= new Date(endDate).getTime();
        }
      }
      
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [bookings, searchTerm, filterStatus, startDate, endDate]);

  const stats = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'PENDING').length,
    confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
    completed: bookings.filter(b => b.status === 'COMPLETED').length,
  }), [bookings]);

  if (loading && bookings.length === 0) {
    return (
      <AdminLayout title="Gestão de Reservas" breadcrumbs={[{ name: 'Admin' }, { name: 'Reservas' }]}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-700">
          <BrandLoader size="xl" />
          <p className="mt-8 text-muted-foreground font-medium tracking-widest uppercase text-[10px] animate-pulse">
            Carregando sua frota X Produções...
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestão de Reservas" breadcrumbs={[{ name: 'Admin' }, { name: 'Reservas' }]}>
      <div className="space-y-6">
        {/* Header and Quick Stats */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Reservas e Contratos</h2>
              <p className="text-sm text-muted-foreground">Gerencie o fluxo completo de locação de equipamentos.</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Exportar
            </Button>
            <Button onClick={handleCreateManual} variant="outline" className="gap-2 border-primary/20 hover:border-primary/40">
              <Plus className="h-4 w-4" /> Reserva Manual
            </Button>
            <Button onClick={handleCreate} className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5" /> Nova Reserva
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <Grid columns={{ sm: 2, md: 4 }} gap={6}>
          <Card className="p-4 bg-primary/5 border-primary/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-amber-500/5 border-amber-500/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pendentes</p>
                <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-emerald-500/5 border-emerald-500/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirmadas</p>
                <p className="text-2xl font-bold text-foreground">{stats.confirmed}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-blue-500/5 border-blue-500/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Concluídas</p>
                <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
              </div>
            </div>
          </Card>
        </Grid>

        {error && (
          <Alert variant="error" action={<Button variant="outline" size="sm" onClick={() => window.location.reload()}>Recarregar</Button>}>
            {error}
          </Alert>
        )}

        {/* Filters and Search Bar */}
        <Card className="p-4 border-dashed border-2 bg-muted/20">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, empresa ou ID da reserva..."
                className="pl-10 h-10 border-border bg-card"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 h-10">
                <Calendar size={14} className="text-muted-foreground" />
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 w-24 outline-none"
                  aria-label="Data inicial"
                />
                <span className="text-[10px] font-black text-muted-foreground opacity-30 px-1">ATÉ</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 w-24 outline-none"
                  aria-label="Data final"
                />
              </div>

              <div className="relative min-w-[200px]">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Select
                  value={filterStatus}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={(e: any) => setFilterStatus(e.target.value)}
                  className="pl-10 h-10 border-border bg-card rounded-xl text-[10px] font-black uppercase tracking-widest"
                  options={[
                    { value: 'all', label: 'TODOS OS STATUS' },
                    { value: 'PENDING', label: '📌 PENDENTE' },
                    { value: 'CONFIRMED', label: '✅ CONFIRMADO' },
                    { value: 'ON_THE_WAY', label: '🚚 EM TRÂNSITO' },
                    { value: 'ARRIVED', label: '📍 NO LOCAL' },
                    { value: 'COMPLETED', label: '🏁 CONCLUÍDO' },
                    { value: 'CANCELLED', label: '❌ CANCELADO' },
                  ]}
                />
              </div>

              {(searchTerm || filterStatus !== 'all' || startDate || endDate) && (
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="h-10 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  <AlertCircle size={14} className="mr-2" /> Limpar
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Bookings Table */}
        <Card className="overflow-hidden border-border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Cliente / ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Evento</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Investimento</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status Reserva</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Entrega</th>
                  <th className="px-6 py-4 text-xs font-bold text-right text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4 opacity-50">
                        <AlertCircle className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">Nenhuma reserva localizada</h3>
                      <p className="text-muted-foreground max-w-xs mx-auto">Tente ajustar seus filtros ou busca para encontrar o que procura.</p>
                      <Button variant="outline" className="mt-6" onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}>
                        Limpar Filtros
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{booking.client?.user?.name || 'Cliente Avulso'}</p>
                          <p className="text-xs font-mono text-muted-foreground flex items-center gap-1.5 pt-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
                            {booking.id?.startsWith('XP-') ? booking.id : (booking.id ? `#${booking.id.slice(0, 8)}` : 'S/ID')}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">{formatDate(booking.eventDate)}</span>
                          <span className="text-xs text-muted-foreground">{booking.location || 'Local não informado'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-sm font-bold border-emerald-500/20 text-emerald-600 bg-emerald-500/5">
                          {formatPrice(safeParsePrice(booking.totalPrice))}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          className="h-9 min-w-[130px] border-border text-xs"
                          value={booking.status}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          onChange={(e: any) => handleStatusChange(booking.id, 'status', e.target.value)}
                          options={[
                            { value: 'PENDING', label: 'Pendente' },
                            { value: 'CONFIRMED', label: 'Confirmada' },
                            { value: 'COMPLETED', label: 'Concluída' },
                            { value: 'CANCELLED', label: 'Cancelada' },
                          ]}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          className="h-9 min-w-[150px] border-border text-xs"
                          value={booking.deliveryStatus || 'PENDING'}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          onChange={(e: any) => handleStatusChange(booking.id, 'deliveryStatus', e.target.value)}
                          options={[
                            { value: 'PENDING', label: 'Pendente' },
                            { value: 'ON_THE_WAY', label: 'A caminho' },
                            { value: 'ARRIVED', label: 'No local' },
                            { value: 'SETUP_COMPLETE', label: 'Montado' },
                          ]}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/admin/reservas/${booking.id}`}>
                            <Button variant="outline" size="icon" className="h-8 w-8" title="Ver Detalhes">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => handleEdit(booking)} 
                            title="Editar Reserva"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8 text-muted-foreground/50 hover:text-foreground">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer / Pagination Placeholder */}
          {filteredBookings.length > 0 && (
            <div className="px-6 py-4 bg-muted/10 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-xs text-muted-foreground italic font-medium">
                Mostrando {filteredBookings.length} de {bookings.length} registros encontrados.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled className="h-8 text-xs">Anterior</Button>
                <Button variant="outline" size="sm" disabled className="h-8 text-xs">Próxima</Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Admin Booking Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCancel}
        title={editingBooking ? 'Ficha de Edição de Reserva' : (initialClientType === 'manual' ? 'Lançamento de Reserva Manual' : 'Abertura de Nova Reserva')}
        size="full"
        className="max-h-[90vh] max-w-5xl"
      >
        <div className="min-w-0">
          <BookingForm
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialData={editingBooking ? { ...editingBooking, totalPrice: Number(editingBooking.totalPrice) } as any : editingBooking}
            defaultClientType={initialClientType}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </Modal>
    </AdminLayout>
  );
};

export default BookingListPage;
