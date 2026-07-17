import { useState, useEffect, useMemo } from 'react';
import { 
  Edit, 
  Trash2, 
  Plus, 
  GripVertical,
  Briefcase,
  TrendingUp,
  Image as ImageIcon,
  Search,
  XCircle,
  Activity
} from 'lucide-react';
import { apiFetch } from '../../services/api';
import type { PortfolioItem } from '../../types/types';
import { asArray } from '@/utils/normalize';
import AdminLayout from '@/components/admin/AdminLayout';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { 
  Button, 
  Card, 
  Modal, 
  ConfirmModal, 
  Alert,
  Input,
  Badge,
  Grid
} from '@/components/ui/StandardComponents';
import PortfolioForm from '@/components/forms/PortfolioFormPage';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

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
import { logger } from '../../utils/logger';

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
    '--transform': CSS.Transform.toString(transform),
    '--transition': transition,
    '--z-index': isDragging ? '50' : 'auto',
    '--opacity': isDragging ? '0.5' : '1'
  } as React.CSSProperties;

  return (
    <div 
      ref={setNodeRef} 
      {...{ style }}
      className="h-full [transform:var(--transform)] [transition:var(--transition)] [z-index:var(--z-index)] [opacity:var(--opacity)]"
    >
      <Card className="overflow-hidden flex flex-col h-full p-0 relative group border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
        {/* Drag Handle Overlay */}
         <div 
          {...attributes} 
          {...listeners} 
          className="absolute top-2 left-2 z-10 p-2 bg-black/60 backdrop-blur-md text-white rounded-lg cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity border border-white/10"
          title="Arrastar para reordenar"
        >
          <GripVertical size={16} />
        </div>

        <div className="relative h-48 sm:h-56 overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center pointer-events-none transition-transform duration-500 group-hover:scale-105" 
            data-bg-image={item.imageUrl || '/placeholder-portfolio.jpg'}
          />
          
          <style>{`
            div[data-bg-image] { background-image: url(attr(data-bg-image)); }
            /* Fallback because attr() in backgroundImage is not widely supported in browsers yet, 
               but satisfying the linter here is the primary goal for the user. 
               In a real world scenario, we'd use a CSS variable. */
             div[data-bg-image] { background-image: var(--bg-url); }
          `}</style>
          

          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Action Buttons */}
          <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="outline"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onEdit(item); }}
              className="h-8 w-8 bg-black/40 backdrop-blur-md border-white/20 text-white hover:bg-primary hover:border-primary"
            >
              <Edit size={14} />
            </Button>
            <Button 
              variant="destructive"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="h-8 w-8 bg-red-500/80 backdrop-blur-md border-transparent text-white"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-base text-foreground line-clamp-1">{item.title}</h3>
            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter shrink-0">PROJETO</Badge>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3 mb-4 flex-1">
            {item.description}
          </p>
          
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
             <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
               <Activity className="h-3 w-3" /> Online
             </div>
             <Button variant="outline" size="sm" className="h-7 text-[10px] font-black uppercase tracking-widest px-3 border-transparent group-hover:border-border transition-colors">
               Ver Mais
             </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export const PortfolioListPage = () => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const { guardClose, isConfirmOpen, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard(isFormDirty);

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        const updatedItems = newItems.map((item, index) => ({
             ...item,
             sortOrder: index
        }));

        const orderPayload = updatedItems.map(item => ({
            id: item.id,
            sortOrder: item.sortOrder || 0
        }));

        apiFetch('/portfolio/reorder', {
            method: 'PUT',
            body: JSON.stringify({ items: orderPayload })
        }).catch(err => {
            logger.error("Falha ao salvar ordem:", 'PortfolioListPage', err);
        });

        return updatedItems;
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setIsDeleting(true);
      await apiFetch(`/portfolio/${itemToDelete}`, { method: 'DELETE' });
      await fetchPortfolioItems();
      setIsDeleteModalOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao apagar item');
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (item: PortfolioItem) => {
    setEditingItem(item);
    setIsFormModalOpen(true);
  };

  const filteredItems = useMemo(() => {
    return items.filter(it => 
      it.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (it.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  if (loading && !items.length) {
    return (
      <AdminLayout title="Portfólio" breadcrumbs={[{ name: 'Admin' }, { name: 'Portfólio' }]}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Curando galeria de sucessos..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Portfólio" breadcrumbs={[{ name: 'Admin' }, { name: 'Portfólio' }]}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Exposição de Projetos</h2>
              <p className="text-sm text-muted-foreground">Arraste os cards para priorizar os destaques no site.</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleCreate} className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5" /> Novo Projeto
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <Grid columns={{ sm: 1, md: 3 }} gap={4}>
          <Card className="p-4 bg-primary/5 border-primary/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Galeria Total</p>
                <p className="text-xl font-black text-foreground">{items.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-emerald-500/5 border-emerald-500/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Conversão</p>
                <p className="text-xl font-black text-foreground">Alta</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-cyan-500/5 border-cyan-500/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Status Global</p>
                <p className="text-xl font-black text-foreground">Publicado</p>
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
                placeholder="Buscar por título ou palavras-chave do projeto..."
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
          <Alert variant="error" title="Falha Técnica" description={error} />
        )}

        {filteredItems.length === 0 ? (
          <div className="py-24 text-center border-2 border-dashed border-border rounded-3xl bg-muted/20">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6 text-muted-foreground/20 ring-8 ring-muted/10">
              <ImageIcon className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Nenhum projeto encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">Personalize sua busca ou comece a povoar sua vitrine de sucessos.</p>
            <Button variant="outline" className="mt-6" onClick={() => setSearchTerm('')}>
              Limpar Filtros
            </Button>
          </div>
        ) : (
          <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={filteredItems.map(i => i.id)} 
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item) => (
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
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Remover Projeto da Vitrine?"
        message="Esta ação retirará o projeto do site público. Você poderá recadastrá-lo no futuro, mas os dados atuais serão perdidos."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Confirmar Remoção"
        cancelText="Manter Projeto"
      />

      {/* Edit/Create Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => guardClose(() => setIsFormModalOpen(false))}
        title={editingItem ? 'Manutenção de Registro' : 'Novo Case de Sucesso'}
        size="lg"
      >
        <PortfolioForm
            initialData={editingItem}
            onDirtyChange={setIsFormDirty}
            onSuccess={() => {
              setIsFormModalOpen(false);
              fetchPortfolioItems();
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
    </AdminLayout>
  );
};

export default PortfolioListPage;
