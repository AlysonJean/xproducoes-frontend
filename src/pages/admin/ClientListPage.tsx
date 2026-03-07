/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  UserPlus, 
  Trash2, 
  Edit2, 
  Download, 
  Filter, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Mail,
  Phone,
  Building2,
  Users,
  TrendingUp,
  CreditCard,
  Briefcase,
  Star,
  ChevronRight,
  Database
} from 'lucide-react';
import { useClients } from '@/hooks';
import { useNotifications } from '@/contexts/NotificationContext';
import { BrandLoader } from '@/components/ui/BrandLoader';
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
import ClientForm from '@/components/forms/ClientFormPage';
import type { Client } from '@/types/types';

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'INACTIVE', label: 'Inativo' },
  { value: 'PENDING', label: 'Pendente' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mais Recentes' },
  { value: 'oldest', label: 'Mais Antigos' },
  { value: 'name-asc', label: 'Nome (A-Z)' },
  { value: 'name-desc', label: 'Nome (Z-A)' },
];

export const ClientListPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const { clients: rawClients, isLoading: loading, error, fetchClients, deleteClient } = useClients();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const stats = useMemo(() => {
    const list = rawClients || [];
    return {
      total: list.length,
      active: list.filter(c => c.status === 'ACTIVE').length,
      newThisMonth: list.filter(c => {
         const date = new Date(c.createdAt || '');
         const now = new Date();
         return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }).length,
      vip: list.filter(c => (c.totalSpent || 0) > 5000).length,
    };
  }, [rawClients]);

  const filteredClients = useMemo(() => {
    const result = (rawClients || []).filter(client => {
      const name = (client.name || '').toLowerCase();
      const email = (client.email || '').toLowerCase();
      const company = (client.companyName || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      
      const matchesSearch = name.includes(search) || email.includes(search) || company.includes(search);
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      switch (sortBy) {
        case 'newest': return dateB - dateA;
        case 'oldest': return dateA - dateB;
        case 'name-asc': return (a.name || '').localeCompare(b.name || '');
        case 'name-desc': return (b.name || '').localeCompare(a.name || '');
        default: return 0;
      }
    });

    return result;
  }, [rawClients, searchTerm, statusFilter, sortBy]);

  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleCreate = () => {
    setEditingClient(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setClientToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    try {
      setIsDeleting(true);
      await deleteClient(clientToDelete);
      addNotification({
        type: 'success',
        title: 'Cliente Excluído',
        message: 'O registro do cliente foi removido permanentemente.',
      });
      setIsDeleteModalOpen(false);
    } catch {
      addNotification({
        type: 'error',
        title: 'Erro na Exclusão',
        message: 'Não foi possível remover o cliente devido a vínculos ativos.',
      });
    } finally {
      setIsDeleting(false);
      setClientToDelete(null);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'ACTIVE': return { variant: 'success', label: 'Ativo', icon: CheckCircle2 };
      case 'INACTIVE': return { variant: 'destructive', label: 'Inativo', icon: XCircle };
      case 'PENDING': return { variant: 'warning', label: 'Pendente', icon: Clock };
      default: return { variant: 'outline', label: 'Desconhecido', icon: Users };
    }
  };

  if (loading && (!rawClients || rawClients.length === 0)) {
    return (
      <AdminLayout title="Base de Clientes" breadcrumbs={[{ name: 'Admin' }, { name: 'Clientes' }]}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Sincronizando base de dados..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestão de Clientes" breadcrumbs={[{ name: 'Admin' }, { name: 'CRM' }, { name: 'Clientes' }]}>
      <div className="space-y-8">
        {/* Header and Quick Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-lg ring-1 ring-indigo-500/20">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-foreground uppercase tracking-tighter">Central de Relacionamento</h2>
                <Badge variant="outline" className="text-[10px] font-black uppercase px-2 h-5 bg-indigo-500/5 border-indigo-500/20 text-indigo-500">{stats.total} Registros</Badge>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Gestão de parceiros, empresas e faturamento recorrente</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <Button variant="outline" className="h-11 px-6 font-black uppercase text-[10px] tracking-widest border-border/60 hover:bg-muted group">
               <Download className="h-4 w-4 mr-2" /> Exportar Dados (CSV)
             </Button>
             <Button onClick={handleCreate} className="h-11 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/20 bg-indigo-500 text-white hover:scale-[1.02] transition-transform active:scale-[0.98]">
               <UserPlus className="h-5 w-5 mr-2" /> Vincular Novo Cliente
             </Button>
          </div>
        </div>

        {/* Stats Pulse Grid */}
        <Grid columns={{ sm: 1, md: 2, lg: 4 }} gap={6}>
          <Card className="p-6 bg-card border-border/40 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Users size={80} />
            </div>
            <div className="relative z-10 space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Base Ativa</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">{stats.active}</p>
                        <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-1 uppercase">
                           <TrendingUp className="h-3 w-3" /> Saudável
                        </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Users size={20} />
                    </div>
                </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-card border-border/40 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <UserPlus size={80} />
            </div>
            <div className="relative z-10 space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Novas Entradas</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">{stats.newThisMonth}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 mt-1">Este período fiscal</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Clock size={20} />
                    </div>
                </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border/40 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Star size={80} />
            </div>
            <div className="relative z-10 space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Parceiros VIP</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">{stats.vip}</p>
                        <p className="text-[10px] font-bold text-amber-500 uppercase mt-1">High Volume Clients</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Star size={20} />
                    </div>
                </div>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border/40 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Briefcase size={80} />
            </div>
            <div className="relative z-10 space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mix de Faturamento</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">68%</p>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Conversão recorrente</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500">
                        <CreditCard size={20} />
                    </div>
                </div>
            </div>
          </Card>
        </Grid>

        {error && <Alert variant="error" title="Falha de Comunicação" description="Ocorreu uma instabilidade ao recuperar os registros do CRM." />}

        {/* Filters and Control Center */}
        <Card className="p-4 border-dashed border-2 bg-muted/20 relative overflow-visible z-20">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rastrear por nome, empresa, e-mail institucional ou identificador..."
                className="pl-10 h-10 text-xs font-medium bg-card border-border/60"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-48">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10" />
                <Select
                  className="pl-9 h-10 text-[10px] font-bold uppercase tracking-widest bg-card border-border/60"
                  value={statusFilter}
                                    onChange={(e: any) => setStatusFilter(e.target.value)}
                  options={STATUS_OPTIONS}
                />
              </div>
              <Select
                className="w-48 h-10 text-[10px] font-bold uppercase tracking-widest bg-card border-border/60"
                value={sortBy}
                                onChange={(e: any) => setSortBy(e.target.value)}
                options={SORT_OPTIONS}
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 border-border/60 hover:bg-muted text-muted-foreground"
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); setSortBy('newest'); }}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Global Client Registry */}
        <Card className="overflow-hidden border-border/60 shadow-2xl bg-card animate-in fade-in duration-700">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border/50">
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Sinal de Identidade</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Corporativo / Empresa</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Status</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] text-right">Lançamento</th>
                  <th className="px-6 py-5 text-[10px] font-black text-right text-muted-foreground uppercase tracking-[0.1em]">Ações de Terminal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {paginatedClients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-24 text-center">
                      <div className="inline-flex h-20 w-20 items-center justify-center rounded-[2rem] bg-indigo-500/5 mb-6 ring-8 ring-indigo-500/5 transition-all">
                        <Database className="h-10 w-10 text-indigo-500/30" />
                      </div>
                      <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Base Silenciosa</h3>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-2 font-medium">Não foram interceptados registros com os parâmetros de consulta atuais.</p>
                      <Button variant="outline" className="mt-8 font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-xl border-indigo-500/20 text-indigo-500 hover:bg-indigo-500/5" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                        Redefinir Indexadores
                      </Button>
                    </td>
                  </tr>
                ) : (
                  paginatedClients.map((client) => {
                    const statusInfo = getStatusInfo(client.status || 'ACTIVE');
                    return (
                      <tr key={client.id} className="hover:bg-muted/30 transition-all group animate-in fade-in slide-in-from-left-4 duration-500">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="h-11 w-11 rounded-[1rem] bg-gradient-to-br from-indigo-500/10 to-indigo-500/30 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                              <span className="text-sm font-black text-indigo-600 uppercase">{(client.name || '?').charAt(0)}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-[13px] font-black text-foreground truncate tracking-tight uppercase">{client.name || 'Incompleto'}</p>
                                {client.isVip && <Star size={10} className="text-amber-500 fill-amber-500" />}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground lowercase opacity-70">
                                   <Mail size={10} /> {client.email || 'N/A'}
                                </div>
                                {client.phone && (
                                   <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground opacity-70">
                                      <Phone size={10} /> {client.phone}
                                   </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-2">
                                <Building2 size={12} className="text-muted-foreground" />
                                <span className="text-[11px] font-black text-foreground uppercase tracking-wider">{client.companyName || 'Pessoa Física'}</span>
                             </div>
                             {client.taxId && (
                                <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground opacity-50 uppercase tracking-tighter">
                                   <span className="bg-muted px-1 rounded">DOC</span> {client.taxId}
                                </div>
                             )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                           <div className="flex items-center gap-2">
                               <div className={`h-1.5 w-1.5 rounded-full ${statusInfo.variant === 'success' ? 'bg-emerald-500 animate-pulse' : statusInfo.variant === 'destructive' ? 'bg-destructive' : 'bg-amber-500'}`} />
                               <span className={`text-[10px] font-black uppercase tracking-tighter ${statusInfo.variant === 'success' ? 'text-emerald-600' : 'text-muted-foreground opacity-60'}`}>
                                  {statusInfo.label}
                                </span>
                           </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex flex-col items-end">
                              <span className="text-xs font-black text-foreground tracking-tighter">{new Date(client.createdAt || '').toLocaleDateString('pt-BR')}</span>
                              <span className="text-[9px] font-black text-muted-foreground uppercase opacity-40 tracking-widest">Início Ciclo</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-9 w-9 rounded-xl border-border/40 hover:text-indigo-500 hover:border-indigo-500/50 bg-card shadow-sm" 
                              onClick={() => handleEdit(client)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-9 w-9 rounded-xl border-border/40 hover:text-destructive hover:border-destructive/50 bg-card shadow-sm" 
                              onClick={() => handleDeleteClick(client.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/40 hover:bg-muted group/ext">
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Tactical Pagination Footer */}
          {totalPages > 1 && (
             <div className="px-8 py-6 bg-muted/10 border-t border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                   <Database size={14} className="opacity-50" /> Mostrando {paginatedClients.length} de {filteredClients.length} entidades de negócio
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="h-10 px-5 text-[10px] font-black uppercase tracking-widest rounded-xl"
                  >
                    Retroceder
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => (prev as number) + 1)}
                    className="h-10 px-5 text-[10px] font-black uppercase tracking-widest rounded-xl"
                  >
                    Avançar
                  </Button>
                </div>
             </div>
          )}
        </Card>
      </div>

      {/* Specialty Modals */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingClient ? `Ficha de Registro VIP: ${editingClient.name}` : 'Acordo de Parceria: Novo Cliente'}
        size="lg"
      >
        <ClientForm
                    initialData={editingClient as any}
          onSuccess={() => {
            setIsFormModalOpen(false);
            fetchClients();
            addNotification({
              type: 'success',
              title: 'Sincronização OK',
              message: 'Os parâmetros do cliente foram atualizados no repositório.',
            });
          }}
          onCancel={() => setIsFormModalOpen(false)}
        />
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Validar Exclusão de Entidade?"
        message="Esta operação removerá o cliente e suas preferências da base ativa. Dados vinculados a contratos financeiros existentes permanecerão em cache de auditoria por 5 anos."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Confirmar Purga"
        cancelText="Manter Registro"
      />
    </AdminLayout>
  );
};

export default ClientListPage;
