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
  Star,
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
  Alert,
  Pagination,
  type StandardVariant,
} from '@/components/ui/StandardComponents';
import ClientForm from '@/components/forms/ClientFormPage';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import type { Client } from '@/types/types';
import { downloadClientsSpreadsheet } from '@/utils/clientExport';

const ITEMS_PER_PAGE = 10;

// Título e breadcrumb iguais no carregamento e com dados (antes trocavam: "Base de Clientes" → "Gestão de Clientes").
const PAGE_TITLE = 'Clientes';
const BREADCRUMBS = [{ name: 'Admin', href: '/admin/painel' }, { name: 'Clientes' }];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'INACTIVE', label: 'Inativo' },
  { value: 'PENDING', label: 'Pendente' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigos' },
  { value: 'name-asc', label: 'Nome (A-Z)' },
  { value: 'name-desc', label: 'Nome (Z-A)' },
];

// Mesmo critério do card "Clientes VIP" (gasto acumulado).
const VIP_SPENT_THRESHOLD = 5000;

// Mensagem do backend (axios) quando houver; senão, um texto genérico. O backend recusa (409)
// cliente com reservas e diz quantas são.
const apiErrorMessage = (err: unknown, fallback: string) => {
  const data = (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
  return data?.message || data?.error || fallback;
};

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
  const [isFormDirty, setIsFormDirty] = useState(false);
  const { guardClose, isConfirmOpen, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard(isFormDirty);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Achado (auditoria): havia um 4º card "Mix de Faturamento" com "68%" fixo e rótulos inventados
  // ("Saudável", "High Volume Clients"). Ficam só as contagens calculadas da própria lista.
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
      vip: list.filter(c => (c.totalSpent || 0) > VIP_SPENT_THRESHOLD).length,
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

  // O botão "Exportar Dados" existia sem onClick. Exporta os clientes filtrados (busca/status).
  const handleExport = async () => {
    if (filteredClients.length === 0) {
      addNotification({ type: 'info', title: 'Nada para exportar', message: 'Nenhum cliente com os filtros atuais.' });
      return;
    }
    try {
      await downloadClientsSpreadsheet(filteredClients);
    } catch {
      addNotification({ type: 'error', title: 'Erro na exportação', message: 'Não foi possível gerar a planilha.' });
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / ITEMS_PER_PAGE));
  // Se o filtro encolher a lista, a página atual pode passar do fim — sem isto aparecia "nenhum cliente".
  const page = Math.min(currentPage, totalPages);
  const paginatedClients = filteredClients.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const clearFilters = () => { setSearchTerm(''); setStatusFilter('all'); setSortBy('newest'); };

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
        title: 'Cliente excluído',
        message: 'O cliente foi removido.',
      });
      setIsDeleteModalOpen(false);
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Erro ao excluir',
        message: apiErrorMessage(err, 'Não foi possível excluir o cliente.'),
      });
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
      setClientToDelete(null);
    }
  };

  const getStatusInfo = (status: string): { variant: StandardVariant; label: string; icon: typeof Users } => {
    switch (status) {
      case 'ACTIVE': return { variant: 'success', label: 'Ativo', icon: CheckCircle2 };
      case 'INACTIVE': return { variant: 'destructive', label: 'Inativo', icon: XCircle };
      case 'PENDING': return { variant: 'warning', label: 'Pendente', icon: Clock };
      default: return { variant: 'outline', label: 'Desconhecido', icon: Users };
    }
  };

  if (loading && (!rawClients || rawClients.length === 0)) {
    return (
      <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Carregando clientes…" />
        </div>
      </AdminLayout>
    );
  }

  const hasFilters = searchTerm !== '' || statusFilter !== 'all' || sortBy !== 'newest';
  // Erro de API nunca pode aparecer como "nenhum cliente": sem dados, mostra só o aviso de erro.
  const showTable = !(error && (!rawClients || rawClients.length === 0));

  return (
    <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
      <div className="space-y-6">
        {/* Cabeçalho e ações */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">Base de clientes</h2>
                <Badge variant="primary">{stats.total} cadastrados</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Clientes, empresas e dados de contato.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
             <Button onClick={handleExport} variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />}>
               Exportar (Excel)
             </Button>
             <Button onClick={handleCreate} size="sm" leftIcon={<UserPlus className="h-4 w-4" />}>
               Novo cliente
             </Button>
          </div>
        </div>

        {/* Indicadores */}
        <Grid columns={{ sm: 1, md: 3 }} gap={6}>
          <Card className="p-4 bg-primary/5 border-primary/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clientes ativos</p>
                <p className="text-2xl font-bold text-foreground">{stats.active}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-success/5 border-success/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cadastrados no mês</p>
                <p className="text-2xl font-bold text-foreground">{stats.newThisMonth}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-warning/5 border-warning/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clientes VIP</p>
                <p className="text-2xl font-bold text-foreground">{stats.vip}</p>
                <p className="text-xs text-muted-foreground">Gasto acima de R$ 5.000</p>
              </div>
            </div>
          </Card>
        </Grid>

        {error && (
          <Alert
            variant="error"
            title="Não foi possível carregar os clientes"
            description={error}
            action={<Button size="sm" variant="outline" onClick={() => fetchClients()}>Tentar de novo</Button>}
          />
        )}

        {/* Filtros */}
        <Card className="p-4 border-dashed border-2 bg-muted/20">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                size="sm"
                placeholder="Buscar por nome, empresa ou e-mail..."
                aria-label="Buscar clientes"
                leftIcon={<Search className="h-4 w-4" />}
                className="bg-card"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* flex-col no celular: dois selects de 192px + botão estouravam a tela de 375px */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative w-full sm:w-48">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                <Select
                  size="sm"
                  className="pl-9 bg-card"
                  aria-label="Filtrar por status"
                  value={statusFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                  options={STATUS_OPTIONS}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  size="sm"
                  className="bg-card"
                  aria-label="Ordenar por"
                  value={sortBy}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value)}
                  options={SORT_OPTIONS}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 self-end sm:self-auto"
                onClick={clearFilters}
                aria-label="Limpar filtros"
                title="Limpar filtros"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {showTable && (
        <Card className="overflow-hidden border-border shadow-sm animate-in fade-in duration-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Empresa</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Cadastro</th>
                  <th className="px-6 py-4 text-xs font-bold text-right text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedClients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">Nenhum cliente encontrado</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
                        {hasFilters ? 'Ajuste a busca ou os filtros.' : 'Ainda não há clientes cadastrados.'}
                      </p>
                      {hasFilters && (
                        <Button variant="outline" size="sm" className="mt-6" onClick={clearFilters}>
                          Limpar filtros
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedClients.map((client) => {
                    const statusInfo = getStatusInfo(client.status || 'ACTIVE');
                    const clientName = client.name || 'Sem nome';
                    return (
                      <tr key={client.id} className="hover:bg-muted/20 transition-colors group animate-in fade-in slide-in-from-left-4 duration-500">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-primary uppercase">{(client.name || '?').charAt(0)}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-bold text-foreground truncate">{clientName}</p>
                                {client.isVip && <Star size={12} className="text-warning fill-warning" aria-label="Cliente VIP" />}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                   <Mail size={12} aria-hidden="true" /> {client.email || 'Sem e-mail'}
                                </span>
                                {client.phone && (
                                   <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Phone size={12} aria-hidden="true" /> {client.phone}
                                   </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-0.5">
                             <div className="flex items-center gap-2">
                                <Building2 size={14} className="text-muted-foreground" aria-hidden="true" />
                                <span className="text-sm font-medium text-foreground">{client.companyName || 'Pessoa física'}</span>
                             </div>
                             {client.taxId && (
                                <span className="text-xs text-muted-foreground">CPF/CNPJ: {client.taxId}</span>
                             )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm text-foreground">{new Date(client.createdAt || '').toLocaleDateString('pt-BR')}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => handleEdit(client)}
                              aria-label={`Editar ${clientName}`}
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 hover:text-destructive hover:border-destructive/50"
                              onClick={() => handleDeleteClick(client.id)}
                              aria-label={`Excluir ${clientName}`}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
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
        </Card>
        )}

        {showTable && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={filteredClients.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={(p: number) => setCurrentPage(p)}
          />
        )}
      </div>

      <Modal
        isOpen={isFormModalOpen}
        onClose={() => guardClose(() => setIsFormModalOpen(false))}
        title={editingClient ? `Editar cliente: ${editingClient.name}` : 'Novo cliente'}
        size="lg"
      >
        <ClientForm
          initialData={editingClient}
          onDirtyChange={setIsFormDirty}
          onSuccess={() => {
            setIsFormModalOpen(false);
            fetchClients();
            addNotification({
              type: 'success',
              title: 'Cliente salvo',
              message: 'Os dados do cliente foram salvos.',
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

      {/* A mensagem antiga prometia "cache de auditoria por 5 anos" — retenção que não existe no sistema. */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir cliente?"
        message="O cliente será removido da base. Cliente com reservas não pode ser excluído. Esta ação não pode ser desfeita."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Excluir"
        cancelText="Cancelar"
      />
    </AdminLayout>
  );
};

export default ClientListPage;
