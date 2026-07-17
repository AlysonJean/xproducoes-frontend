import { useState, useEffect, useCallback, useMemo, type ChangeEvent } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Package,
  TrendingUp,
  DollarSign,
  XCircle,
  Search,
  ChevronRight,
  Database,
  Layers,
  Zap,
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
      const msg = err instanceof Error ? err.message : 'Erro ao carregar repositório de combos.';
      setError(msg);
      addNotification({
        type: 'error',
        title: 'Falha de Sincronia',
        message: msg
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

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
        title: 'Combo Descontinuado',
        message: 'O kit foi removido permanentemente da base de locação.'
      });
      setIsDeleteModalOpen(false);
        } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Erro de Protocolo',
        message: err instanceof Error ? err.message : 'Falha ao processar purga do kit.'
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
        title: 'Pulso Sincronizado',
        message: 'Status do combo atualizado no catálogo ativo.'
      });
        } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Erro de Sinal',
        message: err instanceof Error ? err.message : 'O terminal não respondeu à tentativa de ajuste.'
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
      <AdminLayout title="Arquitetura de Combos" breadcrumbs={[{ name: 'Admin' }, { name: 'Kits' }]}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Mobilizando pacotes de elite..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Módulos de Produção" breadcrumbs={[{ name: 'Admin' }, { name: 'Inventário' }, { name: 'Kits' }]}>
      <div className="space-y-8">
        {/* Dynamic Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg ring-1 ring-primary/20">
              <Layers className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-foreground uppercase tracking-tighter">Gestão de Combos</h2>
                <Badge variant="outline" className="text-[10px] font-black uppercase px-2 h-5 bg-primary/5 border-primary/20 text-primary">{stats.total} Conjuntos</Badge>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Parametrização de pacotes e soluções integradas</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <Button variant="outline" onClick={fetchKits} className="h-11 px-6 font-black uppercase text-[10px] tracking-widest border-border/60 hover:bg-muted group">
               <Zap className="h-4 w-4 mr-2" /> Recarregar Repositório
             </Button>
             <Button onClick={handleCreate} className="h-11 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-primary hover:scale-[1.02] transition-transform active:scale-[0.98]">
               <Plus className="h-5 w-5 mr-2" /> Projetar Novo Combo
             </Button>
          </div>
        </div>

        {/* Tactical Pulse Grid */}
        <Grid columns={{ sm: 1, md: 3 }} gap={6}>
          <Card className="p-6 bg-card border-border/40 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Package size={80} />
            </div>
            <div className="relative z-10 space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Kits Mapeados</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">{stats.total}</p>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Configurações Ativas</p>
                    </div>
                </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-emerald-500/5 border-emerald-500/10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp size={80} />
            </div>
            <div className="relative z-10 space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Disponibilidade</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">{stats.active}</p>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Pronto para Alocação</p>
                    </div>
                </div>
            </div>
          </Card>

          <Card className="p-6 bg-indigo-500/5 border-indigo-500/10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign size={80} />
            </div>
            <div className="relative z-10 space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ticket Estratégico</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">{formatPrice(stats.avgPrice)}</p>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase mt-1">Valor Médio do Combo</p>
                    </div>
                </div>
            </div>
          </Card>
        </Grid>

        {/* Control Console */}
        <Card className="p-4 bg-muted/20 border-border/50 relative overflow-visible z-20 backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Escancear por nome do kit, descrição técnica ou componentes..."
                className="pl-10 h-10 text-xs font-medium bg-card border-border/60"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                className="w-56 h-10 text-[10px] font-bold uppercase tracking-widest bg-card border-border/60"
                value={statusFilter}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                options={[
                    { value: 'all', label: 'Todos os Status' },
                    { value: 'ACTIVE', label: 'Operacional/Ativo' },
                    { value: 'INACTIVE', label: 'Descontinuado/Inativo' },
                ]}
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 border-border/60 hover:bg-muted text-muted-foreground group"
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
              >
                <XCircle className="h-4 w-4 group-hover:rotate-90 transition-all duration-300" />
              </Button>
            </div>
          </div>
        </Card>

        {error && <Alert variant="error" title="Falha de Comunicação" description={error} />}

        {/* Kit Registry Table */}
        <Card className="overflow-hidden border-border/60 shadow-2xl bg-card animate-in fade-in duration-700">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border/50">
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Assinatura & Protótipo</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] text-right">Acordo Comercial</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] text-center">Densidade</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Status</th>
                  <th className="px-6 py-5 text-[10px] font-black text-right text-muted-foreground uppercase tracking-[0.1em]">Controle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredKits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-24 text-center">
                      <div className="inline-flex h-20 w-20 items-center justify-center rounded-[2rem] bg-primary/5 mb-6 ring-8 ring-primary/5 transition-all">
                        <Database className="h-10 w-10 text-primary/30" />
                      </div>
                      <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Nenhum Combo Identificado</h3>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-2 font-medium">Os parâmetros de busca não retornaram correspondências na base de módulos.</p>
                      <Button variant="outline" className="mt-8 font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-xl border-primary/20 text-primary hover:bg-primary/5" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                        Redefinir Filtros
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredKits.map((kit) => (
                    <tr key={kit.id} className="hover:bg-muted/30 transition-all group animate-in fade-in slide-in-from-left-4 duration-500">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-5">
                          <div className="relative">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-border/60 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-sm font-black text-primary/40 uppercase">
                              {kit.imageUrl ? (
                                <img src={kit.imageUrl} alt={kit.name} className="h-full w-full object-cover" />
                              ) : (
                                <Package className="h-6 w-6" />
                              )}
                            </div>
                            <div className={`absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card ${kit.status === 'ACTIVE' || kit.status === 'AVAILABLE' ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-[13px] font-black text-foreground truncate uppercase tracking-tight">{kit.name}</p>
                                {kit.price && kit.price > 1000 && <Star size={10} className="text-amber-500 fill-amber-500" />}
                            </div>
                            <p className="text-[9px] font-black text-muted-foreground uppercase opacity-40 tracking-widest mt-0.5 font-mono">TAG: KIT-{kit.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-black text-primary tracking-tighter">{formatPrice(kit.price || 0)}</span>
                            <span className="text-[9px] font-black text-muted-foreground uppercase opacity-40 tracking-widest">Valor do Pacote</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest py-0.5 bg-muted/50">
                                {(kit.items?.length || kit.equipments?.length) || 0} Ativos
                            </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <StatusSelect 
                          currentStatus={kit.status as ItemStatus || ItemStatus.ACTIVE}
                                                    onStatusChange={(newStatus) => handleStatusChange(kit, newStatus)}
                        />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl border-border/40 hover:text-primary hover:border-primary/50 bg-card shadow-sm" 
                            onClick={() => handleEdit(kit)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl border-border/40 hover:text-destructive hover:border-destructive/50 bg-card shadow-sm" 
                            onClick={() => handleDeleteClick(kit.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/40 hover:bg-muted group/ext">
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Tactical Status Bar */}
          <div className="px-8 py-5 bg-muted/10 border-t border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 italic">
               <Zap size={14} className="text-primary animate-pulse" /> Sincronização modular ativa com o núcleo de precificação
             </p>
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-muted-foreground uppercase">Módulos Carregados:</span>
                <Badge variant="outline" className="text-[10px] font-black px-3">{filteredKits.length}</Badge>
             </div>
          </div>
        </Card>
      </div>

      {/* Specialty Modals */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => guardClose(() => setIsFormModalOpen(false))}
        title={editingKit ? 'Engenharia de Combo Personalizado' : 'Protocolo de Criação de Kit Operacional'}
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
                title: 'Matriz Atualizada',
                message: 'O novo combo foi integrado à base de dados operacional.'
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
        title="Validar Purga de Combo?"
        message="Esta operação desativará permanentemente o kit e suas regras de precificação vinculadas. O histórico de alocações passadas será preservado."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Confirmar Purga"
        cancelText="Manter Combo"
      />
    </AdminLayout>
  );
};

export default AdminKitListPage;
