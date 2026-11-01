import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Trash2,
  Edit2,
  Plus,
  Tag,
  XCircle,
  Search
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '../../services/api';
import { asArray } from '../../utils/normalize';
import type { Category } from '../../types/types';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  Button,
  Card,
  Modal,
  ConfirmModal,
  Alert,
  Input,
} from '@/components/ui/StandardComponents';
import CategoryForm from '../../components/forms/CategoryFormPage';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';

const PAGE_TITLE = 'Categorias';
const BREADCRUMBS = [{ name: 'Admin', href: '/admin/painel' }, { name: 'Categorias' }];

export const CategoryListPage = () => {
  const { addNotification } = useNotifications();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const { guardClose, isConfirmOpen, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard(isFormDirty);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/categories');
      setCategories(asArray<Category>(data));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a lista de categorias.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleDeleteClick = (id: string) => {
    setCategoryToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      setIsDeleting(true);
      await apiFetch(`/categories/${categoryToDelete}`, { method: 'DELETE' });

      await fetchCategories();
      addNotification({
        type: 'success',
        title: 'Sucesso',
        message: 'Categoria excluída com sucesso.'
      });
      setIsDeleteModalOpen(false);
    } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: err instanceof Error ? err.message : 'Falha ao excluir categoria.'
      });
    } finally {
      setIsDeleting(false);
      setCategoryToDelete(null);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsFormModalOpen(true);
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  if (loading && categories.length === 0) {
    return (
      <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Carregando categorias…" />
        </div>
      </AdminLayout>
    );
  }

  const loadFailed = !!error && categories.length === 0;

  return (
    <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Tag className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Categorias de itens</h2>
              <p className="text-sm text-muted-foreground">Organize o inventário em categorias.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCreate} className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5" /> Nova Categoria
            </Button>
          </div>
        </div>

        {/* Estatística — os cards "Média de Itens/Cat" ("--") e "Pendentes" (0) eram fixos e foram removidos. */}
        <Card className="p-4 bg-primary/5 border-primary/10 sm:max-w-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total de categorias</p>
              <p className="text-xl font-black text-foreground">{categories.length}</p>
            </div>
          </div>
        </Card>

        {/* Busca */}
        <Card className="p-4 bg-card/50 border-border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Buscar categoria"
                placeholder="Buscar categoria ou descrição..."
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

        {error && (
          <Alert
            variant="error"
            title="Erro ao carregar as categorias"
            action={<Button size="sm" variant="outline" onClick={fetchCategories}>Tentar de novo</Button>}
          >
            {error}
          </Alert>
        )}

        {/* Tabela */}
        {!loadFailed && (
        <Card className="overflow-hidden border-border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-4 text-xs font-bold text-right text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-20 text-center">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                        <Tag className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">Nenhuma categoria encontrada</h3>
                      <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">Ajuste a busca ou cadastre uma nova categoria.</p>
                      <Button variant="outline" size="sm" className="mt-6" onClick={() => setSearchTerm('')}>
                        Limpar filtros
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((category) => (
                    <tr key={category.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                            {category.imageUrl ? (
                              <img src={category.imageUrl} alt={category.name} className="h-full w-full object-cover" />
                            ) : (
                              <Tag className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{category.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">#{category.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-muted-foreground max-w-md line-clamp-1">
                          {category.description || <span className="italic">Sem descrição</span>}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1.5 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(category)}
                            className="h-8 w-8"
                            title="Editar categoria"
                            aria-label={`Editar ${category.name}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeleteClick(category.id)}
                            className="h-8 w-8"
                            title="Excluir categoria"
                            aria-label={`Excluir ${category.name}`}
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
        title={editingCategory ? 'Editar categoria' : 'Nova categoria'}
        size="md"
      >
        <CategoryForm
          initialData={editingCategory}
          onDirtyChange={setIsFormDirty}
          onSuccess={() => {
            setIsFormModalOpen(false);
            fetchCategories();
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
        title="Excluir categoria?"
        message="Esta ação é definitiva. Os itens desta categoria perdem a classificação principal."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Excluir"
        cancelText="Manter"
      />
    </AdminLayout>
  );
};

export default CategoryListPage;
