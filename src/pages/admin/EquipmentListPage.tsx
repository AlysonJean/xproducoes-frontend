import { useState, useEffect, useCallback, useMemo, type ChangeEvent } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Camera,
  Search,
  Package,
  AlertCircle,
  XCircle,
  Database,
  Cpu,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '../../services/api';
import { asArray } from '../../utils/normalize';
import type { Equipment } from '../../types/types';
import { formatMoney } from '../../utils/typeSafeFormatters';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  Button,
  Card,
  Modal,
  ConfirmModal,
  Input,
  Badge,
  Grid,
  Select,
  Checkbox,
  Alert
} from '@/components/ui/StandardComponents';
import EquipmentForm from '../../components/forms/EquipmentFormPage';
import { StatusSelect } from '../../components/admin/StatusSelect';
import { ItemStatus } from '../../types/types';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';

const PAGE_TITLE = 'Equipamentos';
const BREADCRUMBS = [{ name: 'Admin', href: '/admin/painel' }, { name: 'Equipamentos' }];

// Mesmas 4 opções (e rótulos) do StatusSelect da linha, no filtro e na ação em lote — antes o
// filtro não tinha "Em Breve" e o select em lote era um <select> nativo com outra lista.
const ITEM_STATUS_OPTIONS = [
  { value: ItemStatus.ACTIVE, label: 'Ativo' },
  { value: ItemStatus.INACTIVE, label: 'Inativo' },
  { value: ItemStatus.MAINTENANCE, label: 'Manutenção' },
  { value: ItemStatus.COMING_SOON, label: 'Em Breve' },
];
const STATUS_FILTER_OPTIONS = [{ value: 'all', label: 'Todos os status' }, ...ITEM_STATUS_OPTIONS];

export const EquipmentListPage = () => {
  const { addNotification } = useNotifications();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Ação em lote: mesmo status para vários equipamentos (PATCH /equipments/bulk-status)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ItemStatus>(ItemStatus.MAINTENANCE);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [equipmentToDelete, setEquipmentToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const { guardClose, isConfirmOpen, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard(isFormDirty);

  const fetchEquipments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/equipments');
      setEquipments(asArray<Equipment>(data));
      setLoadError(null);
    } catch (err: unknown) {
      // Antes só um toast — e a tabela dizia "Terminal Vazio", como se não houvesse equipamentos.
      setLoadError(err instanceof Error ? err.message : 'Não foi possível carregar os equipamentos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipments();
  }, [fetchEquipments]);

  const handleDeleteClick = (id: string) => {
    setEquipmentToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!equipmentToDelete) return;

    try {
      setIsDeleting(true);
      await apiFetch(`/equipments/${equipmentToDelete}`, { method: 'DELETE' });

      fetchEquipments();
      addNotification({
        type: 'success',
        title: 'Equipamento excluído',
        message: 'O equipamento foi removido do inventário.'
      });
      setIsDeleteModalOpen(false);
    } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Erro ao excluir',
        message: err instanceof Error ? err.message : 'Não foi possível excluir o equipamento.'
      });
    } finally {
      setIsDeleting(false);
      setEquipmentToDelete(null);
    }
  };

  const handleStatusChange = async (equipment: Equipment, newStatus: ItemStatus) => {
    try {
      const formData = new FormData();
      formData.append('status', newStatus);

      await apiFetch(`/equipments/${equipment.id}`, {
        method: 'PUT',
        body: formData
      });

      fetchEquipments();
      addNotification({
        type: 'success',
        title: 'Status atualizado',
        message: `Status de ${equipment.name} atualizado.`
      });
    } catch {
      addNotification({
        type: 'error',
        title: 'Erro ao atualizar status',
        message: 'Não foi possível atualizar o status. Tente de novo.'
      });
    }
  };

  const handleCreate = () => {
    setEditingEquipment(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setIsFormModalOpen(true);
  };

  const resetFilters = () => { setSearchTerm(''); setCategoryFilter('all'); setStatusFilter('all'); };

  const categories = useMemo(() => {
    const cats = new Set<string>();
    equipments.forEach(e => {
                const cat = typeof e.category === 'string' ? e.category : e.category?.name;
        if (cat) cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [equipments]);

  const filteredEquipments = useMemo(() => {
    return equipments.filter(e => {
                const cat = typeof e.category === 'string' ? e.category : e.category?.name || '';
        const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || cat.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || cat === categoryFilter;
        const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [equipments, searchTerm, categoryFilter, statusFilter]);

  // Filtro mudou: limpa a seleção, para a ação em lote nunca atingir item que saiu da tela.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchTerm, categoryFilter, statusFilter]);

  const allFilteredSelected = filteredEquipments.length > 0 && filteredEquipments.every((e) => selectedIds.has(e.id));

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds(allFilteredSelected ? new Set() : new Set(filteredEquipments.map((e) => e.id)));
  };

  const handleBulkStatus = async () => {
    if (selectedIds.size === 0) return;
    setBulkSaving(true);
    try {
      const result = await apiFetch<{ updated: number }>('/equipments/bulk-status', {
        method: 'PATCH',
        body: JSON.stringify({ ids: [...selectedIds], status: bulkStatus }),
      });
      addNotification({
        type: 'success',
        title: 'Status atualizado',
        message: `${result?.updated ?? selectedIds.size} equipamento(s) atualizado(s).`,
      });
      setSelectedIds(new Set());
      fetchEquipments();
    } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Falha na ação em lote',
        message: err instanceof Error ? err.message : 'Não foi possível alterar o status dos equipamentos.',
      });
    } finally {
      setBulkSaving(false);
    }
  };

  // O card "Poder de Alocação" (preço/hora × 10, "valuation arbitrária") foi removido: não era dado real.
  const stats = useMemo(() => ({
    total: equipments.length,
    active: equipments.filter(e => e.status === 'ACTIVE' || e.status === 'AVAILABLE').length,
    maintenance: equipments.filter(e => e.status === 'MAINTENANCE').length,
  }), [equipments]);

  if (loading && equipments.length === 0) {
    return (
      <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Carregando equipamentos…" />
        </div>
      </AdminLayout>
    );
  }

  const loadFailed = !!loadError && equipments.length === 0;

  return (
    <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Cpu className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">Inventário de equipamentos</h2>
                <Badge variant="outline">{stats.total} unidades</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Cadastro, preço por hora e status de manutenção.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
             <Button variant="outline" size="sm" onClick={fetchEquipments} className="gap-2">
               <RefreshCw className="h-4 w-4" /> Recarregar
             </Button>
             <Button size="sm" onClick={handleCreate} className="gap-2 shadow-lg shadow-primary/20">
               <Plus className="h-4 w-4" /> Novo equipamento
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</p>
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Disponíveis</p>
                <p className="text-2xl font-bold text-foreground">{stats.active}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-warning/5 border-warning/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Em manutenção</p>
                <p className="text-2xl font-bold text-foreground">{stats.maintenance}</p>
              </div>
            </div>
          </Card>
        </Grid>

        {loadError && (
          <Alert
            variant="error"
            title="Erro ao carregar os equipamentos"
            action={<Button size="sm" variant="outline" onClick={fetchEquipments}>Tentar de novo</Button>}
          >
            {loadError}
          </Alert>
        )}

        {/* Filtros */}
        <Card className="p-4 border-dashed border-2 bg-muted/20">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Buscar equipamento"
                placeholder="Buscar por nome ou categoria..."
                className="pl-10 h-10 bg-card"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="w-full sm:w-48">
                <Select
                  aria-label="Filtrar por categoria"
                  size="sm"
                  className="bg-card"
                  value={categoryFilter}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategoryFilter(e.target.value)}
                  options={[
                      { value: 'all', label: 'Todas as categorias' },
                      ...categories.map(c => ({ value: c, label: c }))
                  ]}
                />
              </div>
              <div className="w-full sm:w-44">
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
                className="shrink-0 self-end sm:self-auto"
                onClick={resetFilters}
                title="Limpar filtros"
                aria-label="Limpar filtros"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {selectedIds.size > 0 && (
          <section
            aria-label="Ações em lote"
            className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3"
          >
            <span className="text-sm font-semibold text-foreground">{selectedIds.size} selecionado(s)</span>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span aria-hidden="true">Alterar status para</span>
              <div className="w-40">
                <Select
                  aria-label="Novo status"
                  size="xs"
                  value={bulkStatus}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setBulkStatus(e.target.value as ItemStatus)}
                  options={ITEM_STATUS_OPTIONS}
                />
              </div>
            </div>
            <Button size="sm" onClick={handleBulkStatus} disabled={bulkSaving}>
              {bulkSaving ? 'Aplicando...' : 'Aplicar'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} disabled={bulkSaving}>
              Limpar seleção
            </Button>
          </section>
        )}

        {/* Tabela */}
        {!loadFailed && (
        <Card className="overflow-hidden border-border shadow-sm animate-in fade-in duration-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="pl-6 py-4 w-10">
                    <Checkbox
                      aria-label="Selecionar todos os equipamentos filtrados"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                      disabled={filteredEquipments.length === 0}
                    />
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Equipamento</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Preço/hora</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-right text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEquipments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                        <Database className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">Nenhum equipamento encontrado</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">Ajuste a busca ou os filtros para encontrar o que procura.</p>
                      <Button variant="outline" size="sm" className="mt-6" onClick={resetFilters}>
                        Limpar filtros
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredEquipments.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors group animate-in fade-in slide-in-from-left-4 duration-500">
                      <td className="pl-6 py-4 w-10">
                        <Checkbox
                          aria-label={`Selecionar ${item.name}`}
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelected(item.id)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                              ) : (
                                <Camera className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            <div className={`absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card ${item.status === 'ACTIVE' || item.status === 'AVAILABLE' ? 'bg-success' : item.status === 'MAINTENANCE' ? 'bg-warning' : 'bg-muted-foreground'}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {item.id.slice(0, 12)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="primary">
                          {typeof item.category === 'string' ? item.category : item.category?.name || 'Sem categoria'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-foreground">{formatMoney(item.pricePerHour || 0)}</span>
                        <span className="text-xs text-muted-foreground">/h</span>
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
                            title="Editar equipamento"
                            aria-label={`Editar ${item.name}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 border-destructive/40 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteClick(item.id)}
                            title="Excluir equipamento"
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

          {/* Rodapé — antes: "Registro sincronizado com núcleo de operações em tempo real" (texto fixo). */}
          <div className="px-6 py-4 bg-muted/10 border-t border-border">
             <p className="text-sm text-muted-foreground">
               Exibindo {filteredEquipments.length} de {equipments.length} equipamentos.
             </p>
          </div>
        </Card>
        )}
      </div>

      <Modal
        isOpen={isFormModalOpen}
        onClose={() => guardClose(() => setIsFormModalOpen(false))}
        title={editingEquipment ? 'Editar equipamento' : 'Novo equipamento'}
        size="lg"
      >
        <EquipmentForm
          initialData={editingEquipment}
          onDirtyChange={setIsFormDirty}
          onSuccess={() => {
            setIsFormModalOpen(false);
            fetchEquipments();
            addNotification({
              type: 'success',
              title: 'Equipamento salvo',
              message: 'As alterações do equipamento foram salvas.'
            });
          }}
          onCancel={() => guardClose(() => setIsFormModalOpen(false))}
        />
      </Modal>

      {/* Achado: fechar o modal (clique fora, Esc ou "Cancelar") descartava o preenchimento
          sem confirmação nenhuma — trava via useUnsavedChangesGuard só pergunta quando há
          alteração não salva de verdade. */}
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
        title="Excluir equipamento?"
        message="O equipamento sai da base de locação. Os kits que o incluem são afetados."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Excluir"
        cancelText="Manter"
      />
    </AdminLayout>
  );
};

export default EquipmentListPage;
