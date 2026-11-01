import { useState, useEffect, useCallback, useMemo, type ChangeEvent } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Clock,
  Briefcase,
  DollarSign,
  XCircle,
  Search,
  Database,
  RefreshCw,
  Award,
  CheckCircle2,
  Star
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '../../services/api';
import { asArray } from '../../utils/normalize';
import type { Service } from '../../types/types';
import { formatMoney, toNumber } from '../../utils/typeSafeFormatters';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { BrandLoader } from '../../components/ui/BrandLoader';
import {
  Button,
  Card,
  Modal,
  ConfirmModal,
  Alert,
  Badge,
  Grid,
  Input,
  Select
} from '../../components/ui/StandardComponents';
import ServiceForm from '../../components/forms/ServiceFormPage';
import { StatusSelect } from '../../components/admin/StatusSelect';
import { ItemStatus } from '../../types/types';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';

const PAGE_TITLE = 'Serviços';
const BREADCRUMBS = [{ name: 'Admin', href: '/admin/painel' }, { name: 'Serviços' }];

// Mesmas 4 opções (e rótulos) do StatusSelect da linha — antes o filtro só tinha Ativo/Inativo.
const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: ItemStatus.ACTIVE, label: 'Ativo' },
  { value: ItemStatus.INACTIVE, label: 'Inativo' },
  { value: ItemStatus.MAINTENANCE, label: 'Manutenção' },
  { value: ItemStatus.COMING_SOON, label: 'Em Breve' },
];

// Duração em minutos → "1h30", "45 min", "2h".
const formatDuration = (minutes?: number) => {
  const total = Number(minutes) || 0;
  if (total <= 0) return '—';
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  if (h === 0) return `${m} min`;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
};

export const AdminServiceListPage = () => {
  const { addNotification } = useNotifications();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const { guardClose, isConfirmOpen, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard(isFormDirty);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/services');
      setServices(asArray<Service>(data));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os serviços.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleDeleteClick = (id: string) => {
    setServiceToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!serviceToDelete) return;

    try {
      setIsDeleting(true);
      await apiFetch(`/services/${serviceToDelete}`, { method: 'DELETE' });
      await fetchServices();
      addNotification({
        type: 'success',
        title: 'Serviço excluído',
        message: 'O serviço foi removido do catálogo.'
      });
      setIsDeleteModalOpen(false);
    } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Erro ao excluir',
        message: err instanceof Error ? err.message : 'Não foi possível excluir este serviço agora.'
      });
    } finally {
      setIsDeleting(false);
      setServiceToDelete(null);
    }
  };

  const handleStatusChange = async (service: Service, newStatus: ItemStatus) => {
    try {
      await apiFetch(`/services/${service.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
        headers: { 'Content-Type': 'application/json' }
      });

      fetchServices();
      addNotification({
        type: 'success',
        title: 'Status atualizado',
        message: `Status de ${service.name} atualizado.`
      });
    } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Erro ao atualizar status',
        message: err instanceof Error ? err.message : 'Não foi possível atualizar o status.'
      });
    }
  };

  const handleCreate = () => {
    setEditingService(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setIsFormModalOpen(true);
  };

  const resetFilters = () => { setSearchTerm(''); setStatusFilter('all'); };

  const filteredServices = useMemo(() => {
    return services.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
  }, [services, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: services.length,
    active: services.filter(s => s.status === 'ACTIVE').length,
    avgPrice: services.length > 0
      ? services.reduce((acc, curr) => acc + toNumber(curr.price), 0) / services.length
      : 0
  }), [services]);

  if (loading && services.length === 0) {
    return (
      <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Carregando serviços…" />
        </div>
      </AdminLayout>
    );
  }

  const loadFailed = !!error && services.length === 0;

  return (
    <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">Catálogo de serviços</h2>
                <Badge variant="primary">{stats.total} serviços</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Serviços oferecidos, com preço, duração e disponibilidade.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
             <Button variant="outline" size="sm" onClick={fetchServices} className="gap-2">
               <RefreshCw className="h-4 w-4" /> Recarregar
             </Button>
             <Button size="sm" onClick={handleCreate} className="gap-2 shadow-lg shadow-primary/20">
               <Plus className="h-4 w-4" /> Novo serviço
             </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <Grid columns={{ sm: 1, md: 3 }} gap={6}>
          <Card className="p-4 bg-primary/5 border-primary/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Serviços cadastrados</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-success/5 border-success/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ativos</p>
                <p className="text-2xl font-bold text-foreground">{stats.active}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-info/5 border-info/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Preço médio</p>
                <p className="text-2xl font-bold text-foreground">{formatMoney(stats.avgPrice)}</p>
              </div>
            </div>
          </Card>
        </Grid>

        {/* Filtros */}
        <Card className="p-4 border-dashed border-2 bg-muted/20">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Buscar serviço"
                placeholder="Buscar por nome ou descrição do serviço..."
                className="pl-10 h-10 bg-card"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-full sm:w-56">
                <Select
                  aria-label="Filtrar por status"
                  size="sm"
                  className="bg-card"
                  value={statusFilter}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                  options={STATUS_FILTER_OPTIONS}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={resetFilters}
                title="Limpar filtros"
                aria-label="Limpar filtros"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {error && (
          <Alert
            variant="error"
            title="Erro ao carregar os serviços"
            action={<Button size="sm" variant="outline" onClick={fetchServices}>Tentar de novo</Button>}
          >
            {error}
          </Alert>
        )}

        {/* Tabela */}
        {!loadFailed && (
        <Card className="overflow-hidden border-border shadow-sm animate-in fade-in duration-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Serviço</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Preço</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Duração</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-right text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                        <Database className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">Nenhum serviço encontrado</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">Ajuste a busca ou os filtros para encontrar o que procura.</p>
                      <Button variant="outline" size="sm" className="mt-6" onClick={resetFilters}>
                        Limpar filtros
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors group animate-in fade-in slide-in-from-left-4 duration-500">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-border flex items-center justify-center overflow-hidden flex-shrink-0 text-primary">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                              ) : (
                                <Briefcase className="h-6 w-6" />
                              )}
                            </div>
                            <div className={`absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card ${item.status === 'ACTIVE' || item.status === 'AVAILABLE' ? 'bg-success' : 'bg-muted-foreground'}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                                {item.price && item.price > 2000 && <Star size={12} className="text-warning fill-warning" aria-hidden="true" />}
                            </div>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">SRV-{item.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-foreground">{formatMoney(item.price || 0)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted border border-border text-sm font-medium text-foreground">
                            <Clock size={14} className="text-muted-foreground" aria-hidden="true" />
                            {formatDuration(item.duration)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusSelect
                          currentStatus={item.status as ItemStatus || ItemStatus.ACTIVE}
                          onStatusChange={(newStatus) => handleStatusChange(item, newStatus)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => handleEdit(item)}
                            title="Editar serviço"
                            aria-label={`Editar ${item.name}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 border-destructive/40 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteClick(item.id)}
                            title="Excluir serviço"
                            aria-label={`Excluir ${item.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Rodapé — antes: "Catálogo sincronizado com a matriz de precificação dinâmica" (texto fixo). */}
          <div className="px-6 py-4 bg-muted/10 border-t border-border">
             <p className="text-sm text-muted-foreground">
               Exibindo {filteredServices.length} de {services.length} serviços.
             </p>
          </div>
        </Card>
        )}
      </div>

      <Modal
        isOpen={isFormModalOpen}
        onClose={() => guardClose(() => setIsFormModalOpen(false))}
        title={editingService ? 'Editar serviço' : 'Novo serviço'}
        size="lg"
      >
        <ServiceForm
            initialData={editingService}
            onDirtyChange={setIsFormDirty}
            onSuccess={() => {
              setIsFormModalOpen(false);
              fetchServices();
              addNotification({
                type: 'success',
                title: 'Serviço salvo',
                message: `O serviço foi ${editingService ? 'atualizado' : 'criado'}.`
              });
            }}
            onCancel={() => guardClose(() => setIsFormModalOpen(false))}
        />
      </Modal>

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

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir serviço?"
        message="O serviço deixa de aparecer no catálogo para novos contratos. Os contratos anteriores não mudam."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Excluir"
        cancelText="Manter"
      />
    </AdminLayout>
  );
};

export default AdminServiceListPage;
