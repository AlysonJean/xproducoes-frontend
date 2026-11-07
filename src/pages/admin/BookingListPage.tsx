import { useState, useEffect, useCallback, useMemo, type ChangeEvent } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '../../services/api';
import { fetchAllAdminBookings } from '../../services/adminBookings';
import { isWithinLocalDateRange } from '../../utils/dateRange';
import { downloadBookingsSpreadsheet } from '../../utils/bookingExport';
import { BOOKING_STATUS_OPTIONS, DELIVERY_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS } from '../../utils/bookingStatus';
import { logger } from '../../utils/logger';
import { formatPrice } from '../../utils/formatPrice';
import { normalizeString } from '../../utils/string';
import { bookingEmail } from '../../utils/bookingContact';
import { notifyClientPayload } from '../../utils/notifyClient';
import { NotifyClientCheckbox } from '../../components/bookings/NotifyClientCheckbox';
import { Link, useSearchParams } from 'react-router-dom';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  Button,
  buttonVariants,
  Input,
  Select,
  Modal,
  ConfirmModal,
  Card,
  Badge,
  Grid,
  Alert
} from '../../components/ui/StandardComponents';
import { AdminBookingForm as BookingForm } from '@/components/forms/AdminBookingForm';
import { HistoryImportModal } from '../../components/admin/HistoryImportModal';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import type { BookingListItem, BookingStatus } from '../../types/types';
import type { BookingPaymentStatus } from '../../types/enums';
import { 
  Search, 
  Plus, 
  FileText, 
  Calendar, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Edit2,
  Download,
  Filter,
  Zap,
  MessageSquare,
  Upload
} from 'lucide-react';

// Seletores da tabela: todos os valores que o backend aceita (fonte única em utils/bookingStatus). Com
// uma lista parcial, a reserva cujo valor não estava nela (rascunho, em andamento, entrega concluída —
// inclusive todo o histórico importado) aparecia como a primeira opção, "Pendente".
const STATUS_OPTIONS = BOOKING_STATUS_OPTIONS;
const DELIVERY_OPTIONS = DELIVERY_STATUS_OPTIONS;
// Filtro de status: só status da RESERVA (antes misturava "Em trânsito"/"No local", que são de entrega,
// e não tinha Rascunho, Em andamento nem Reembolsada).
const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'TODOS OS STATUS' },
  ...BOOKING_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label.toUpperCase() })),
];

const PAGE_TITLE = 'Gestão de Reservas';
const BREADCRUMBS = [{ name: 'Admin', href: '/admin/painel' }, { name: 'Reservas' }];

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
  // ?status=PENDING vem do cartão "pedidos aguardando resposta" do painel (P3): a lista já abre
  // filtrada. Valor fora das opções do filtro é ignorado.
  const [searchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState<string>(() => {
    const fromUrl = searchParams.get('status');
    return fromUrl && STATUS_FILTER_OPTIONS.some((o) => o.value === fromUrl) ? fromUrl : 'all';
  });
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<BookingListItem | null>(null);
  // Referência estável: o AdminBookingForm faz reset() quando initialData muda, e um objeto novo a
  // cada render (antes, inline no JSX) apagava o que a pessoa digitava na edição.
  const editInitialData = useMemo(
    () =>
      editingBooking
        ? {
            ...editingBooking,
            totalPrice: Number(editingBooking.totalPrice),
            status: editingBooking.status as BookingStatus,
            client: { name: editingBooking.client?.user?.name },
          }
        : null,
    [editingBooking]
  );
  const [initialClientType, setInitialClientType] = useState<'registered' | 'manual'>('registered');
  const [isFormDirty, setIsFormDirty] = useState(false);
  // D11: escolher "Confirmada" no status da linha abre a confirmação com "Avisar o cliente por e-mail".
  const [confirmingBooking, setConfirmingBooking] = useState<BookingListItem | null>(null);
  const [notifyClient, setNotifyClient] = useState(true);
  const { guardClose, isConfirmOpen, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard(isFormDirty);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      // Todas as páginas: a API pagina (padrão 20, as mais antigas) e esta tela filtra no navegador.
      setBookings(await fetchAllAdminBookings());
      setError(null);
        } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a lista de reservas.');
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
    value: string,
    extra?: { notifyClient?: false }
  ) => {
    try {
      const endpoint =
          field === 'status'
            ? `/admin/bookings/${bookingId}/status`
            : `/admin/bookings/${bookingId}/delivery-status`;

      await apiFetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: value, ...extra }),
      });

      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, [field]: value } : b))
      );
      
      addNotification({
        type: 'success',
        title: 'Atualizado',
        message: `${field === 'status' ? 'Status' : 'Entrega'} atualizado com sucesso.`
      });
        } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: err instanceof Error ? err.message : 'Erro ao atualizar o status.'
      });
    }
  };

  // D11 (aprovada em 02/11/2026): passar para Confirmada avisa o cliente, então a tela pergunta antes de gravar,
  // com "Avisar o cliente por e-mail" marcada. Devolver a Confirmada um evento em andamento ou concluído não
  // avisa ninguém (o servidor não repete a confirmação) e grava direto, como os outros status.
  const handleStatusSelect = (booking: BookingListItem, value: string) => {
    if (value === 'CONFIRMED' && !['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(booking.status)) {
      setNotifyClient(true);
      setConfirmingBooking(booking);
      return;
    }
    void handleStatusChange(booking.id, 'status', value);
  };

  // Situação do pagamento: PUT só com o campo (vazio = "não informado"). Não passa pelo formulário
  // de edição, que exige endereço, contato do cliente e valor do serviço — o histórico importado das
  // agendas não tem.
  const handlePaymentChange = async (bookingId: string, value: string) => {
    const paymentStatus = (value || null) as BookingPaymentStatus | null;
    try {
      await apiFetch(`/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus }),
      });

      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, paymentStatus } : b))
      );

      addNotification({
        type: 'success',
        title: 'Atualizado',
        message: 'Pagamento atualizado com sucesso.'
      });
    } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: err instanceof Error ? err.message : 'Erro ao atualizar o pagamento.'
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
      const clientName = normalizeString(booking.client?.user?.name || booking.clientName || '');
      const bookingId = normalizeString(booking.id || '');
      const matchesSearch = clientName.includes(q) || bookingId.includes(q);
      const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;
      const matchesPayment = filterPayment === 'all'
        || (filterPayment === 'NONE' ? !booking.paymentStatus : booking.paymentStatus === filterPayment);
      
      // Dias locais inteiros: new Date('AAAA-MM-DD') é meia-noite UTC (21h do dia anterior no Brasil).
      const matchesDate = !booking.eventDate || isWithinLocalDateRange(booking.eventDate, startDate, endDate);
      
      return matchesSearch && matchesStatus && matchesPayment && matchesDate;
    });
  }, [bookings, searchTerm, filterStatus, filterPayment, startDate, endDate]);

  // O botão "Exportar" existia sem ação. Exporta o que está filtrado na tela (período, status e
  // busca) — o período vira o recorte do fechamento mensal.
  const handleExport = async () => {
    if (filteredBookings.length === 0) {
      addNotification({ type: 'info', title: 'Nada para exportar', message: 'Nenhuma reserva com os filtros atuais.' });
      return;
    }
    setExporting(true);
    try {
      await downloadBookingsSpreadsheet(filteredBookings, { startDate, endDate });
    } catch (err) {
      logger.error('Erro ao exportar reservas', 'BookingListPage', err);
      addNotification({ type: 'error', title: 'Erro na exportação', message: 'Não foi possível gerar a planilha.' });
    } finally {
      setExporting(false);
    }
  };

  const stats = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'PENDING').length,
    confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
    completed: bookings.filter(b => b.status === 'COMPLETED').length,
  }), [bookings]);

  if (loading && bookings.length === 0) {
    return (
      <AdminLayout title={PAGE_TITLE}  breadcrumbs={BREADCRUMBS}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-700">
          <BrandLoader size="xl" label="Carregando reservas…" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={PAGE_TITLE}  breadcrumbs={BREADCRUMBS}>
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
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleExport}
              disabled={exporting}
              title="Exporta para planilha as reservas filtradas (período, status e busca)"
            >
              <Download className="h-4 w-4" /> {exporting ? 'Exportando...' : 'Exportar'}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsImportOpen(true)}
              title="Lança eventos antigos (agendas) a partir da planilha de revisão"
            >
              <Upload className="h-4 w-4" /> Importar histórico
            </Button>
            <Button onClick={handleCreateManual} variant="outline" className="gap-2 border-primary/20 hover:border-primary/40">
              <Plus className="h-4 w-4" /> Reserva Manual
            </Button>
            <Link to="/admin/orcamentos/novo" className={buttonVariants({ className: 'gap-2 shadow-lg shadow-primary/5' })}>
              <Zap className="h-4 w-4" /> Criar Proposta Rápida
            </Link>
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
          <Card className="p-4 bg-warning/5 border-warning/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pendentes</p>
                <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-success/5 border-success/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirmadas</p>
                <p className="text-2xl font-bold text-foreground">{stats.confirmed}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-info/5 border-info/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Concluídas</p>
                <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
              </div>
            </div>
          </Card>
        </Grid>

        {error && (
          <Alert variant="error" action={<Button variant="outline" size="sm" onClick={fetchBookings}>Tentar de novo</Button>}>
            {error}
          </Alert>
        )}

        {/* Filters and Search Bar */}
        <Card className="p-4 border-dashed border-2 bg-muted/20">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                leftIcon={<Search className="h-4 w-4" />}
                aria-label="Buscar reservas"
                placeholder="Buscar por cliente, empresa ou ID da reserva..."
                className="h-10 border-border bg-card"
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
                  className="bg-transparent border-none text-xs font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded w-28 outline-none"
                  aria-label="Data inicial"
                />
                <span className="text-xs font-medium text-muted-foreground px-1">até</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent border-none text-xs font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded w-28 outline-none"
                  aria-label="Data final"
                />
              </div>

              <div className="relative min-w-[200px]">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Select
                  value={filterStatus}
                                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value)}
                  className="pl-10 h-10 border-border bg-card rounded-xl text-xs font-semibold uppercase tracking-wider"
                  aria-label="Filtrar por status"
                  options={STATUS_FILTER_OPTIONS}
                />
              </div>

              <div className="relative min-w-[200px]">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Select
                  value={filterPayment}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterPayment(e.target.value)}
                  aria-label="Filtrar por pagamento"
                  className="pl-10 h-10 border-border bg-card rounded-xl text-xs font-semibold uppercase tracking-wider"
                  options={[
                    { value: 'all', label: 'TODOS OS PAGAMENTOS' },
                    { value: 'PAID', label: '💰 PAGO' },
                    { value: 'PARTIAL', label: '🌓 PARCIAL' },
                    { value: 'PENDING', label: '⏳ PAGAMENTO PENDENTE' },
                    { value: 'NONE', label: '❔ NÃO INFORMADO' },
                  ]}
                />
              </div>

              {(searchTerm || filterStatus !== 'all' || filterPayment !== 'all' || startDate || endDate) && (
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                    setFilterPayment('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="h-10 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
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
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status Reserva</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Pagamento</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Entrega</th>
                  <th className="px-6 py-4 text-xs font-bold text-right text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBookings.length === 0 && error && bookings.length === 0 ? (
                  // Falha ao carregar: o Alert acima já explica — não dizer "nenhuma reserva localizada".
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-muted-foreground">
                      Não foi possível carregar as reservas.
                    </td>
                  </tr>
                ) : filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                        <AlertCircle className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">Nenhuma reserva localizada</h3>
                      <p className="text-muted-foreground max-w-xs mx-auto">Tente ajustar seus filtros ou busca para encontrar o que procura.</p>
                      <Button variant="outline" className="mt-6" onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterPayment('all'); setStartDate(''); setEndDate(''); }}>
                        Limpar Filtros
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{booking.client?.user?.name || booking.clientName || 'Cliente Avulso'}</p>
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
                        <Badge variant="success" size="lg" className="font-bold">
                          {formatPrice(safeParsePrice(booking.totalPrice))}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          className="h-9 min-w-[130px] border-border text-xs"
                          value={booking.status}
                                                    onChange={(e: ChangeEvent<HTMLSelectElement>) => handleStatusSelect(booking, e.target.value)}
                          aria-label={`Status da reserva ${booking.id}`}
                          options={STATUS_OPTIONS}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          className="h-9 min-w-[130px] border-border text-xs"
                          value={booking.paymentStatus || ''}
                          onChange={(e: ChangeEvent<HTMLSelectElement>) => handlePaymentChange(booking.id, e.target.value)}
                          aria-label={`Pagamento da reserva ${booking.id}`}
                          options={PAYMENT_STATUS_OPTIONS}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          className="h-9 min-w-[150px] border-border text-xs"
                          value={booking.deliveryStatus || 'PENDING'}
                                                    onChange={(e: ChangeEvent<HTMLSelectElement>) => handleStatusChange(booking.id, 'deliveryStatus', e.target.value)}
                          aria-label={`Entrega da reserva ${booking.id}`}
                          options={DELIVERY_OPTIONS}
                        />
                      </td>
                      <td className="px-6 py-4">
                        {/* Visíveis no toque e no foco por teclado; só no desktop com mouse aparecem no hover. */}
                        <div className="flex justify-end gap-1.5 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <Link
                            to={`/admin/reservas/${booking.id}`}
                            className={buttonVariants({ variant: 'outline', size: 'icon', className: 'h-9 w-9' })}
                            title="Ver detalhes"
                            aria-label={`Ver detalhes da reserva ${booking.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {/* D11 (aprovada em 02/11/2026): este botão mandava pelo WhatsApp /proposta/<número da reserva>,
                              que exige login e dá para adivinhar. O envio agora é o "Enviar proposta" da página da
                              reserva (link seguro, e-mail e registro do envio); aqui fica o atalho para lá. */}
                          {(booking.status === 'DRAFT' || booking.status === 'PENDING') && (
                            <Link
                              to={`/admin/reservas/${booking.id}`}
                              className={buttonVariants({ variant: 'outline', size: 'icon', className: 'h-9 w-9 text-success border-success/30 hover:bg-success/10' })}
                              title="Enviar proposta (na página da reserva)"
                              aria-label={`Enviar proposta da reserva ${booking.id} (abre a página da reserva)`}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Link>
                          )}
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9"
                            onClick={() => handleEdit(booking)}
                            title="Editar reserva"
                            aria-label={`Editar reserva ${booking.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Rodapé: a lista inteira já vem carregada e filtrada no navegador — os botões
              "Anterior/Próxima" que ficavam aqui eram enfeite (sempre desabilitados). */}
          {filteredBookings.length > 0 && (
            <div className="px-6 py-4 bg-muted/10 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Mostrando {filteredBookings.length} de {bookings.length} registros encontrados.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Admin Booking Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => guardClose(handleCancel)}
        title={editingBooking ? 'Editar reserva' : (initialClientType === 'manual' ? 'Nova reserva manual' : 'Nova reserva')}
        size="full"
        className="max-h-[90vh] max-w-5xl"
      >
        <div className="min-w-0">
          <BookingForm
                        initialData={editInitialData}
            defaultClientType={initialClientType}
            onSuccess={handleSuccess}
            onDirtyChange={setIsFormDirty}
            onCancel={() => guardClose(handleCancel)}
          />
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!confirmingBooking}
        onClose={() => setConfirmingBooking(null)}
        onConfirm={() => {
          const target = confirmingBooking;
          setConfirmingBooking(null);
          if (target) void handleStatusChange(target.id, 'status', 'CONFIRMED', notifyClientPayload(notifyClient));
        }}
        title="Confirmar a reserva?"
        message="A reserva passa para Confirmada."
        variant="success"
        confirmText="Confirmar"
        cancelText="Cancelar"
      >
        {/* A lista traz o contato da reserva (clientEmail, contato e a conta do cliente). */}
        <NotifyClientCheckbox
          checked={notifyClient}
          onChange={setNotifyClient}
          hasEmail={confirmingBooking ? Boolean(bookingEmail(confirmingBooking)) : undefined}
        />
      </ConfirmModal>

      <HistoryImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={fetchBookings}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={cancelDiscard}
        onConfirm={confirmDiscard}
        title="Descartar alterações?"
        message="Você preencheu dados que ainda não foram salvos. Deseja descartar essas alterações?"
        variant="warning"
        confirmText="Descartar"
        cancelText="Continuar Editando"
      />
    </AdminLayout>
  );
};

export default BookingListPage;
