/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Trash2, 
  Edit2, 
  Plus, 
  Tag, 
  Info,
  TrendingUp,
  XCircle,
  MoreHorizontal,
  ArrowUpDown,
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
  Grid
} from '@/components/ui/StandardComponents';
import CategoryForm from '../../components/forms/CategoryFormPage';

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

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/categories');
      setCategories(asArray<Category>(data));
      setError(null);
        } catch (err: any) {
      const msg = err?.message || 'Não foi possível carregar a lista de categorias.';
      setError(msg);
      addNotification({
        type: 'error',
        title: 'Erro',
        message: msg
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

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
        } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: err?.message || 'Falha ao excluir categoria.'
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
      <AdminLayout title="Categorias" breadcrumbs={[{ name: 'Admin' }, { name: 'Categorias' }]}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Catalogando categorias..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Categorias" breadcrumbs={[{ name: 'Admin' }, { name: 'Categorias' }]}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Tag className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Taxonomia de Itens</h2>
              <p className="text-sm text-muted-foreground">Estruture seu inventário com categorias inteligentes.</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleCreate} className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5" /> Nova Categoria
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <Grid columns={{ sm: 1, md: 3 }} gap={4}>
          <Card className="p-4 bg-primary/5 border-primary/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Tag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Total</p>
                <p className="text-xl font-black text-foreground">{categories.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-emerald-500/5 border-emerald-500/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Média de Itens/Cat</p>
                <p className="text-xl font-black text-foreground">--</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-amber-500/5 border-amber-500/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Pendentes</p>
                <p className="text-xl font-black text-foreground">0</p>
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
                placeholder="Buscar categoria ou descrição..."
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

        {error && (
          <Alert variant="error" title="Erro de Carregamento" description={error} />
        )}

        {/* Categories Table */}
        <Card className="overflow-hidden border-border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center gap-1 cursor-pointer">
                      Identificador <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Detalhes</th>
                  <th className="px-6 py-4 text-xs font-bold text-right text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCategories.map((category) => (
                  <tr key={category.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                          {category.imageUrl ? (
                            <img src={category.imageUrl} alt={category.name} className="h-full w-full object-cover" />
                          ) : (
                            <Tag className="h-6 w-6 text-muted-foreground/30" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{category.name}</p>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">#{category.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-muted-foreground max-w-md line-clamp-1 font-medium">
                        {category.description || (
                          <span className="opacity-30 flex items-center gap-1 italic">
                            <Info className="h-3 w-3" /> Nenhuma descrição informativa associada
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(category)}
                          className="h-8 w-8"
                          title="Ajustar Definição"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteClick(category.id)}
                          className="h-8 w-8"
                          title="Remover Taxonomia"
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

          {filteredCategories.length === 0 && !loading && (
            <div className="py-24 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6 text-muted-foreground/20 ring-8 ring-muted/10">
                <Tag className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Taxonomia não encontrada</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">Personalize sua busca ou cadastre uma nova categoria organizacional.</p>
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
        title={editingCategory ? 'Refinar Categoria' : 'Mapear Nova Categoria'}
        size="md"
      >
        <CategoryForm 
          initialData={editingCategory}
          onSuccess={() => {
            setIsFormModalOpen(false);
            fetchCategories();
          }}
          onCancel={() => setIsFormModalOpen(false)}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Desativar Categoria?"
        message="Esta ação é definitiva. Todos os itens associados a esta categoria perderão sua classificação principal."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Confirmar Exclusão"
        cancelText="Manter Registro"
      />
    </AdminLayout>
  );
};

export default CategoryListPage;
