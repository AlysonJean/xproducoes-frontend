import React, { useState, useEffect } from 'react';
import { Search, Trash2, Users, TrendingUp, DollarSign, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCollaborators } from '../../hooks';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useNotifications } from '../../contexts/NotificationContext';
import { useModal } from '@/components/modals/ModalContext';
import { api } from '@/services/api';
import type { CollaboratorDashboard } from '../../types/types';
import AdminLayout from '@/components/admin/AdminLayout';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { formatPrice } from '@/utils/formatPrice';
import { SimpleCard, StatsCard } from '@/components/ui/Cards';
import { Modal } from '@/components/ui/StandardComponents';
import { CollaboratorForm } from '@/components/forms/CollaboratorFormPage';

// Defina ROLE_LABELS localmente se não existir em '../../types'
const ROLE_LABELS = {
  PHOTOGRAPHER: 'Fotógrafo',
  VIDEOGRAPHER: 'Videomaker',
  EDITOR: 'Editor',
  ASSISTANT: 'Assistente',
  OTHER: 'Outro',
};

// Enterprise constants following big players' patterns
const ITEMS_PER_PAGE = 10;
const ROLE_OPTIONS = [
  { value: '', label: 'Todos os papéis' },
  { value: 'PHOTOGRAPHER', label: 'Fotógrafo' },
  { value: 'VIDEOGRAPHER', label: 'Videomaker' },
  { value: 'EDITOR', label: 'Editor' },
  { value: 'ASSISTANT', label: 'Assistente' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'INACTIVE', label: 'Inativo' },
];

export const AdminCollaboratorsPage: React.FC = () => {
  // Local state following React best practices
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<'ACTIVE' | 'INACTIVE' | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<CollaboratorDashboard | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collaboratorToDelete, setCollaboratorToDelete] = useState<string | null>(null);
  const [selectedCollaborators, setSelectedCollaborators] = useState<Set<string>>(new Set());

  // Enterprise hook with React Query patterns - adapted to current version
  const {
    collaborators: rawCollaborators,
    isLoading: loading,
    error,
    fetchCollaborators,
    deleteCollaborator,
  } = useCollaborators();

  useEffect(() => {
    fetchCollaborators();
  }, []);

  // Melhor prática: usar diretamente se já tem os campos necessários
  const collaborators: CollaboratorDashboard[] = (rawCollaborators ||
    []) as CollaboratorDashboard[];

  const totalPages = Math.ceil((collaborators.length || 0) / ITEMS_PER_PAGE);
  const totalCollaborators = collaborators.length || 0;
  const isDeleting = false; // Will be implemented with proper state management

  // Refetch function
  const refetch = fetchCollaborators;

  // Bulk update function (mock implementation)
  const bulkUpdate = async (_ids: string[], _updates: Record<string, unknown>) => {
    // TODO: Implementar chamada real de API para atualização em massa
    // Exemplo: await api.bulkUpdateCollaborators(ids, updates);
  };

  const handleCreate = () => {
    setEditingCollaborator(null);
    setIsModalOpen(true);
  };

  const handleEdit = (collaborator: CollaboratorDashboard) => {
    setEditingCollaborator(collaborator);
    setIsModalOpen(true);
  };

  const { addNotification } = useNotifications();
  const { openModal } = useModal();

  // State for invite modal input
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // Analytics calculation for dashboard
  const stats = {
    totalActive: collaborators.filter((c) => c.status === 'ACTIVE').length || 0,
    totalInactive: collaborators.filter((c) => c.status === 'INACTIVE').length || 0,
    totalEarnings: collaborators.reduce((acc, c) => acc + (c.totalEarnings || 0), 0) || 0,
  };

  // Event handlers following enterprise patterns
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleRoleFilter = (role: string | '') => {
    setSelectedRole(role);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: 'ACTIVE' | 'INACTIVE' | '') => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const handleDelete = (id: string) => {
    setCollaboratorToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!collaboratorToDelete) return;

    try {
      await deleteCollaborator(collaboratorToDelete);
      addNotification({
        type: 'success',
        title: 'Sucesso',
        message: 'Colaborador removido com sucesso!',
      });
    } catch {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Falha ao remover colaborador',
      });
    } finally {
      setDeleteDialogOpen(false);
      setCollaboratorToDelete(null);
    }
  };

  const handleSelectCollaborator = (id: string, selected: boolean) => {
    const newSelection = new Set(selectedCollaborators);
    if (selected) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedCollaborators(newSelection);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedCollaborators(new Set(collaborators?.map((c) => c.id) || []));
    } else {
      setSelectedCollaborators(new Set());
    }
  };

  const handleBulkStatusUpdate = async (status: 'ACTIVE' | 'INACTIVE') => {
    if (selectedCollaborators.size === 0) return;

    try {
      await bulkUpdate(Array.from(selectedCollaborators), { status });
      addNotification({
        type: 'success',
        title: 'Sucesso',
        message: `${selectedCollaborators.size} colaborador(es) atualizados com sucesso!`,
      });
      setSelectedCollaborators(new Set());
    } catch {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Falha ao atualizar colaboradores',
      });
    }
  };

  // Render loading state
  if (loading && !collaborators) {
    return (
      <AdminLayout title="Colaboradores" breadcrumbs={[{ name: 'Admin' }, { name: 'Colaboradores' }]}>
        <div className="flex items-center justify-center min-h-96">
          <BrandLoader size={120} label="Carregando colaboradores..." />
        </div>
      </AdminLayout>
    );
  }

  // Render error state
  if (error) {
    return (
      <AdminLayout title="Colaboradores" breadcrumbs={[{ name: 'Admin' }, { name: 'Colaboradores' }]}>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="text-destructive text-xl mb-4">Erro ao carregar colaboradores</div>
            <Button onClick={() => refetch()} variant="primary">
              Tentar novamente
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Colaboradores" breadcrumbs={[{ name: 'Admin' }, { name: 'Colaboradores' }]}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Colaboradores</h1>
            <p className="mt-1 text-sm text-muted-foreground">Gerencie sua equipe de colaboradores</p>
          </div>
          <div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.location.href = '/admin/colaboradores/funcoes'}>Gerenciar Funções</Button>
              <Button variant="primary" onClick={handleCreate}>Novo Colaborador</Button>
              <Button variant="outline" onClick={() => setInviteDialogOpen(true)}>Enviar Convite</Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Ativos"
            value={stats.totalActive}
            icon={<Users className="h-5 w-5" />}
          />
          <StatsCard
            title="Total"
            value={totalCollaborators}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          {/* Espaço reservado opcional para um quarto card no grid responsivo */}
          <StatsCard
            title="Faturamento Total"
            value={formatPrice(stats.totalEarnings)}
            icon={<DollarSign className="h-5 w-5" />}
          />
        </div>

        {/* Ações em massa e Filtros */}
        <SimpleCard className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              {selectedCollaborators.size > 0
                ? `${selectedCollaborators.size} selecionado(s)`
                : 'Nenhum colaborador selecionado'}
            </div>
            {selectedCollaborators.size > 0 && (
              <div className="flex gap-2">
                <Button onClick={() => handleBulkStatusUpdate('ACTIVE')} variant="outline" size="sm">
                  Ativar Selecionados
                </Button>
                <Button onClick={() => handleBulkStatusUpdate('INACTIVE')} variant="outline" size="sm">
                  Desativar Selecionados
                </Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2" htmlFor="search-colab">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="search-colab"
                  type="text"
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
                  placeholder="Nome, email ou especialidade..."
                  title="Buscar colaborador"
                  aria-label="Buscar colaborador"
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2" htmlFor="role-colab">
                Papel
              </label>
              <Select
                id="role-colab"
                value={selectedRole}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleRoleFilter(e.target.value as string | '')}
                title="Filtrar por papel"
                aria-label="Filtrar por papel"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2" htmlFor="status-colab">
                Status
              </label>
              <Select
                id="status-colab"
                value={selectedStatus}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleStatusFilter(e.target.value as 'ACTIVE' | 'INACTIVE' | '')}
                title="Filtrar por status"
                aria-label="Filtrar por status"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedRole('');
                  setSelectedStatus('');
                  setCurrentPage(1);
                }}
                variant="outline"
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </SimpleCard>

  {/* Tabela de Colaboradores */}
  <SimpleCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedCollaborators.size === collaborators.length &&
                        collaborators.length > 0
                      }
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleSelectAll(e.target.checked)
                      }
                      className="rounded border-border text-primary focus:ring-primary"
                      title="Selecionar todos os colaboradores"
                      aria-label="Selecionar todos os colaboradores"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Colaborador
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Papel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Valor/Hora
                  </th>
                  {/* Coluna de avaliação removida */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Eventos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Cadastrado em
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {collaborators?.map((collaborator) => (
                  <tr key={collaborator.id} className="hover:bg-muted">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedCollaborators.has(collaborator.id)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleSelectCollaborator(collaborator.id, e.target.checked)
                        }
                        className="rounded border-border text-primary focus:ring-primary"
                        title={`Selecionar colaborador ${collaborator.name}`}
                        aria-label={`Selecionar colaborador ${collaborator.name}`}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-white font-medium">
                            {collaborator.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">
                            {collaborator.name}
                          </div>
                          <div className="text-sm text-muted-foreground">{collaborator.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-primary">
                        {ROLE_LABELS[collaborator.role as keyof typeof ROLE_LABELS]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          collaborator.status === 'ACTIVE'
                            ? 'bg-success/10 text-success'
                            : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {collaborator.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {formatPrice(collaborator.hourlyRate || 0)}
                    </td>
                    {/* Coluna de avaliação removida */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {collaborator.totalEvents || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {format(new Date(collaborator.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          onClick={() => handleEdit(collaborator)}
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          onClick={() => handleDelete(collaborator.id)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
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

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="bg-card px-4 py-3 flex items-center justify-between border-t border-border sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <Button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                >
                  Anterior
                </Button>
                <Button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                >
                  Próximo
                </Button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Mostrando{' '}
                    <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> a{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * ITEMS_PER_PAGE, totalCollaborators)}
                    </span>{' '}
                    de <span className="font-medium">{totalCollaborators}</span> resultados
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <Button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      className="rounded-l-md"
                    >
                      Anterior
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          variant={currentPage === page ? 'primary' : 'outline'}
                          className="border-l-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                    <Button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      className="rounded-r-md border-l-0"
                    >
                      Próximo
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </SimpleCard>

        {/* Empty State */}
        {collaborators?.length === 0 && (
          <SimpleCard>
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">
                Nenhum colaborador encontrado
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm || selectedRole || selectedStatus
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Comece criando um novo colaborador.'}
              </p>
            </div>
          </SimpleCard>
        )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCollaborator ? 'Editar Colaborador' : 'Novo Colaborador'}
      >
        <CollaboratorForm
          initialData={editingCollaborator}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchCollaborators();
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
      
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este colaborador? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        confirmVariant="danger"
        isLoading={isDeleting}
      />

      {/* Invite Modal */}
      <Modal
         isOpen={inviteDialogOpen}
         onClose={() => setInviteDialogOpen(false)}
         title="Enviar Convite por E-mail"
         className="max-w-md"
      >
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground p-0">Digite o e-mail do colaborador que receberá o convite.</p>
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={async () => {
                  setInviteLoading(true);
                  try {
                    // Corrigido o endpoint para /collaborators/invite (sem /admin)
                    const resp = await api.post('/collaborators/invite', { email: inviteEmail });
                    const data = resp.data || {};
                    const inviteUrl = data.inviteUrl || data.registrationLink || '';
                    if (inviteUrl) {
                      // Open global InviteModal with returned inviteUrl
                      openModal('invite', { inviteUrl, tempPassword: data.tempPassword });
                    } else {
                      addNotification({ type: 'success', title: 'Convite enviado', message: 'Convite criado e e-mail enviado. O link foi enviado por e-mail.' });
                    }
                    setInviteEmail('');
                    setInviteDialogOpen(false);
                  } catch (err) {
                    addNotification({ type: 'error', title: 'Erro', message: 'Falha ao enviar convite' });
                  } finally {
                    setInviteLoading(false);
                  }
                }}
                isLoading={inviteLoading}
                disabled={inviteLoading || !inviteEmail}
              >
                Enviar Convite
              </Button>
            </div>
        </div>
      </Modal>
      
      {/* Loading overlay for actions */}
      {(loading || isDeleting) && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6">
            <BrandLoader size={100} label={isDeleting ? 'Excluindo colaborador...' : 'Processando...'} />
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
