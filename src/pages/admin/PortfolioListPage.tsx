import { useState, useEffect, useMemo } from 'react';
import {
  Edit,
  Trash2,
  Plus,
  GripVertical,
  Briefcase,
  Image as ImageIcon,
  Search,
  XCircle,
} from 'lucide-react';
import { apiFetch } from '../../services/api';
import type { PortfolioItem } from '../../types/types';
import { asArray } from '@/utils/normalize';
import AdminLayout from '@/components/admin/AdminLayout';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  Button,
  Card,
  Modal,
  ConfirmModal,
  Alert,
  Input,
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

const PAGE_TITLE = 'Portfólio';
const BREADCRUMBS = [{ name: 'Admin', href: '/admin/painel' }, { name: 'Portfólio' }];

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
        {/* Alça de arraste — botão (antes uma div só visível no hover, inacessível no toque). */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 z-10 p-2 bg-black/60 backdrop-blur-md text-white rounded-lg cursor-grab active:cursor-grabbing md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="Arrastar para reordenar"
          aria-label={`Arrastar para reordenar ${item.title}`}
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>

        <div className="relative h-48 sm:h-56 overflow-hidden bg-muted">
          {/* Achado: a foto vinha de data-bg-image + <style> com url(attr()) / var(--bg-url) nunca
              definida — os cards ficavam sem imagem, e o <style> era repetido em cada card. */}
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover pointer-events-none transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <ImageIcon className="h-10 w-10" aria-hidden="true" />
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

          {/* Ações */}
          <div className="absolute top-2 right-2 flex flex-col gap-2 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onEdit(item); }}
              className="h-8 w-8 bg-black/40 backdrop-blur-md border-white/20 text-white hover:bg-primary hover:text-primary-foreground hover:border-primary"
              title="Editar projeto"
              aria-label={`Editar ${item.title}`}
            >
              <Edit size={14} />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="h-8 w-8"
              title="Excluir projeto"
              aria-label={`Excluir ${item.title}`}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {/* O selo "PROJETO", o status "Online" e o botão "Ver Mais" (sem ação) eram fixos e foram removidos. */}
        <div className="p-5 flex flex-col flex-1">
          <h3 className="font-bold text-base text-foreground line-clamp-1 mb-2">{item.title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3 flex-1">
            {item.description}
          </p>
        </div>
      </Card>
    </div>
  );
};

export const PortfolioListPage = () => {
  const { addNotification } = useNotifications();
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
    if (!over || active.id === over.id) return;

    const previous = items;
    const oldIndex = previous.findIndex((item) => item.id === active.id);
    const newIndex = previous.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const updatedItems = arrayMove(previous, oldIndex, newIndex).map((item, index) => ({
      ...item,
      sortOrder: index
    }));
    setItems(updatedItems);

    try {
      await apiFetch('/portfolio/reorder', {
        method: 'PUT',
        body: JSON.stringify({
          items: updatedItems.map(item => ({ id: item.id, sortOrder: item.sortOrder || 0 }))
        })
      });
    } catch (err) {
      // Antes a falha só ia para o log: a tela mostrava uma ordem que não tinha sido salva.
      logger.error("Falha ao salvar ordem:", 'PortfolioListPage', err);
      setItems(previous);
      // Recarrega do servidor: com dois arrastes seguidos (1º falha, 2º salva), restaurar só a foto
      // local deixava a tela com uma ordem diferente da que ficou gravada.
      void fetchPortfolioItems();
      addNotification({
        type: 'error',
        title: 'Ordem não salva',
        message: 'Não foi possível salvar a nova ordem. A ordem anterior foi restaurada.'
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
      addNotification({ type: 'success', title: 'Projeto excluído', message: 'O projeto saiu do portfólio.' });
    } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Erro ao excluir',
        message: err instanceof Error ? err.message : 'Não foi possível excluir o projeto.'
      });
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
      <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Carregando portfólio…" />
        </div>
      </AdminLayout>
    );
  }

  const loadFailed = !!error && items.length === 0;

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
              <h2 className="text-xl font-bold text-foreground">Projetos em destaque</h2>
              <p className="text-sm text-muted-foreground">Arraste os cards para priorizar os destaques no site.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCreate} className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5" /> Novo Projeto
            </Button>
          </div>
        </div>

        {/* Estatística — "Conversão: Alta" e "Status Global: Publicado" eram textos fixos e foram removidos. */}
        <Card className="p-4 bg-primary/5 border-primary/10 sm:max-w-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Projetos</p>
              <p className="text-xl font-black text-foreground">{items.length}</p>
            </div>
          </div>
        </Card>

        {/* Busca */}
        <Card className="p-4 bg-card/50 border-border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Buscar projeto"
                placeholder="Buscar por título ou palavras-chave do projeto..."
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
            title="Erro ao carregar o portfólio"
            action={<Button size="sm" variant="outline" onClick={fetchPortfolioItems}>Tentar de novo</Button>}
          >
            {error}
          </Alert>
        )}

        {loadFailed ? null : filteredItems.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-border rounded-3xl bg-muted/20">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Nenhum projeto encontrado</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">Ajuste a busca ou cadastre um novo projeto.</p>
            <Button variant="outline" size="sm" className="mt-6" onClick={() => setSearchTerm('')}>
              Limpar filtros
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

      {/* Confirmação de exclusão */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir projeto do portfólio?"
        message="O projeto sai do site público. Você poderá cadastrá-lo de novo no futuro, mas os dados atuais serão perdidos."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Excluir"
        cancelText="Manter"
      />

      {/* Criar/editar */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => guardClose(() => setIsFormModalOpen(false))}
        title={editingItem ? 'Editar projeto' : 'Novo projeto'}
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
