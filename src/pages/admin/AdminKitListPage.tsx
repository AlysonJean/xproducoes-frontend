import { useState, useEffect, useCallback, useMemo, type ChangeEvent } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  CheckCircle2,
  DollarSign,
  XCircle,
  Search,
  Database,
  Layers,
  RefreshCw,
  Star
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '../../services/api';
import { asArray } from '../../utils/normalize';
import { transformKit } from '../../utils/transformKit';
import { formatPrice, toNumber } from '../../utils/typeSafeFormatters';
import type { Kit } from '../../types/types';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { AdminLayout } from '../../components/admin/AdminLayout';
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
import KitForm from '../../components/forms/KitFormPage';
import { StatusSelect } from '../../components/admin/StatusSelect';
import { ItemStatus } from '../../types/types';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';

const PAGE_TITLE = 'Kits';
const BREADCRUMBS = [{ name: 'Admin', href: '/admin/painel' }, { name: 'Kits' }];

// Mesmas 4 opções (e rótulos) do StatusSelect da linha — antes o filtro só tinha Ativo/Inativo,
// e um kit em manutenção ou "em breve" não podia ser filtrado.
const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: ItemStatus.ACTIVE, label: 'Ativo' },
  { value: ItemStatus.INACTIVE, label: 'Inativo' },
  { value: ItemStatus.MAINTENANCE, label: 'Manutenção' },
  { value: ItemStatus.COMING_SOON, label: 'Em Breve' },
];

export const AdminKitListPage = () => {
  const { addNotification } = useNotifications();
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<Kit | null>(null);
  const [kitToDelete, setKitToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const { guardClose, isConfirmOpen, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard(isFormDirty);

  const fetchKits = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/kits');
      setKits(asArray<Kit>(data).map(transformKit));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os kits.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKits();
  }, [fetchKits]);

  const handleDeleteClick = (id: string) => {
    setKitToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!kitToDelete) return;

    try {
      setIsDeleting(true);
      await apiFetch(`/kits/${kitToDelete}`, {
        method: 'DELETE',
      });
      await fetchKits();
      addNotification({
        type: 'success',
        title: 'Kit excluído',
        message: 'O kit foi excluído.'
      });
      setIsDeleteModalOpen(false);
    } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Erro ao excluir',
        message: err instanceof Error ? err.message : 'Não foi possível excluir o kit.'
      });
    } finally {
      setIsDeleting(false);
      setKitToDelete(null);
    }
  };

  const handleStatusChange = async (kit: Kit, newStatus: ItemStatus) => {
    try {
      const formData = new FormData();
      formData.append('status', newStatus);

      await apiFetch(`/kits/${kit.id}`, {
        method: 'PUT',
        body: formData,
      });

      fetchKits();
      addNotification({
        type: 'success',
        title: 'Status atualizado',
        message: `Status de ${kit.name} atualizado.`
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
    setEditingKit(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (kit: Kit) => {
    setEditingKit(kit);
    setIsFormModalOpen(true);
  };

  const resetFilters = () => { setSearchTerm(''); setStatusFilter('all'); };

  const filteredKits = useMemo(() => {
    return kits.filter(k => {
        const matchesSearch = k.name.toLowerCase().includes(searchTerm.toLowerCase()) || (k.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || k.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
  }, [kits, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: kits.length,
    active: kits.filter(k => k.status === 'ACTIVE' || k.status === 'AVAILABLE').length,
    avgPrice: kits.length > 0
      ? kits.reduce((acc, curr) => acc + toNumber(curr.price), 0) / kits.length
      : 0
  }), [kits]);

  if (loading && kits.length === 0) {
    return (
      <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Carregando kits…" />
        </div>
      </AdminLayout>
    );
  }

  const loadFailed = !!error && kits.length === 0;

  return (
    <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">Kits e combos</h2>
                <Badge variant="primary">{stats.total} kits</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Pacotes de equipamentos oferecidos para locação.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
             <Button variant="outline" size="sm" onClick={fetchKits} className="gap-2">
               <RefreshCw className="h-4 w-4" /> Recarregar
             </Button>
             <Button size="sm" onClick={handleCreate} className="gap-2 shadow-lg shadow-primary/20">
               <Plus className="h-4 w-4" /> Novo kit
             </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <Grid columns={{ sm: 1, md: 3 }} gap={6}>
          <Card className="p-4 bg-primary/5 border-primary/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kits cadastrados</p>
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
                <p className="text-2xl font-bold text-foreground">{formatPrice(stats.avgPrice)}</p>
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
                aria-label="Buscar kit"
                placeholder="Buscar por nome ou descrição do kit..."
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
            title="Erro ao carregar os kits"
            action={<Button size="sm" variant="outline" onClick={fetchKits}>Tentar de novo</Button>}
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
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Kit</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Preço</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Itens</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-right text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredKits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                        <Database className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">Nenhum kit encontrado</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">Ajuste a busca ou os filtros para encontrar o que procura.</p>
                      <Button variant="outline" size="sm" className="mt-6" onClick={resetFilters}>
                        Limpar filtros
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredKits.map((kit) => (
                    <tr key={kit.id} className="hover:bg-muted/20 transition-colors group animate-in fade-in slide-in-from-left-4 duration-500">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-border flex items-center justify-center overflow-hidden flex-shrink-0 text-primary">
                              {kit.imageUrl ? (
                                <img src={kit.imageUrl} alt={kit.name} className="h-full w-full object-cover" />
                              ) : (
                                <Package className="h-6 w-6" />
                              )}
                            </div>
                            <div className={`absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card ${kit.status === 'ACTIVE' || kit.status === 'AVAILABLE' ? 'bg-success' : 'bg-muted-foreground'}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-foreground truncate">{kit.name}</p>
                                {kit.price && kit.price > 1000 && <Star size={12} className="text-warning fill-warning" aria-hidden="true" />}
                            </div>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">KIT-{kit.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-foreground">{formatPrice(kit.price || 0)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="ghost">
                          {(kit.items?.length || kit.equipments?.length) || 0} itens
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <StatusSelect
                          currentStatus={kit.status as ItemStatus || ItemStatus.ACTIVE}
                          onStatusChange={(newStatus) => handleStatusChange(kit, newStatus)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => handleEdit(kit)}
                            title="Editar kit"
                            aria-label={`Editar ${kit.name}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 border-destructive/40 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteClick(kit.id)}
                            title="Excluir kit"
                            aria-label={`Excluir ${kit.name}`}
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

          {/* Rodapé — antes trazia "Sincronização modular ativa com o núcleo de precificação" (texto fixo). */}
          <div className="px-6 py-4 bg-muted/10 border-t border-border">
             <p className="text-sm text-muted-foreground">
               Exibindo {filteredKits.length} de {kits.length} kits.
             </p>
          </div>
        </Card>
        )}
      </div>

      <Modal
        isOpen={isFormModalOpen}
        onClose={() => guardClose(() => setIsFormModalOpen(false))}
        title={editingKit ? 'Editar kit' : 'Novo kit'}
        size="xl"
      >
        <KitForm
          initialData={editingKit}
          onDirtyChange={setIsFormDirty}
          onSuccess={() => {
              setIsFormModalOpen(false);
              fetchKits();
              addNotification({
                type: 'success',
                title: 'Kit salvo',
                message: `O kit foi ${editingKit ? 'atualizado' : 'criado'}.`
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
        title="Excluir kit?"
        message="O kit e as regras de preço vinculadas deixam de valer para novas locações. O histórico de locações passadas é mantido."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Excluir"
        cancelText="Manter"
      />
    </AdminLayout>
  );
};

export default AdminKitListPage;
