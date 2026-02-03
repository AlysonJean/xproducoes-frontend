import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Edit, Trash2, Users, Download, Plus, Calendar } from 'lucide-react';

import AdminLayout from '@/components/admin/AdminLayout';
import { SimpleCard, StatsCard } from '@/components/ui/Cards';
import { formatPrice } from '@/utils/formatPrice';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { apiFetch } from '@/services/api';
import type { ClientResponse, User } from '@/types/types';
import { useNotifications } from '@/contexts/NotificationContext';
import ClientForm from '@/components/forms/ClientFormPage';
import { Modal } from '@/components/ui/StandardComponents';

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'INACTIVE', label: 'Inativo' },
  { value: 'SUSPENDED', label: 'Suspenso' },
];

const SORT_OPTIONS = [
  { value: 'name', label: 'Nome' },
  { value: 'status', label: 'Status' },
  { value: 'totalBookings', label: 'Reservas' },
  { value: 'totalSpent', label: 'Total Gasto' },
  { value: 'createdAt', label: 'Cadastro' },
];

const normalizeRole = (role: unknown) => String(role || '').toUpperCase();

const ClientListPage: React.FC = () => {
  const [clients, setClients] = useState<User[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [selectedStatus, setSelectedStatus] = useState<'' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'>('');
  const [sortBy, setSortBy] = useState<keyof User>('name' as keyof User);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<User | null>(null);

  const { addNotification } = useNotifications();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(ITEMS_PER_PAGE));
      if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
      if (selectedStatus) params.set('status', selectedStatus);
      if (sortBy) params.set('sortBy', String(sortBy));
      if (sortOrder) params.set('sortOrder', sortOrder);

  const response = await apiFetch<ClientResponse>(`/admin/clients?${params.toString()}`);

      const mappedRaw = (response?.data || []).map((c: any) => ({
        id: c.id,
        name: c.name || c.fullName || 'Sem nome',
        email: c.email,
        role: c.role,
        phone: c.phone,
        avatar: c.avatar || c.avatarUrl,
        isActive: c.isActive,
        createdAt: c.createdAt,
        totalBookings: c.totalBookings ?? c._count?.bookings ?? 0,
        totalSpent: c.totalSpent ?? 0,
        status: c.status ?? (c.isActive ? 'ACTIVE' : 'INACTIVE'),
      })) as User[];

      const onlyClients = mappedRaw.filter((u) => normalizeRole(u.role) === 'CLIENT');
      setClients(onlyClients);
      setTotalClients(response?.meta?.totalItems ?? onlyClients.length);
      setTotalPages(response?.meta?.totalPages ?? 1);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar clientes');
      addNotification({ type: 'error', title: 'Erro', message: e?.message || 'Falha ao carregar' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, selectedStatus, sortBy, sortOrder, addNotification]);

  const handleCreate = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleEdit = (client: User) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    setEditingClient(null);
    fetchClients();
  };

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleStatusFilter = useCallback((status: '' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => {
    setSelectedStatus(status);
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback((field: keyof User) => {
    if (sortBy === field) setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }, [sortBy]);

  const handleSelectClient = (id: string, checked: boolean) => {
    const next = new Set(selectedClients);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedClients(next);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedClients(new Set(clients.map((c) => c.id)));
    else setSelectedClients(new Set());
  };

  const handleDelete = (id: string) => {
    setClientToDelete(id);
    setDeleteDialogOpen(true);
  };

  const openBulkDelete = () => {
    if (selectedClients.size === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    try {
      setIsDeleting(true);
  await apiFetch(`/admin/clients/${clientToDelete}`, { method: 'DELETE' });
      await fetchClients();
      addNotification({ type: 'success', title: 'Cliente', message: 'Cliente excluído com sucesso' });
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Erro', message: e?.message || 'Falha ao excluir' });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedClients.size === 0) return;
    const ids = Array.from(selectedClients);
    try {
      setIsBulkDeleting(true);
      const results = await Promise.allSettled(
  ids.map((id) => apiFetch(`/admin/clients/${id}`, { method: 'DELETE' }))
      );

      const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
      if (failed.length > 0) {
        addNotification({ type: 'error', title: 'Erro', message: `Falha ao excluir ${failed.length} de ${ids.length} clientes.` });
      } else {
        addNotification({ type: 'success', title: 'Clientes', message: `${ids.length} clientes excluídos com sucesso.` });
      }

      // Refresh list and clear selection
      await fetchClients();
      setSelectedClients(new Set());
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Erro', message: e?.message || 'Falha ao excluir clientes' });
    } finally {
      setIsBulkDeleting(false);
      setBulkDeleteDialogOpen(false);
    }
  };

  const handleExport = async () => {
    try {
      const csvHeader = 'Nome,Email,Telefone,Status,Reservas,Total,CriadoEm\\n';
      const csvBody = clients
        .map((c) => [
          `\"${c.name}\"`,
          c.email,
          c.phone || '',
          c.status || '',
          String(c.totalBookings || 0),
          String(c.totalSpent || 0),
          format(new Date(c.createdAt), 'yyyy-MM-dd', { locale: ptBR }),
        ].join(','))
        .join('\\n');

      const blob = new Blob([csvHeader + csvBody], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clientes_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      addNotification({ type: 'error', title: 'Erro', message: 'Falha ao exportar CSV' });
    }
  };

  const analytics = useMemo(() => ({
    totalActive: clients.filter((c) => (c.status || '').toUpperCase() === 'ACTIVE').length,
    totalSuspended: clients.filter((c) => (c.status || '').toUpperCase() === 'SUSPENDED').length,
    newThisMonth: clients.filter((c) => {
      const d = new Date(c.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
    averageBookings: clients.length > 0 ? (clients.reduce((acc, c) => acc + (c.totalBookings || 0), 0) / clients.length) : 0,
    totalRevenue: clients.reduce((acc, c) => acc + (c.totalSpent || 0), 0),
  }), [clients]);

  const filteredAndSortedClients = clients; // server already paginates/sorts; keep client-side placeholder
  const realTotalClients = totalClients;

  if (error) {
    return (
      <AdminLayout title="Clientes" breadcrumbs={[{ name: 'Admin' }, { name: 'Clientes' }]}>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="text-destructive text-xl mb-4">Erro ao carregar clientes</div>
            <Button onClick={fetchClients} variant="primary">Tentar novamente</Button>
          </div>
        </div>
      </AdminLayout>
    );
  }
  return (
    <AdminLayout title="Clientes" breadcrumbs={[{ name: 'Admin' }, { name: 'Clientes' }]}>
  <div className="flex items-center justify-between mb-6 max-w-full overflow-x-hidden">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie seus clientes</p>
        </div>
  <div className="flex gap-2 flex-wrap justify-end">
          <Button onClick={handleExport} variant="outline"><Download className="h-4 w-4 mr-2" /> Exportar CSV</Button>
          <Button onClick={openBulkDelete} variant="danger" disabled={selectedClients.size === 0}>
            <Trash2 className="h-4 w-4 mr-2" />
            {selectedClients.size > 0 ? `Excluir (${selectedClients.size}) selecionados` : 'Excluir selecionados'}
          </Button>
          <Button onClick={handleCreate} variant="primary"><Plus className="h-4 w-4 mr-2" /> Novo Cliente</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatsCard title="Total" value={realTotalClients} icon={<Users className="h-5 w-5" />} />
        <StatsCard title="Ativos" value={analytics.totalActive} icon={<Users className="h-5 w-5" />} />
        <StatsCard title="Suspensos" value={analytics.totalSuspended} icon={<Users className="h-5 w-5" />} />
        <StatsCard title="Novos (Mês)" value={analytics.newThisMonth} icon={<Calendar className="h-5 w-5" />} />
        <StatsCard title="Média Reservas" value={analytics.averageBookings.toFixed(1)} icon={<Calendar className="h-5 w-5" />} />
        <StatsCard title="Receita Total" value={formatPrice(analytics.totalRevenue)} icon={<Calendar className="h-5 w-5" />} />
      </div>

      <SimpleCard className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input type="text" value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)} aria-label="Buscar clientes" title="Buscar clientes" placeholder="Nome, email ou telefone..." className="pl-10 w-full" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Status</label>
            <Select value={selectedStatus} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleStatusFilter(e.target.value as '' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED')} title="Filtrar por status" aria-label="Filtrar por status">
              {STATUS_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Ordenar por</label>
            <Select value={sortBy} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as keyof User)} title="Ordenar por campo" aria-label="Ordenar por campo">
              {SORT_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={() => { setSearchTerm(''); setSelectedStatus(''); setSortBy('name'); setSortOrder('asc'); setCurrentPage(1); }} variant="outline" className="w-full">Limpar Filtros</Button>
          </div>
        </div>
      </SimpleCard>

      <SimpleCard className="overflow-hidden">
        <div className="w-full overflow-x-hidden">
          <table className="w-full table-fixed divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectedClients.size === filteredAndSortedClients.length && filteredAndSortedClients.length > 0}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSelectAll(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                    title="Selecionar todos"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer w-[300px]" onClick={() => handleSort('name')}>
                  Cliente {sortBy === 'name' && <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer w-[110px]" onClick={() => handleSort('status')}>
                  Status {sortBy === 'status' && <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer w-[96px]" onClick={() => handleSort('totalBookings')}>
                  Reservas {sortBy === 'totalBookings' && <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer w-[120px]" onClick={() => handleSort('totalSpent')}>
                  Total Gasto {sortBy === 'totalSpent' && <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer w-[140px]" onClick={() => handleSort('createdAt')}>
                  Cadastro {sortBy === 'createdAt' && <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px]">Ações</th>
              </tr>
            </thead>

            <tbody className="bg-card divide-y divide-border">
              {filteredAndSortedClients.map((client) => (
                <tr key={client.id} className="hover:bg-muted">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedClients.has(client.id)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSelectClient(client.id, e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                      title={`Selecionar cliente ${client.name}`}
                    />
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {client.avatar ? (
                          <img className="h-10 w-10 rounded-full object-cover" src={client.avatar} alt={client.name || 'Avatar'} />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted-foreground flex items-center justify-center text-sm font-medium text-white">
                            {client.name ? client.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">{client.name}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[220px]">{client.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm">{client.status}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{client.totalBookings ?? 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{formatPrice(client.totalSpent || 0)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{format(new Date(client.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button onClick={() => handleEdit(client)} variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button onClick={() => handleDelete(client.id)} variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="bg-card px-4 py-3 flex items-center justify-between border-t border-border sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} variant="outline">Anterior</Button>
              <Button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} variant="outline">Próximo</Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mostrando <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + (clients.length > 0 ? 1 : 0)}</span> a <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + clients.length}</span> de <span className="font-medium">{totalClients}</span> resultados</p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <Button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} variant="outline" className="rounded-l-md">Anterior</Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => { const page = i + 1; return (
                    <Button key={page} onClick={() => setCurrentPage(page)} variant={currentPage === page ? 'primary' : 'outline'} className="border-l-0">{page}</Button>
                  );})}
                  <Button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} variant="outline" className="rounded-r-md border-l-0">Próximo</Button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </SimpleCard>

      {filteredAndSortedClients.length === 0 && !loading && (
        <SimpleCard>
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">Nenhum cliente encontrado</h3>
            <p className="mt-1 text-sm text-muted-foreground">{searchTerm || selectedStatus ? 'Tente ajustar os filtros de busca.' : 'Comece criando um novo cliente.'}</p>
            {!searchTerm && !selectedStatus && (
              <div className="mt-6">
                <Button onClick={handleCreate} variant="primary"><Plus className="h-4 w-4 mr-2" /> Novo Cliente</Button>
              </div>
            )}
          </div>
        </SimpleCard>
      )}

      <ConfirmDialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={confirmDelete} title="Confirmar Exclusão" message="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita." confirmText="Excluir" confirmVariant="danger" isLoading={isDeleting} />

  <ConfirmDialog isOpen={bulkDeleteDialogOpen} onClose={() => setBulkDeleteDialogOpen(false)} onConfirm={confirmBulkDelete} title="Confirmar Exclusão em Massa" message={`Tem certeza que deseja excluir ${selectedClients.size} clientes selecionados? Esta ação não pode ser desfeita.`} confirmText="Excluir selecionados" confirmVariant="danger" isLoading={isBulkDeleting} />

      {(loading || isDeleting) && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6">
            <BrandLoader size={100} label={isDeleting ? 'Excluindo cliente...' : 'Processando...'} />
          </div>
        </div>
      )}

      {/* Client Modal */}
      <Modal
         isOpen={isModalOpen}
         onClose={() => setIsModalOpen(false)}
         title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
         className="max-w-2xl"
      >
        <ClientForm 
            initialData={editingClient}
            onSuccess={handleModalSuccess}
            onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </AdminLayout>
  );
};

export default ClientListPage;
export { ClientListPage };
