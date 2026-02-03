// src/pages/admin/PortfolioListPage.tsx

import { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import type { PortfolioItem } from '../../types/types';
import { asArray } from '@/utils/normalize';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/Button';
import BrandLoader from '@/components/ui/BrandLoader';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SimpleCard } from '@/components/ui/Cards';
import PortfolioForm from '@/components/forms/PortfolioFormPage';
import { Modal } from '@/components/ui/StandardComponents';
import { Edit, Trash2, Plus } from 'lucide-react';

export const PortfolioListPage = () => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);

  const fetchPortfolioItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/portfolio');
      setItems(asArray<PortfolioItem>(data));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar itens do portfólio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioItems();
  }, []);

  const handleDeleteClick = (id: number | string) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeleting(true);
      await apiFetch(`/portfolio/${itemToDelete}`, { method: 'DELETE' });
      await fetchPortfolioItems();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao apagar item');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: PortfolioItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    fetchPortfolioItems();
  };

  if (loading && !items.length) {
    return (
      <AdminLayout title="Gestão de Portfólio" breadcrumbs={[{ name: 'Admin' }, { name: 'Portfólio' }]}>
        <BrandLoader size={120} label="Carregando portfólio..." />
      </AdminLayout>
    );
  }

  // Error state is handled inline in main view if we have some items, or full page if blocking
  // But let's keep it simple and show error if blocking
  if (error && !items.length) {
    return (
      <AdminLayout title="Gestão de Portfólio" breadcrumbs={[{ name: 'Admin' }, { name: 'Portfólio' }]}>
        <div className="flex items-center justify-center min-h-96 text-center">
          <div>
            <div className="text-destructive mb-2">{error}</div>
            <Button onClick={fetchPortfolioItems} variant="primary">Tentar novamente</Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestão de Portfólio" breadcrumbs={[{ name: 'Admin' }, { name: 'Portfólio' }]}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Portfólio</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie seus itens de portfólio</p>
        </div>
        <Button onClick={handleCreate} variant="primary" className="flex items-center gap-2">
          <Plus size={18} />
          Adicionar Novo Item
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6">
          {error}
          <Button onClick={fetchPortfolioItems} variant="outline" className="ml-4 text-xs h-8">
            Tentar novamente
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <SimpleCard className="p-12 text-center">
          <div className="text-muted-foreground">Nenhum item encontrado.</div>
          <div className="mt-4">
            <Button onClick={handleCreate} variant="primary">Adicionar Item</Button>
          </div>
        </SimpleCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <SimpleCard key={item.id} className="overflow-hidden flex flex-col h-full p-0">
              <div className="relative h-48 group">
                <img
                  src={item.imageUrl || '/placeholder-portfolio.jpg'}
                  alt={item.title || 'Item do portfólio'}
                  className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder-portfolio.jpg';
                  }}
                />
                
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                  <button 
                    onClick={() => handleEdit(item)}
                    className="p-2 bg-background/90 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                    title="Editar"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(item.id)}
                    className="p-2 bg-background/90 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-lg mb-2 line-clamp-1">{item.title}</h3>
                <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-1">
                  {item.description}
                </p>
                {/* Date removed */}
              </div>
            </SimpleCard>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este item do portfólio? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        confirmVariant="danger"
        isLoading={isDeleting}
      />

      {/* Edit/Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Editar Projeto' : 'Novo Projeto'}
        className="max-w-2xl"
      >
        <PortfolioForm 
            initialData={editingItem}
            onSuccess={handleModalSuccess}
            onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </AdminLayout>
  );
};
