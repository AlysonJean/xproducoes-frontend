import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Camera, 
  Search, 
  Package,
  DollarSign,
  AlertCircle,
  XCircle,
  ChevronRight,
  Database,
  Cpu,
  ShieldCheck,
  Zap
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
  Select
} from '@/components/ui/StandardComponents';
import EquipmentForm from '../../components/forms/EquipmentFormPage';
import { StatusSelect } from '../../components/admin/StatusSelect';
import { ItemStatus } from '../../types/types';

export const EquipmentListPage = () => {
  const { addNotification } = useNotifications();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [equipmentToDelete, setEquipmentToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchEquipments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/equipments');
      setEquipments(asArray<Equipment>(data));
    } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Radar de Ativos Offline',
        message: err instanceof Error ? err.message : 'Falha crítica ao tentar recuperar inventário.'
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

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
        title: 'Baixa Concluída',
        message: 'O ativo foi removido permanentemente do ecossistema.'
      });
      setIsDeleteModalOpen(false);
    } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Erro de Protocolo',
        message: err instanceof Error ? err.message : 'Falha ao processar solicitação de exclusão.'
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
        title: 'Status Sincronizado',
        message: `Estado operacional do item ${equipment.name} atualizado.`
      });
    } catch {
      addNotification({
        type: 'error',
        title: 'Falha de Sincronia',
        message: 'O terminal não respondeu à tentativa de alteração de status.'
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

  const categories = useMemo(() => {
    const cats = new Set<string>();
    equipments.forEach(e => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cat = typeof e.category === 'string' ? e.category : (e.category as any)?.name;
        if (cat) cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [equipments]);

  const filteredEquipments = useMemo(() => {
    return equipments.filter(e => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cat = typeof e.category === 'string' ? e.category : (e.category as any)?.name || '';
        const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || cat.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || cat === categoryFilter;
        const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [equipments, searchTerm, categoryFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: equipments.length,
    active: equipments.filter(e => e.status === 'ACTIVE' || e.status === 'AVAILABLE').length,
    maintenance: equipments.filter(e => e.status === 'MAINTENANCE').length,
    valuation: equipments.reduce((acc, curr) => acc + (curr.pricePerHour || 0) * 10, 0) // Arbitrary valuation for UI
  }), [equipments]);

  if (loading && equipments.length === 0) {
    return (
      <AdminLayout title="Repositório de Ativos" breadcrumbs={[{ name: 'Admin' }, { name: 'Equipamentos' }]}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Iniciando escaneamento de inventário..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Cofre de Equipamentos" breadcrumbs={[{ name: 'Admin' }, { name: 'Inventário' }, { name: 'Equipamentos' }]}>
      <div className="space-y-8">
        {/* Advanced Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg ring-1 ring-primary/20">
              <Cpu className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-foreground uppercase tracking-tighter">Hardware Operacional</h2>
                <Badge variant="outline" className="text-[10px] font-black uppercase px-2 h-5">{stats.total} Unidades</Badge>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Gestão técnica de ativos e ciclo de manutenção</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <Button variant="outline" onClick={fetchEquipments} className="h-11 px-6 font-black uppercase text-[10px] tracking-widest border-border/60 hover:bg-muted group">
               <Zap className="h-4 w-4 mr-2 group-hover:animate-pulse" /> Sincronizar Estoque
             </Button>
             <Button onClick={handleCreate} className="h-11 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-primary hover:scale-[1.02] transition-transform active:scale-[0.98]">
               <Plus className="h-5 w-5 mr-2" /> Cadastrar Novo Ativo 
             </Button>
          </div>
        </div>

        {/* Tactical Pulse Grid */}
        <Grid columns={{ sm: 1, md: 2, lg: 4 }} gap={6}>
          <Card className="p-6 bg-primary/5 border-primary/10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Package size={80} />
            </div>
            <div className="relative z-10 space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ativos Totais</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">{stats.total}</p>
                        <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-1 uppercase">
                           Lista Completa
                        </p>
                    </div>
                </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-emerald-500/5 border-emerald-500/10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShieldCheck size={80} />
            </div>
            <div className="relative z-10 space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Disponibilidade</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">{stats.active}</p>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Sinal Verde Operacional</p>
                    </div>
                </div>
            </div>
          </Card>

          <Card className="p-6 bg-amber-500/5 border-amber-500/10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <AlertCircle size={80} />
            </div>
            <div className="relative z-10 space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Em Manutenção</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">{stats.maintenance}</p>
                        <p className="text-[10px] font-bold text-amber-500 uppercase mt-1">Intervenção Técnica</p>
                    </div>
                </div>
            </div>
          </Card>

          <Card className="p-6 bg-indigo-500/5 border-indigo-500/10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign size={80} />
            </div>
            <div className="relative z-10 space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Poder de Alocação</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">{formatMoney(stats.valuation)}</p>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase mt-1">Capacidade de Receita</p>
                    </div>
                </div>
            </div>
          </Card>
        </Grid>

        {/* Filters and Command Console */}
        <Card className="p-4 bg-muted/20 border-border/50 relative overflow-visible z-20 backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Escancear por nome do dispositivo, TAG de inventário ou especificações..."
                className="pl-10 h-10 text-xs font-medium bg-card border-border/60"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                className="w-48 h-10 text-[10px] font-bold uppercase tracking-widest bg-card border-border/60"
                value={categoryFilter}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onChange={(e: any) => setCategoryFilter(e.target.value)}
                options={[
                    { value: 'all', label: 'Todas as Categorias' },
                    ...categories.map(c => ({ value: c, label: c }))
                ]}
              />
              <Select
                className="w-44 h-10 text-[10px] font-bold uppercase tracking-widest bg-card border-border/60"
                value={statusFilter}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onChange={(e: any) => setStatusFilter(e.target.value)}
                options={[
                    { value: 'all', label: 'Todos os Estados' },
                    { value: 'ACTIVE', label: 'Ativo/Disponível' },
                    { value: 'MAINTENANCE', label: 'Manutenção' },
                    { value: 'INACTIVE', label: 'Inativo' },
                ]}
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 border-border/60 hover:text-destructive transition-colors group"
                onClick={() => { setSearchTerm(''); setCategoryFilter('all'); setStatusFilter('all'); }}
              >
                <XCircle className="h-4 w-4 group-hover:rotate-90 transition-all duration-300" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Master Inventory Registry */}
        <Card className="overflow-hidden border-border/60 shadow-2xl bg-card animate-in fade-in duration-700">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border/50">
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Assinatura Visual & TAG</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Classificadores</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] text-right">Taxa Operativa</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Status de Pulso</th>
                  <th className="px-6 py-5 text-[10px] font-black text-right text-muted-foreground uppercase tracking-[0.1em]">Controle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredEquipments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-24 text-center">
                      <div className="inline-flex h-20 w-20 items-center justify-center rounded-[2rem] bg-primary/5 mb-6 ring-8 ring-primary/5 transition-all">
                        <Database className="h-10 w-10 text-primary/30" />
                      </div>
                      <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Terminal Vazio</h3>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-2 font-medium">Não foram interceptados ativos com os parâmetros de consulta atuais.</p>
                      <Button variant="outline" className="mt-8 font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-xl border-primary/20 text-primary hover:bg-primary/5" onClick={() => { setSearchTerm(''); setCategoryFilter('all'); }}>
                        Redefinir Indexadores
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredEquipments.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-all group animate-in fade-in slide-in-from-left-4 duration-500">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-5">
                          <div className="relative">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-border/60 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-sm">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                              ) : (
                                <Camera className="h-6 w-6 text-muted-foreground/30" />
                              )}
                            </div>
                            <div className={`absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card ${item.status === 'ACTIVE' || item.status === 'AVAILABLE' ? 'bg-emerald-500' : item.status === 'MAINTENANCE' ? 'bg-amber-500' : 'bg-muted-foreground'}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-black text-foreground truncate uppercase tracking-tight">{item.name}</p>
                            <p className="text-[9px] font-black text-muted-foreground uppercase opacity-40 tracking-widest mt-0.5 font-mono">ID: {item.id.slice(0, 12)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                            <Badge variant="outline" className="w-fit text-[9px] font-black uppercase tracking-widest border-primary/30 bg-primary/5 text-primary h-5 px-2">
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                {typeof item.category === 'string' ? item.category : (item.category as any)?.name || 'Generalista'}
                            </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-black text-primary tracking-tighter">{formatMoney(item.pricePerHour || 0)}</span>
                            <span className="text-[9px] font-black text-muted-foreground uppercase opacity-40 tracking-widest">Base / H</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <StatusSelect 
                          currentStatus={item.status as ItemStatus || ItemStatus.ACTIVE}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          onStatusChange={(newStatus: any) => handleStatusChange(item, newStatus)}
                        />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl border-border/40 hover:text-primary hover:border-primary/50 bg-card shadow-sm" 
                            onClick={() => handleEdit(item)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl border-border/40 hover:text-destructive hover:border-destructive/50 bg-card shadow-sm" 
                            onClick={() => handleDeleteClick(item.id)}
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
               <Zap size={14} className="text-primary animate-pulse" /> Registro sincronizado com núcleo de operações em tempo real
             </p>
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-muted-foreground uppercase">Ativos Retornados:</span>
                <Badge variant="outline" className="text-[10px] font-black px-3">{filteredEquipments.length}</Badge>
             </div>
          </div>
        </Card>
      </div>

      {/* Specialty Modals */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingEquipment ? `Ficha Técnica de Equipamento` : 'Protocolo de Inclusão de Ativo'}
        size="lg"
      >
        <EquipmentForm
          initialData={editingEquipment}
          onSuccess={() => {
            setIsFormModalOpen(false);
            fetchEquipments();
            addNotification({
              type: 'success',
              title: 'Cofre Atualizado',
              message: 'O terminal sincronizou as alterações do equipamento com sucesso.'
            });
          }}
          onCancel={() => setIsFormModalOpen(false)}
        />
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Validar Baixa de Ativo?"
        message="Esta operação removerá o hardware da base de alocação ativa. Todos os kits vinculados a este item serão impactados."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Confirmar Baixa"
        cancelText="Manter Item"
      />
    </AdminLayout>
  );
};

export default EquipmentListPage;
