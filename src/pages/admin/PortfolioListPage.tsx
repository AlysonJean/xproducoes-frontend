// src/pages/admin/PortfolioListPage.tsx

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import type { PortfolioItem } from '../../types/types';
import { asArray } from '@/utils/normalize';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SimpleCard } from '@/components/ui/Cards';

export const PortfolioListPage = () => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteClick = (id: string) => {
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

  if (loading) {
    return (
      <AdminLayout title="Gestão de Portfólio" breadcrumbs={[{ name: 'Admin' }, { name: 'Portfólio' }]}>
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner label="Carregando portfólio..." />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
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
        <Link to="/admin/portfolio/new">
          <Button variant="primary">Adicionar Novo Item</Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <SimpleCard className="p-12 text-center">
          <div className="text-muted-foreground">Nenhum item encontrado.</div>
          <div className="mt-4">
            <Link to="/admin/portfolio/new">
              <Button variant="primary">Adicionar Item</Button>
            </Link>
          </div>
        </SimpleCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <SimpleCard key={item.id} className="overflow-hidden">
              <img
                src={item.imageUrl || '/placeholder-portfolio.jpg'}
                alt={item.title || 'Item do portfólio'}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-portfolio.jpg';
                }}
              />
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{item.description}</p>
                <div className="flex gap-2">
                  <Link to={`/admin/portfolio/${item.id}/edit`} className="flex-1">
                    <Button variant="outline" className="w-full">Editar</Button>
                  </Link>
                  <Button variant="danger" className="flex-1" onClick={() => handleDeleteClick(item.id)}>
                    Apagar
                  </Button>
                </div>
              </div>
            </SimpleCard>
          ))}
        </div>
      )}
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
    </AdminLayout>
  );
};
