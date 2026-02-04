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
import { Edit, Trash2, Plus, GripVertical } from 'lucide-react';

// DnD Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Componente Sortable Item
interface SortableItemProps {
  item: PortfolioItem;
  onEdit: (item: PortfolioItem) => void;
  onDelete: (id: string) => void;
}

const SortableItem = ({ item, onEdit, onDelete }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="h-full">
      <SimpleCard className="overflow-hidden flex flex-col h-full p-0 relative group border-2 hover:border-primary/50 transition-colors">
        {/* Drag Handle Overlay - Always visible on mobile, hover on desktop if prefer */}
         <div 
          {...attributes} 
          {...listeners} 
          className="absolute top-2 left-2 z-10 p-2 bg-black/50 text-white rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          title="Arrastar para reordenar"
        >
          <GripVertical size={16} />
        </div>

        <div className="relative h-48">
          <img
            src={item.imageUrl || '/placeholder-portfolio.jpg'}
            alt={item.title || 'Item do portfólio'}
            className="w-full h-48 object-cover pointer-events-none" // pointer-events-none ajuda no drag da imagem
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder-portfolio.jpg';
            }}
          />
          
          {/* Action Buttons */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(item); }}
              className="p-2 bg-background/90 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
              title="Editar"
            >
              <Edit size={18} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
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
        </div>
      </SimpleCard>
    </div>
  );
};

export const PortfolioListPage = () => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // 5px movement to start drag
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
      // Garantir ordenação pelo sortOrder se existir, senão mantém
      // OBS: Backend já deve retornar ordenado por sortOrder ASC
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Atualizar no backend (fire and forget com feedback otimista)
        // Atualiza a propriedade sortOrder localmente para refletir
        const updatedItems = newItems.map((item, index) => ({
             ...item,
             sortOrder: index
        }));

        // Enviar apenas IDs e nova ordem para o backend
        const orderPayload = updatedItems.map(item => ({
            id: item.id,
            sortOrder: item.sortOrder || 0
        }));

        apiFetch('/portfolio/reorder', {
            method: 'PUT',
            body: { items: orderPayload }
        }).catch(err => {
            console.error("Falha ao salvar ordem:", err);
            // Poderíamos reverter, mas por enquanto logamos
            // addNotification({ type: 'error', message: 'Falha ao salvar ordem' });
        });

        return updatedItems;
      });
    }
  };

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
          <p className="mt-1 text-sm text-muted-foreground">Arraste os itens para reordenar a exibição no site</p>
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
        <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={items.map(i => i.id)} 
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <SortableItem 
                    key={item.id} 
                    item={item} 
                    onEdit={handleEdit} 
                    onDelete={handleDeleteClick} 
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
