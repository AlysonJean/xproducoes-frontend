import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Clock, 
  Briefcase,
  DollarSign,
  XCircle,
  Search,
  ChevronRight,
  Database,
  Zap,
  Award,
  ShieldCheck,
  Star
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '../../services/api';
import { asArray } from '../../utils/normalize';
import type { Service } from '../../types/types';
import { formatMoney } from '../../utils/typeSafeFormatters'; 
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

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/services');
      setServices(asArray<Service>(data));
      setError(null);
    } catch (err: any) {
      const msg = err?.message || 'Falha ao sincronizar catálogo de soluções.';
      setError(msg);
      addNotification({
        type: 'error',
        title: 'Terminal de Serviços Offline',
        message: msg
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

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
        title: 'Especialidade Suspendida',
        message: 'O serviço foi removido do catálogo operativo com sucesso.'
      });
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Erro de Purga',
        message: err?.message || 'Não foi possível desativar este serviço no momento.'
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
        title: 'Status Sincronizado',
        message: `Disponibilidade de ${service.name} atualizada.`
      });
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Erro de Sinal',
        message: err?.message || 'Falha ao comunicar alteração de status operacional.'
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
      ? services.reduce((acc, curr) => acc + (curr.price || 0), 0) / services.length 
      : 0
  }), [services]);

  if (loading && services.length === 0) {
    return (
      <AdminLayout title="Matriz de Soluções" breadcrumbs={[{ name: 'Admin' }, { name: 'Serviços' }]}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Interrogando catálogo de serviços..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Catálogo de Especialidades" breadcrumbs={[{ name: 'Admin' }, { name: 'Inventário' }, { name: 'Serviços' }]}>
      <div className="space-y-8">
        {/* Modern Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg ring-1 ring-primary/20">
              <Award className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-foreground uppercase tracking-tighter">Corpo de Soluções</h2>
                <Badge variant="outline" className="text-[10px] font-black uppercase px-2 h-5 bg-primary/5 border-primary/20 text-primary">{stats.total} Especialidades</Badge>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Gestão de entregáveis técnicos e precificação estratégica</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <Button variant="outline" onClick={fetchServices} className="h-11 px-6 font-black uppercase text-[10px] tracking-widest border-border/60 hover:bg-muted group">
               <Zap className="h-4 w-4 mr-2" /> Sincronizar Portfólio
             </Button>
             <Button onClick={handleCreate} className="h-11 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-primary hover:scale-[1.02] transition-transform active:scale-[0.98]">
               <Plus className="h-5 w-5 mr-2" /> Nova Solução Técnica
             </Button>
          </div>
        </div>

        {/* Tactical Pulse Grid */}
        <Grid columns={{ sm: 1, md: 3 }} gap={6}>
          <Card className="p-6 bg-card border-border/40 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Briefcase size={80} />
            </div>
            <div className="relative z-10 space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mix de Serviços</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">{stats.total}</p>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Especialidades Mapeadas</p>
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
                        <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Sinal Verde Ativo</p>
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
                        <p className="text-3xl font-black text-foreground tracking-tighter">{formatMoney(stats.avgPrice)}</p>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase mt-1">Investimento Médio</p>
                    </div>
                </div>
            </div>
          </Card>
        </Grid>

        {/* Command Console */}
        <Card className="p-4 bg-muted/20 border-border/50 relative overflow-visible z-20 backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Escancear por nome do serviço, descrição técnica ou termos de busca..."
                className="pl-10 h-10 text-xs font-medium bg-card border-border/60"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                className="w-56 h-10 text-[10px] font-bold uppercase tracking-widest bg-card border-border/60"
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                options={[
                    { value: 'all', label: 'Todos os Estados' },
                    { value: 'ACTIVE', label: 'Operacional / Ativo' },
                    { value: 'INACTIVE', label: 'Suspenso / Inativo' },
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

        {/* Service Registry Table */}
        <Card className="overflow-hidden border-border/60 shadow-2xl bg-card animate-in fade-in duration-700">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border/50">
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Sinal Solução & Protótipo</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] text-right">Base Investimento</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] text-center">Protocolo Tempo</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Status</th>
                  <th className="px-6 py-5 text-[10px] font-black text-right text-muted-foreground uppercase tracking-[0.1em]">Controle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-24 text-center">
                      <div className="inline-flex h-20 w-20 items-center justify-center rounded-[2rem] bg-primary/5 mb-6 ring-8 ring-primary/5 transition-all">
                        <Database className="h-10 w-10 text-primary/30" />
                      </div>
                      <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Catálogo Silencioso</h3>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-2 font-medium">Os parâmetros de busca não retornaram correspondências no repositório.</p>
                      <Button variant="outline" className="mt-8 font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-xl border-primary/20 text-primary hover:bg-primary/5" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                        Redefinir Filtros
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-all group animate-in fade-in slide-in-from-left-4 duration-500">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-5">
                          <div className="relative">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-border/60 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-sm font-black text-primary/40 uppercase">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                              ) : (
                                <Briefcase className="h-6 w-6" />
                              )}
                            </div>
                            <div className={`absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card ${item.status === 'ACTIVE' || item.status === 'AVAILABLE' ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-[13px] font-black text-foreground truncate uppercase tracking-tight">{item.name}</p>
                                {item.price && item.price > 2000 && <Star size={10} className="text-amber-500 fill-amber-500" />}
                            </div>
                            <p className="text-[9px] font-black text-muted-foreground uppercase opacity-40 tracking-widest mt-0.5 font-mono">CODE: SRV-{item.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-black text-primary tracking-tighter">{formatMoney(item.price || 0)}</span>
                            <span className="text-[9px] font-black text-muted-foreground uppercase opacity-40 tracking-widest">Valor Base</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/50 text-[10px] font-black text-foreground uppercase tracking-widest">
                            <Clock size={14} className="text-muted-foreground" />
                            {(item.duration / 60).toFixed(1).replace('.0', '')} H
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <StatusSelect 
                          currentStatus={item.status as ItemStatus || ItemStatus.ACTIVE}
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
               <Zap size={14} className="text-primary animate-pulse" /> Catálogo sincronizado com a matriz de precificação dinâmica
             </p>
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-muted-foreground uppercase">Especialidades Carregadas:</span>
                <Badge variant="outline" className="text-[10px] font-black px-3">{filteredServices.length}</Badge>
             </div>
          </div>
        </Card>
      </div>

      {/* Specialty Interface Modals */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingService ? 'Ajuste de Escopo Técnico' : 'Protocolo de Inclusão de Nova Solução'}
        size="lg"
      >
        <ServiceForm
            initialData={editingService}
            onSuccess={() => {
              setIsFormModalOpen(false);
              fetchServices();
              addNotification({
                type: 'success',
                title: 'Matriz Atualizada',
                message: 'O novo serviço foi integrado ao portfólio operativo.'
              });
            }}
            onCancel={() => setIsFormModalOpen(false)}
        />
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Validar Purga de Solução?"
        message="Esta operação desativará o serviço no catálogo ativo para novos contratos. Históricos passados permanecem inalterados por razões legais."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Confirmar Purga"
        cancelText="Manter Portfólio"
      />
    </AdminLayout>
  );
};

export default AdminServiceListPage;
