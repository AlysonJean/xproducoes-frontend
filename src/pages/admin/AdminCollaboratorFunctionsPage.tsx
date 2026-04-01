import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Briefcase,
  TrendingUp,
  Activity,
  Search,
  XCircle,
  MoreHorizontal,
  ArrowUpDown
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
  Grid
} from '../../components/ui/StandardComponents';
import { CollaboratorFunctionForm } from '@/components/forms/CollaboratorFunctionForm';
import { CollaboratorFunction } from '@/types/types';

export const AdminCollaboratorFunctionsPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const [functions, setFunctions] = useState<CollaboratorFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingFunction, setEditingFunction] = useState<CollaboratorFunction | null>(null);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchFunctions = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await collaboratorFunctionsAPI.getAll();
      const raw = resp.data;
      setFunctions(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []);
    } catch (err: unknown) {
      console.error(err);
      addNotification({
        type: 'error',
        title: 'Falha de Sincronização',
        message: 'Não foi possível carregar o catálogo de funções.',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

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
        title: 'Função Removida',
        message: 'O cargo foi excluído do sistema com sucesso.',
      });
      fetchFunctions();
      setIsDeleteModalOpen(false);
    } catch (err: unknown) {
      console.error(err);
      addNotification({
        type: 'error',
        title: 'Conflito de Dependência',
        message: 'Esta função possui colaboradores vinculados e não pode ser removida no momento.',
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
    utilization: 'Alta'
  }), [functions]);

  if (loading && functions.length === 0) {
    return (
      <AdminLayout title="Funções" breadcrumbs={[{ name: 'Admin' }, { name: 'Colaboradores' }]}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Mapeando hierarquia de talentos..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Funções" breadcrumbs={[{ name: 'Admin' }, { name: 'Colaboradores', href: '/admin/colaboradores' }, { name: 'Funções' }]}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Matriz de Cargos</h2>
              <p className="text-sm text-muted-foreground">Defina e gerencie as especialidades técnicas da sua equipe.</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleCreate} className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5" /> Nova Função
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <Grid columns={{ sm: 1, md: 3 }} gap={4}>
          <Card className="p-4 bg-primary/5 border-primary/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Especialidades</p>
                <p className="text-xl font-black text-foreground">{stats.total}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-emerald-500/5 border-emerald-500/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Status Operacional</p>
                <p className="text-xl font-black text-foreground">{stats.active} Ativas</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-blue-500/5 border-blue-500/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Utilização Global</p>
                <p className="text-xl font-black text-foreground">{stats.utilization}</p>
              </div>
            </div>
          </Card>
        </Grid>

        {/* Filters and Search */}
        <Card className="p-4 bg-card/50 border-border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome da função ou descrição..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setSearchTerm('')} title="Limpar Filtro">
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Functions Table */}
        <Card className="overflow-hidden border-border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center gap-1 cursor-pointer">
                      Cargo / Função <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Escopo Sugerido</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-right text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredFunctions.map((func) => (
                  <tr key={func.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-border flex items-center justify-center overflow-hidden flex-shrink-0 mt-1">
                          <Briefcase className="h-5 w-5 text-primary/60" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{func.name}</p>
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tight mt-1">Ref. {func.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-muted-foreground font-medium line-clamp-1 italic">
                        {func.description || 'Definição simplificada do cargo'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                        <Badge variant={func.active ? 'success' : 'outline'} className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5">
                            {func.active ? 'OPERANTE' : 'INATIVO'}
                        </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(func)}
                          className="h-8 w-8"
                          title="Ajustar Matriz"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteClick(func.id)}
                          className="h-8 w-8"
                          title="Remover Cargo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 border-transparent">
                           <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredFunctions.length === 0 && !loading && (
            <div className="py-24 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6 text-muted-foreground/20 ring-8 ring-muted/10">
                <Briefcase className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Nenhuma função localizada</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">Personalize sua busca ou cadastre novas habilidades técnicas para sua equipe.</p>
              <Button variant="outline" className="mt-6" onClick={() => setSearchTerm('')}>
                Limpar Filtros
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingFunction ? 'Modificar Parâmetros de Cargo' : 'Registrar Nova Expertise'}
        size="md"
      >
        <CollaboratorFunctionForm
          initialData={editingFunction || undefined}
          onSuccess={() => {
            setIsFormModalOpen(false);
            fetchFunctions();
          }}
          onCancel={() => setIsFormModalOpen(false)}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Expurgar Função do Sistema?"
        message="Esta ação retirará o cargo da matriz de especialidades. Certifique-se de que nenhum talento esteja vinculado a esta função antes de prosseguir."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Confirmar Exclusão"
        cancelText="Manter Registro"
      />
    </AdminLayout>
  );
};

export default AdminCollaboratorFunctionsPage;
