import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Trash2, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Edit2, 
  Mail, 
  Shield, 
  UserPlus, 
  Settings,
  XCircle,
  ChevronRight,
  Award,
  Clock,
  Briefcase
} from 'lucide-react';
import { useCollaborators } from '../../hooks';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { useNotifications } from '../../contexts/NotificationContext';
import { useModal } from '@/components/modals/ModalContext';
import { api } from '@/services/api';
import type { CollaboratorDashboard } from '../../types/types';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { 
  Button, 
  Input, 
  Select, 
  Modal, 
  ConfirmModal, 
  Card, 
  Badge, 
  Grid,
  Alert
} from '@/components/ui/StandardComponents';
import { formatPrice } from '@/utils/formatPrice';
import { CollaboratorForm } from '@/components/forms/CollaboratorFormPage';

const ROLE_LABELS: Record<string, string> = {
  PHOTOGRAPHER: 'Fotógrafo',
  VIDEOGRAPHER: 'Videomaker',
  EDITOR: 'Editor',
  ASSISTANT: 'Assistente',
  OTHER: 'Outro',
};

const ITEMS_PER_PAGE = 10;

const ROLE_OPTIONS = [
  { value: 'all', label: 'Todas as Funções' },
  { value: 'PHOTOGRAPHER', label: 'Fotógrafo' },
  { value: 'VIDEOGRAPHER', label: 'Videomaker' },
  { value: 'EDITOR', label: 'Editor' },
  { value: 'ASSISTANT', label: 'Assistente' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'ACTIVE', label: 'Ativo em Campo' },
  { value: 'INACTIVE', label: 'Indisponível' },
];

export const AdminCollaboratorsPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const { openModal } = useModal();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [editingCollaborator, setEditingCollaborator] = useState<CollaboratorDashboard | null>(null);
  const [collaboratorToDelete, setCollaboratorToDelete] = useState<string | null>(null);
  const [selectedCollaborators, setSelectedCollaborators] = useState<Set<string>>(new Set());
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    collaborators: rawCollaborators,
    isLoading: loading,
    error,
    fetchCollaborators,
    deleteCollaborator,
  } = useCollaborators();

  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  const collaborators = useMemo(() => 
    (rawCollaborators || []) as CollaboratorDashboard[], 
    [rawCollaborators]
  );

  const stats = useMemo(() => ({
    total: collaborators.length,
    active: collaborators.filter(c => c.status === 'ACTIVE').length,
    inactive: collaborators.filter(c => c.status === 'INACTIVE').length,
    earnings: collaborators.reduce((acc, c) => acc + (c.totalEarnings || 0), 0),
  }), [collaborators]);

  const filteredCollaborators = useMemo(() => {
    return collaborators.filter(c => {
      const searchStr = (c.name + c.email + (c.role || '')).toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      const matchesRole = selectedRole === 'all' || c.role === selectedRole;
      const matchesStatus = selectedStatus === 'all' || c.status === selectedStatus;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [collaborators, searchTerm, selectedRole, selectedStatus]);

  const totalPages = Math.ceil(filteredCollaborators.length / ITEMS_PER_PAGE);
  const paginatedCollaborators = filteredCollaborators.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleCreate = () => {
    setEditingCollaborator(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (collaborator: CollaboratorDashboard) => {
    setEditingCollaborator(collaborator);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setCollaboratorToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!collaboratorToDelete) return;
    try {
      setIsDeleting(true);
      await deleteCollaborator(collaboratorToDelete);
      addNotification({
        type: 'success',
        title: 'Talento Removido',
        message: 'O cadastro do colaborador foi desativado com sucesso.',
      });
      setIsDeleteModalOpen(false);
    } catch {
      addNotification({
        type: 'error',
        title: 'Falha na Operação',
        message: 'Não foi possível remover o colaborador neste momento.',
      });
    } finally {
      setIsDeleting(false);
      setCollaboratorToDelete(null);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviteLoading(true);
    try {
      const resp = await api.post('/collaborators/invite', { email: inviteEmail });
      const data = resp.data || {};
      const inviteUrl = data.inviteUrl || data.registrationLink || '';
      
      if (inviteUrl) {
        openModal('invite', { inviteUrl, tempPassword: data.tempPassword });
      } else {
        addNotification({ 
          type: 'success', 
          title: 'Convite Disparado', 
          message: 'O link de acesso foi enviado para o e-mail do colaborador.' 
        });
      }
      setInviteEmail('');
      setIsInviteModalOpen(false);
    } catch {
      addNotification({ type: 'error', title: 'Erro de Envio', message: 'Falha ao processar convite via SMTP.' });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleSelectCollaborator = (id: string, selected: boolean) => {
    const newSelection = new Set(selectedCollaborators);
    if (selected) newSelection.add(id);
    else newSelection.delete(id);
    setSelectedCollaborators(newSelection);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) setSelectedCollaborators(new Set(paginatedCollaborators.map(c => c.id)));
    else setSelectedCollaborators(new Set());
  };

  if (loading && collaborators.length === 0) {
    return (
      <AdminLayout title="Capital Humano" breadcrumbs={[{ name: 'Admin' }, { name: 'Equipe' }]}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Interrogando base de talentos..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestão de Talentos" breadcrumbs={[{ name: 'Admin' }, { name: 'Colaboradores' }]}>
      <div className="space-y-8">
        {/* Modern Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg ring-1 ring-primary/20">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-foreground uppercase tracking-tighter">Corpo Técnico</h2>
                <Badge variant="outline" className="text-[10px] font-black uppercase px-2 h-5">{stats.total} Ativos</Badge>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Gestão de competências e alocação operacional</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <Button variant="outline" onClick={() => window.location.href = '/admin/colaboradores/funcoes'} className="h-11 px-6 font-black uppercase text-[10px] tracking-widest border-border/60 hover:bg-muted group">
               <Settings className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform duration-500" /> Parametrizar Funções
             </Button>
             <Button variant="outline" onClick={() => setIsInviteModalOpen(true)} className="h-11 px-6 font-black uppercase text-[10px] tracking-widest border-primary/20 text-primary hover:bg-primary/5">
               <Mail className="h-4 w-4 mr-2" /> Disparar Convite
             </Button>
             <Button onClick={handleCreate} className="h-11 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-primary hover:scale-[1.02] transition-transform active:scale-[0.98]">
               <UserPlus className="h-5 w-5 mr-2" /> Novo Especialista
             </Button>
          </div>
        </div>

        {/* Stats Pulse Grid */}
        <Grid columns={{ sm: 1, md: 3 }} gap={6}>
          <Card className="p-6 bg-primary/5 border-primary/10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users size={80} />
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full gap-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Base Operacional</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">{stats.total}</p>
                        <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                            <TrendingUp className="h-3 w-3" /> {stats.active} disponíveis p/ eventos
                        </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Users size={20} />
                    </div>
                </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-indigo-500/5 border-indigo-500/10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Award size={80} />
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full gap-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mix de Talentos</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">{Object.keys(ROLE_LABELS).length}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 mt-1">Especialidades Cadastradas</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Shield size={20} />
                    </div>
                </div>
            </div>
          </Card>

          <Card className="p-6 bg-emerald-500/5 border-emerald-500/10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign size={80} />
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full gap-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Custo Operativo Global</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">{formatPrice(stats.earnings)}</p>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Investimento acumulado</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <DollarSign size={20} />
                    </div>
                </div>
            </div>
          </Card>
        </Grid>

        {error && <Alert variant="error" title="Erro de Sincronização" description="Não foi possível estabelecer conexão com o servidor de RH." />}

        {/* Filters and Control Center */}
        <Card className="p-4 border-border/50 bg-card/60 backdrop-blur-sm relative overflow-visible z-20">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Identificar talento por nome, contato ou função específica..."
                className="pl-10 h-10 text-xs font-medium bg-muted/30 border-border/60"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                className="w-48 h-10 text-[10px] font-bold uppercase tracking-widest bg-muted/30"
                value={selectedRole}
                onChange={(e: any) => setSelectedRole(e.target.value)}
                options={ROLE_OPTIONS}
              />
              <Select
                className="w-44 h-10 text-[10px] font-bold uppercase tracking-widest bg-muted/30"
                value={selectedStatus}
                onChange={(e: any) => setSelectedStatus(e.target.value)}
                options={STATUS_OPTIONS}
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 border-border/60 hover:text-destructive transition-colors"
                onClick={() => { setSearchTerm(''); setSelectedRole('all'); setSelectedStatus('all'); }}
                title="Resetar Filtros"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Global Talent Table */}
        <Card className="overflow-hidden border-border/50 shadow-2xl bg-card animate-in fade-in zoom-in-95 duration-700">
          {selectedCollaborators.size > 0 && (
            <div className="bg-primary px-6 py-4 border-b border-primary/10 flex items-center justify-between animate-in slide-in-from-top-4 duration-500 sticky top-0 z-30">
              <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-xs">
                    {selectedCollaborators.size}
                 </div>
                 <span className="text-[10px] font-black text-white uppercase tracking-widest">
                    Especialistas selecionados para ação em massa
                 </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-8 text-[9px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 text-white border-white/20">Ativar Perfil</Button>
                <Button size="sm" variant="outline" className="h-8 text-[9px] font-black uppercase tracking-widest bg-destructive text-white border-transparent hover:bg-destructive/80">Desligar</Button>
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border/50">
                  <th className="px-6 py-5 w-12 text-center">
                    <input
                      type="checkbox"
                      className="rounded-md border-border/60 text-primary focus:ring-primary h-4 w-4"
                      checked={selectedCollaborators.size === paginatedCollaborators.length && paginatedCollaborators.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      title="Selecionar Visíveis"
                    />
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Talento Especialista</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Área de Atuação</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Status Radar</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] text-right">Acordo (H)</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] text-center">Eventos</th>
                  <th className="px-6 py-5 text-[10px] font-black text-right text-muted-foreground uppercase tracking-[0.1em]">Controle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {paginatedCollaborators.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-24 text-center">
                      <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/30 mb-6 ring-8 ring-muted/10">
                        <Users className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                      <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Nenhum talento interceptado</h3>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-2 font-medium">Os critérios de busca não retornaram correspondências na base ativa.</p>
                      <Button variant="outline" className="mt-8 font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-xl" onClick={() => { setSearchTerm(''); setSelectedRole('all'); }}>
                        Redefinir Parametragem
                      </Button>
                    </td>
                  </tr>
                ) : (
                  paginatedCollaborators.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-all group animate-in fade-in slide-in-from-left duration-300">
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          className="rounded-md border-border/60 text-primary focus:ring-primary h-4 w-4"
                          checked={selectedCollaborators.has(c.id)}
                          onChange={(e) => handleSelectCollaborator(c.id, e.target.checked)}
                          title={`Marcar ${c.name}`}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-black text-primary uppercase">{c.name.charAt(0)}</span>
                            </div>
                            <div className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card ${c.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-foreground truncate tracking-tight">{c.name}</p>
                            <p className="text-[10px] font-medium text-muted-foreground italic truncate lowercase opacity-70">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="w-fit text-[9px] font-black uppercase tracking-widest border-primary/30 bg-primary/5 text-primary h-5 px-2">
                                {ROLE_LABELS[c.role] || c.role || 'Generalista'}
                            </Badge>
                            <div className="flex items-center gap-1.5 text-[8px] font-bold text-muted-foreground uppercase opacity-50 px-1">
                                <Briefcase size={10} /> CLT / Prestador
                            </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                             <div className={`h-1.5 w-1.5 rounded-full ${c.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                             <span className={`text-[10px] font-black uppercase tracking-tighter ${c.status === 'ACTIVE' ? 'text-emerald-600' : 'text-muted-foreground opacity-60'}`}>
                                {c.status === 'ACTIVE' ? 'Operacional' : 'Stand-by'}
                             </span>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                            <span className="text-sm font-black text-foreground tracking-tighter">{formatPrice(c.hourlyRate || 0)}</span>
                            <span className="text-[8px] font-black text-muted-foreground uppercase opacity-50 tracking-widest">Valor Base</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-1 rounded-lg bg-muted border border-border/50 text-xs font-black text-foreground">
                                {c.totalEvents || 0}
                            </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
                          <Button 
                            variant="primary" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl shadow-lg shadow-primary/10" 
                            onClick={() => handleEdit(c)}
                            title="Ficha Detalhada"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl shadow-lg shadow-destructive/10" 
                            onClick={() => handleDeleteClick(c.id)}
                            title="Desligar Talento"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/40 hover:bg-muted group/more">
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

          {/* Pagination Command Footer */}
          {totalPages > 1 && (
            <div className="px-8 py-6 bg-muted/10 border-t border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-card border border-border/40">
                    <Clock size={16} className="text-muted-foreground" />
                </div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Página <span className="text-foreground">{currentPage}</span> / <span className="text-foreground">{totalPages}</span> — <span className="text-primary">{filteredCollaborators.length} resultados</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="h-10 px-5 text-[10px] font-black uppercase tracking-widest rounded-xl border-border/60"
                >
                  Anterior
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((page, idx, arr) => (
                  <React.Fragment key={page}>
                    {idx > 0 && arr[idx-1] !== page - 1 && <span className="flex items-center px-1 text-muted-foreground">...</span>}
                    <Button
                      variant={currentPage === page ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={`h-10 w-10 p-0 text-[10px] font-black rounded-xl border-border/60 ${currentPage === page ? 'shadow-lg shadow-primary/20' : ''}`}
                    >
                      {page}
                    </Button>
                  </React.Fragment>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="h-10 px-5 text-[10px] font-black uppercase tracking-widest rounded-xl border-border/60"
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Specialty Forms & Tactical Modals */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingCollaborator ? `Ficha Técnica: ${editingCollaborator.name}` : 'Mobilização de Novo Talento'}
        size="lg"
      >
        <CollaboratorForm
          initialData={editingCollaborator}
          onSuccess={() => {
            setIsFormModalOpen(false);
            fetchCollaborators();
            addNotification({
              type: 'success',
              title: 'Operação Concluída',
              message: `O registro do especialista foi ${editingCollaborator ? 'sincronizado' : 'ativado'} no sistema.`
            });
          }}
          onCancel={() => setIsFormModalOpen(false)}
        />
      </Modal>
      
      <Modal
         isOpen={isInviteModalOpen}
         onClose={() => setIsInviteModalOpen(false)}
         title="Protocolo de Convite"
         size="sm"
      >
        <div className="space-y-6 py-2">
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 border-dashed">
                <p className="text-[11px] font-bold text-muted-foreground leading-relaxed italic">
                    "O destinatário receberá um link criptografado para parametrização do perfil profissional e aceitação dos termos operativo."
                </p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">E-mail Profissional</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="talento@workspace.com"
                className="h-12 bg-muted/30 border-border/60 text-sm font-medium"
              />
            </div>
            <div className="flex flex-col gap-2 pt-4">
              <Button 
                onClick={handleInvite}
                isLoading={inviteLoading}
                disabled={!inviteEmail}
                className="w-full h-12 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20"
              >
                Enviar Protocolo
              </Button>
              <Button variant="outline" onClick={() => setIsInviteModalOpen(false)} className="w-full h-12 font-black uppercase text-[10px] tracking-widest border-border/60">Abortar</Button>
            </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Confirmar Desligamento Técnico?"
        message="Esta ação retirará o especialista do radar operacional. O histórico de eventos será mantido para fins de auditoria, mas o perfil ficará inacessível para novas alocações."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Confirmar Remoção"
        cancelText="Manter Talento"
      />
    </AdminLayout>
  );
};

export default AdminCollaboratorsPage;
