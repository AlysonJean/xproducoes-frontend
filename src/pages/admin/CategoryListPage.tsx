// src/pages/admin/CategoryListPage.tsx

import { useState, useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '../../services/api';
import { asArray } from '../../utils/normalize';
import { Category } from '../../types/types';
import AdminLayout from '../../components/admin/AdminLayout';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { SimpleCard } from '../../components/ui/Cards';
import { Button } from '../../components/ui/Button';
import { Trash2, Edit2, Plus } from 'lucide-react';
import CategoryForm from '../../components/forms/CategoryFormPage';
import { Modal } from '@/components/ui/StandardComponents';

export const CategoryListPage = () => {
  const { addNotification } = useNotifications();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/categories');
      setCategories(asArray<Category>(data));
    } catch (err: unknown) {
      setError(
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message?: unknown }).message)
          : 'Não foi possível carregar a lista de categorias.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (window.confirm('Tem a certeza de que quer apagar esta categoria?')) {
      try {
        await apiFetch(`/categories/${id}`, { method: 'DELETE' });
        fetchCategories();
        addNotification({
          type: 'success',
          title: 'Sucesso',
          message: 'Categoria apagada com sucesso.'
        });
      } catch (err: unknown) {
        addNotification({
          type: 'error',
          title: 'Erro',
          message: `Erro ao apagar categoria: ${
            typeof err === 'object' && err !== null && 'message' in err
              ? String((err as { message?: unknown }).message)
              : 'Erro desconhecido.'
          }`
        });
      }
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  if (loading && categories.length === 0) {
    return (
      <AdminLayout title="Gestão de Categorias" breadcrumbs={[{ name: 'Admin' }, { name: 'Categorias' }]}>
        <div className="flex items-center justify-center min-h-96">
          <BrandLoader size={120} label="Carregando categorias..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestão de Categorias" breadcrumbs={[{ name: 'Admin' }, { name: 'Categorias' }]}>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="text-muted-foreground text-sm">
            Total de categorias: <span className="font-semibold text-foreground">{categories.length}</span>
          </div>
        </div>
        <Button onClick={handleCreate} variant="primary" className="gap-2">
          <Plus size={20} />
          Adicionar Nova Categoria
        </Button>
      </div>

      {error ? (
        <div className="flex items-center justify-center min-h-96">
          <div className="text-destructive bg-destructive/10 p-4 rounded-lg border border-destructive">
            {error}
          </div>
        </div>
      ) : (
        <SimpleCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                          {category.imageUrl ? (
                            <img 
                              src={category.imageUrl} 
                              alt={category.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{category.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">
                        {category.description || 'Sem descrição'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          onClick={() => handleEdit(category)}
                          variant="outline" 
                          size="sm"
                          title="Editar categoria"
                          aria-label="Editar categoria"
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          onClick={() => handleDelete(category.id)}
                          variant="danger"
                          size="sm"
                          title="Excluir categoria"
                          aria-label="Excluir categoria"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {categories.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma categoria encontrada</h3>
              <p className="text-muted-foreground">
                Comece criando a primeira categoria para organizar seus equipamentos
              </p>
            </div>
          )}
        </SimpleCard>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
        className="max-w-lg"
      >
        <CategoryForm 
          initialData={editingCategory}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchCategories();
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </AdminLayout>
  );
};

