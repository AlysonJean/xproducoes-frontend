import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Trash2,
  Users,
  DollarSign,
  Edit2,
  Mail,
  UserPlus,
  Settings,
  XCircle,
  Briefcase,
  KeyRound,
} from 'lucide-react';
import { useCollaborators } from '../../hooks';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { useNotifications } from '../../contexts/NotificationContext';
import { useModal } from '@/components/modals/ModalContext';
import { api, apiFetch } from '@/services/api';
import type { CollaboratorDashboard } from '../../types/types';
import { toNumber } from '../../utils/typeSafeFormatters';
import { AdminLayout } from '@/components/admin/AdminLayout';
import {
  Button,
  buttonVariants,
  Input,
  Select,
  Modal,
  ConfirmModal,
  Card,
  Badge,
  Grid,
  Alert,
  Pagination,
} from '@/components/ui/StandardComponents';
import { formatPrice } from '@/utils/formatPrice';
import { COLLABORATOR_ROLE_OPTIONS, collaboratorRoleLabel } from '@/utils/collaboratorRoles';
import { CollaboratorForm } from '@/components/forms/CollaboratorFormPage';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

const ITEMS_PER_PAGE = 10;

// Título e breadcrumb constantes (antes trocavam de "Capital Humano" para "Gestão de Talentos"
// quando os dados chegavam).
const PAGE_TITLE = 'Colaboradores';
const BREADCRUMBS = [{ name: 'Admin', href: '/admin/painel' }, { name: 'Colaboradores' }];

// Funções: lista única que espelha o enum do backend (antes havia VIDEOGRAPHER/EDITOR locais e
// faltavam as demais funções que o backend aceita).
const ROLE_FILTER_OPTIONS = [{ value: 'all', label: 'Todas as funções' }, ...COLLABORATOR_ROLE_OPTIONS];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'INACTIVE', label: 'Inativo' },
];

// D3: "Aguardando ativação" e "Reenviar link de acesso" valem só para conta de colaborador, ativa, que ainda
// não criou a senha pelo link: as mesmas regras com que o servidor aceita o reenvio (POST
// /collaborators/:id/resend-access responde 409 para conta já ativada, conta de admin ou conta desativada).
// O painel do colaborador cria um perfil para o admin que o abre; sem esta regra, esse perfil podia aparecer
// com o selo e com um botão que sempre falha.
const isAwaitingActivation = (c: CollaboratorDashboard) =>
  c.user?.verified === false &&
  (c.user.role === undefined || c.user.role === 'COLLABORATOR') &&
  c.user.isActive !== false;

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
  const [isFormDirty, setIsFormDirty] = useState(false);
  const { guardClose, isConfirmOpen, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard(isFormDirty);
  const [collaboratorToDelete, setCollaboratorToDelete] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

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
    // Funções distintas presentes na equipe (antes: tamanho fixo da lista local de rótulos = 5).
    roles: new Set(collaborators.map(c => c.role).filter(Boolean)).size,
    earnings: collaborators.reduce((acc, c) => acc + toNumber(c.totalEarnings), 0),
  }), [collaborators]);

  const filteredCollaborators = useMemo(() => {
    return collaborators.filter(c => {
      const searchStr = (c.name + c.email + (c.role || '') + collaboratorRoleLabel(c.role)).toLowerCase();
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

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedRole('all');
    setSelectedStatus('all');
    setCurrentPage(1);
  };

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
        title: 'Colaborador removido',
        message: 'O cadastro do colaborador foi removido.',
      });
      setIsDeleteModalOpen(false);
    } catch {
      addNotification({
        type: 'error',
        title: 'Não foi possível remover',
        message: 'Não foi possível remover o colaborador agora. Tente de novo.',
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
          title: 'Convite enviado',
          message: 'O link de acesso foi enviado para o e-mail do colaborador.'
        });
      }
      setInviteEmail('');
      setIsInviteModalOpen(false);
    } catch {
      addNotification({ type: 'error', title: 'Convite não enviado', message: 'Não foi possível enviar o convite. Tente de novo.' });
    } finally {
      setInviteLoading(false);
    }
  };

  // D3 (aprovada em 02/11/2026): quem ainda não criou a senha ("Aguardando ativação") recebe um link de
  // acesso novo, de 72 h; o anterior deixa de valer. A janela do convite mostra o link para copiar e, se o
  // e-mail não saiu, avisa para mandar pelo WhatsApp. Conta já ativada: o servidor recusa (409) e a
  // mensagem dele aparece. Um reenvio por vez: com dois cliques, a janela podia ficar com um link já
  // derrubado pelo outro pedido (mesmo achado do "Reenviar convite" do cliente).
  const handleResendAccess = async (collaborator: CollaboratorDashboard) => {
    if (resendingId) return;
    setResendingId(collaborator.id);
    try {
      const result = await apiFetch<{ inviteUrl?: string; emailSent?: boolean }>(
        `/collaborators/${collaborator.id}/resend-access`,
        { method: 'POST' },
      );
      if (result?.inviteUrl) {
        openModal('invite', {
          inviteUrl: result.inviteUrl,
          notice: result.emailSent === false
            ? 'O e-mail não foi enviado. O link anterior deixou de valer: copie este link e mande ao colaborador, por WhatsApp por exemplo.'
            : undefined,
        });
      }
      if (result?.emailSent) {
        addNotification({
          type: 'success',
          title: 'Link reenviado',
          message: `Novo link de acesso enviado para ${collaborator.email}. O link anterior deixou de valer.`,
        });
      }
    } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Link não reenviado',
        message: err instanceof Error && err.message ? err.message : 'Não foi possível reenviar o link de acesso. Tente de novo.',
      });
    } finally {
      setResendingId(null);
    }
  };

  if (loading && collaborators.length === 0) {
    return (
      <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Carregando colaboradores…" />
        </div>
      </AdminLayout>
    );
  }

  // Erro de carga sem dados: mostra o erro (com nova tentativa) em vez de uma lista "vazia".
  const loadFailed = !!error && collaborators.length === 0;

  return (
    <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">Equipe técnica</h2>
                <Badge variant="outline">{stats.total} cadastrados</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Cadastro, funções e convites da equipe.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/colaboradores/funcoes"
              className={buttonVariants({ variant: 'outline', size: 'sm', className: 'gap-2' })}
            >
              <Settings className="h-4 w-4" /> Funções
            </Link>
            <Button variant="outline" size="sm" onClick={() => setIsInviteModalOpen(true)} className="gap-2">
              <Mail className="h-4 w-4" /> Convidar
            </Button>
            <Button size="sm" onClick={handleCreate} className="gap-2 shadow-lg shadow-primary/20">
              <UserPlus className="h-4 w-4" /> Novo colaborador
            </Button>
          </div>
        </div>

        {/* Estatísticas */}
        <Grid columns={{ sm: 1, md: 3 }} gap={6}>
          <Card className="p-4 bg-primary/5 border-primary/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Colaboradores</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs font-medium text-success">{stats.active} ativos</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-info/5 border-info/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Funções na equipe</p>
                <p className="text-2xl font-bold text-foreground">{stats.roles}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-success/5 border-success/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ganhos acumulados</p>
                <p className="text-2xl font-bold text-foreground">{formatPrice(stats.earnings)}</p>
              </div>
            </div>
          </Card>
        </Grid>

        {error && (
          <Alert
            variant="error"
            title="Não foi possível carregar os colaboradores"
            action={<Button size="sm" variant="outline" onClick={() => fetchCollaborators()}>Tentar de novo</Button>}
          >
            {error}
          </Alert>
        )}

        {/* Filtros */}
        <Card className="p-4 border-dashed border-2 bg-muted/20">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Buscar colaborador"
                placeholder="Buscar por nome, e-mail ou função..."
                className="pl-10 h-10 bg-card"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="w-full sm:w-52">
                <Select
                  aria-label="Filtrar por função"
                  size="sm"
                  className="bg-card"
                  value={selectedRole}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setSelectedRole(e.target.value); setCurrentPage(1); }}
                  options={ROLE_FILTER_OPTIONS}
                />
              </div>
              <div className="w-full sm:w-44">
                <Select
                  aria-label="Filtrar por status"
                  size="sm"
                  className="bg-card"
                  value={selectedStatus}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                  options={STATUS_OPTIONS}
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

        {/* Tabela */}
        {!loadFailed && (
        <Card className="overflow-hidden border-border shadow-sm animate-in fade-in zoom-in-95 duration-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Colaborador</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Função</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Valor/hora</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Eventos</th>
                  <th className="px-6 py-4 text-xs font-bold text-right text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedCollaborators.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">Nenhum colaborador encontrado</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">Ajuste a busca ou os filtros para encontrar o que procura.</p>
                      <Button variant="outline" size="sm" className="mt-6" onClick={resetFilters}>
                        Limpar filtros
                      </Button>
                    </td>
                  </tr>
                ) : (
                  paginatedCollaborators.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-primary uppercase">{c.name.charAt(0)}</span>
                            </div>
                            <div className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card ${c.status === 'ACTIVE' ? 'bg-success' : 'bg-muted-foreground'}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{c.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="primary">{collaboratorRoleLabel(c.role)}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={c.status === 'ACTIVE' ? 'success' : 'ghost'}>
                            {c.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                          </Badge>
                          {/* D3: conta criada pelo painel que ainda não criou a senha pelo link. */}
                          {isAwaitingActivation(c) && <Badge variant="warning">Aguardando ativação</Badge>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {/* D3: sem valor definido aparece "—" (antes: R$ 0,00, como se o valor fosse zero). */}
                        {c.hourlyRate == null ? (
                          <span className="text-sm text-muted-foreground">
                            <span aria-hidden="true">—</span>
                            <span className="sr-only">Sem valor definido</span>
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-foreground">{formatPrice(c.hourlyRate)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-muted border border-border text-sm font-bold text-foreground">
                          {c.totalEvents || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          {isAwaitingActivation(c) && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => handleResendAccess(c)}
                              disabled={resendingId === c.id}
                              title="Reenviar link de acesso"
                              aria-label={`Reenviar link de acesso para ${c.name}`}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => handleEdit(c)}
                            title="Editar"
                            aria-label={`Editar ${c.name}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => handleDeleteClick(c.id)}
                            title="Remover"
                            aria-label={`Remover ${c.name}`}
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

          {totalPages > 1 && (
            <div className="px-4 pb-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={ITEMS_PER_PAGE}
                totalItems={filteredCollaborators.length}
              />
            </div>
          )}
        </Card>
        )}
      </div>

      <Modal
        isOpen={isFormModalOpen}
        onClose={() => guardClose(() => setIsFormModalOpen(false))}
        title={editingCollaborator ? `Editar colaborador: ${editingCollaborator.name}` : 'Novo colaborador'}
        size="lg"
      >
        <CollaboratorForm
          initialData={editingCollaborator}
          onDirtyChange={setIsFormDirty}
          onSuccess={() => {
            setIsFormModalOpen(false);
            fetchCollaborators();
            addNotification({
              type: 'success',
              title: 'Colaborador salvo',
              message: `O cadastro foi ${editingCollaborator ? 'atualizado' : 'criado'}.`
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

      <Modal
         isOpen={isInviteModalOpen}
         onClose={() => setIsInviteModalOpen(false)}
         title="Convidar colaborador"
         size="sm"
      >
        <div className="space-y-6 py-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
                A pessoa recebe um link para completar o cadastro profissional e aceitar os termos de trabalho.
            </p>
            <Input
              label="E-mail profissional"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="nome@exemplo.com"
            />
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={handleInvite}
                isLoading={inviteLoading}
                disabled={!inviteEmail}
                fullWidth
              >
                Enviar convite
              </Button>
              <Button variant="outline" onClick={() => setIsInviteModalOpen(false)} fullWidth>Cancelar</Button>
            </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Remover colaborador?"
        message="O colaborador será excluído junto com o histórico de eventos e pagamentos dele. Esta ação não pode ser desfeita."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Remover"
        cancelText="Manter"
      />
    </AdminLayout>
  );
};

export default AdminCollaboratorsPage;
