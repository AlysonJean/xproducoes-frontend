import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Briefcase,
  CheckCircle2,
  Search,
  XCircle,
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { collaboratorFunctionsAPI } from '@/services/api';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { BrandLoader } from '../../components/ui/BrandLoader';
import {
  Button,
  Card,
  Modal,
  ConfirmModal,
  Input,
  Badge,
  Grid,
  Alert
} from '../../components/ui/StandardComponents';
import { CollaboratorFunctionForm } from '@/components/forms/CollaboratorFunctionForm';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { CollaboratorFunction } from '@/types/types';
import { logger } from '../../utils/logger';

const PAGE_TITLE = 'Funções';
const BREADCRUMBS = [
  { name: 'Admin', href: '/admin/painel' },
  { name: 'Colaboradores', href: '/admin/colaboradores' },
  { name: 'Funções' },
];

// Mensagem do backend (axios) quando houver; senão, um texto genérico — antes toda falha virava
// "possui colaboradores vinculados", mesmo quando o motivo era outro.
const apiErrorMessage = (err: unknown, fallback: string) => {
  const data = (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
  return data?.message || data?.error || fallback;
};

export const AdminCollaboratorFunctionsPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const [functions, setFunctions] = useState<CollaboratorFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingFunction, setEditingFunction] = useState<CollaboratorFunction | null>(null);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormDirty, setIsFormDirty] = useState(false);
  const { guardClose, isConfirmOpen, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard(isFormDirty);

  const fetchFunctions = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await collaboratorFunctionsAPI.getAll();
      const raw = resp.data;
      setFunctions(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []);
      setLoadError(null);
    } catch (err: unknown) {
      logger.error('Erro', 'AdminCollaboratorFunctionsPage', err);
      setLoadError(apiErrorMessage(err, 'Não foi possível carregar as funções.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFunctions();
  }, [fetchFunctions]);

  const handleCreate = () => {
    setEditingFunction(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (func: CollaboratorFunction) => {
    setEditingFunction(func);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setIdToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!idToDelete) return;
    try {
      setIsDeleting(true);
      await collaboratorFunctionsAPI.delete(idToDelete);
      addNotification({
        type: 'success',
        title: 'Função excluída',
        message: 'A função foi excluída.',
      });
      fetchFunctions();
      setIsDeleteModalOpen(false);
    } catch (err: unknown) {
      logger.error('Erro', 'AdminCollaboratorFunctionsPage', err);
      addNotification({
        type: 'error',
        title: 'Não foi possível excluir',
        message: apiErrorMessage(err, 'Não foi possível excluir a função. Verifique se há colaboradores vinculados a ela.'),
      });
    } finally {
      setIsDeleting(false);
      setIdToDelete(null);
    }
  };

  const filteredFunctions = useMemo(() => {
    return functions.filter(f =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [functions, searchTerm]);

  const stats = useMemo(() => ({
    total: functions.length,
    active: functions.filter(f => f.active).length,
  }), [functions]);

  if (loading && functions.length === 0) {
    return (
      <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Carregando funções…" />
        </div>
      </AdminLayout>
    );
  }

  const loadFailed = !!loadError && functions.length === 0;

  return (
    <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Funções da equipe</h2>
              <p className="text-sm text-muted-foreground">Defina e gerencie as especialidades técnicas da sua equipe.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCreate} className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5" /> Nova Função
            </Button>
          </div>
        </div>

        {/* Estatísticas — o card "Utilização Global: Alta" era um texto fixo e foi removido. */}
        <Grid columns={{ sm: 1, md: 2 }} gap={4}>
          <Card className="p-4 bg-primary/5 border-primary/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Funções</p>
                <p className="text-xl font-black text-foreground">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-success/5 border-success/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Ativas</p>
                <p className="text-xl font-black text-foreground">{stats.active}</p>
              </div>
            </div>
          </Card>
        </Grid>

        {loadError && (
          <Alert
            variant="error"
            title="Erro ao carregar as funções"
            action={<Button size="sm" variant="outline" onClick={fetchFunctions}>Tentar de novo</Button>}
          >
            {loadError}
          </Alert>
        )}

        {/* Busca */}
        <Card className="p-4 bg-card/50 border-border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Buscar função"
                placeholder="Buscar por nome da função ou descrição..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setSearchTerm('')} title="Limpar filtro" aria-label="Limpar filtro">
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Tabela */}
        {!loadFailed && (
        <Card className="overflow-hidden border-border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Função</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-right text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredFunctions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                        <Briefcase className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">Nenhuma função encontrada</h3>
                      <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">Ajuste a busca ou cadastre uma nova função para a equipe.</p>
                      <Button variant="outline" size="sm" className="mt-6" onClick={() => setSearchTerm('')}>
                        Limpar filtros
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredFunctions.map((func) => (
                    <tr key={func.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-border flex items-center justify-center overflow-hidden flex-shrink-0 mt-1">
                            <Briefcase className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{func.name}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-1">Ref. {func.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {func.description || 'Sem descrição'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                          <Badge variant={func.active ? 'success' : 'ghost'}>
                              {func.active ? 'Ativa' : 'Inativa'}
                          </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1.5 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(func)}
                            className="h-8 w-8"
                            title="Editar função"
                            aria-label={`Editar ${func.name}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeleteClick(func.id)}
                            className="h-8 w-8"
                            title="Excluir função"
                            aria-label={`Excluir ${func.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
        )}
      </div>

      {/* Formulário */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => guardClose(() => setIsFormModalOpen(false))}
        title={editingFunction ? 'Editar função' : 'Nova função'}
        size="md"
      >
        <CollaboratorFunctionForm
          initialData={editingFunction || undefined}
          onDirtyChange={setIsFormDirty}
          onSuccess={() => {
            setIsFormModalOpen(false);
            fetchFunctions();
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

      {/* Confirmação de exclusão */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir função?"
        message="A função sai da lista de especialidades. Antes de excluir, confira se nenhum colaborador está vinculado a ela."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Excluir"
        cancelText="Manter"
      />
    </AdminLayout>
  );
};

export default AdminCollaboratorFunctionsPage;
