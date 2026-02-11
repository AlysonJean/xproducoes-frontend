import { useEffect, useMemo, useState, useCallback } from 'react';
import { 
  Star, 
  Trash2, 
  XCircle, 
  MessageSquare, 
  Search, 
  TrendingUp,
  Calendar,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  AlertCircle
} from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { apiFetch } from '../../services/api';
import { normalizeString } from '../../utils/string';
import { 
  Button, 
  Input, 
  Select, 
  Badge, 
  Card, 
  Grid, 
  Modal, 
  ConfirmModal,
  Alert
} from '../../components/ui/StandardComponents';
import { BrandLoader } from '@/components/ui/BrandLoader';
import type { ApiResponse } from '../../types/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { Pagination } from '../../components/ui/Pagination';

type AdminReview = {
  id: string;
  rating: number;
  comment?: string;
  reported?: boolean;
  createdAt: string;
  reviewer?: { name?: string; avatarUrl?: string };
  booking?: { id: string; eventDate?: string; equipments?: { id: string; name: string }[] };
};

export default function ReviewManagementPage() {
  const [items, setItems] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [minRating, setMinRating] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'rejected'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'rating_desc' | 'rating_asc'>('date_desc');
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [actionId, setActionId] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState<AdminReview | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { addNotification } = useNotifications();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/reviews${minRating ? `?rating=${minRating}` : ''}`);
      const data = Array.isArray(res) ? res : ((res as ApiResponse<AdminReview[]>)?.data ?? []);
      setItems(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Falha ao carregar avaliações');
    } finally {
      setLoading(false);
    }
  }, [minRating]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let data = items;
    if (statusFilter !== 'all') {
      const wantRejected = statusFilter === 'rejected';
      data = data.filter(r => (r.reported ?? false) === wantRejected);
    }
    if (!query) return data;
    const q = normalizeString(query);
    return data.filter(r =>
      normalizeString(r.comment || '').includes(q) ||
      normalizeString(r.reviewer?.name || '').includes(q) ||
      (r.booking?.equipments || []).some(e => normalizeString(e.name).includes(q))
    );
  }, [items, query, statusFilter]);

  const sorted = useMemo(() => {
    const data = [...filtered];
    switch (sortBy) {
      case 'date_asc':
        data.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'rating_desc':
        data.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case 'rating_asc':
        data.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
        break;
      case 'date_desc':
      default:
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }
    return data;
  }, [filtered, sortBy]);

  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * perPage;
  const pageEnd = pageStart + perPage;
  const paginated = sorted.slice(pageStart, pageEnd);

  const stats = useMemo(() => ({
    total: items.length,
    avgRating: items.length > 0 ? items.reduce((acc, curr) => acc + (curr.rating || 0), 0) / items.length : 0,
    reported: items.filter(i => i.reported).length
  }), [items]);

  const handleApprove = async (id: string) => {
    try {
      setActionId(id);
      await apiFetch(`/reviews/${id}/approve`, { method: 'POST' });
      addNotification({ type: 'success', title: 'Aprovada', message: 'Avaliação aprovada e publicada.' });
      await load();
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Erro ao aprovar', message: e?.message || 'Falha na aprovação.' });
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setActionId(id);
      await apiFetch(`/reviews/${id}/reject`, { method: 'POST' });
      addNotification({ type: 'info', title: 'Rejeitada', message: 'Avaliação marcada como rejeitada.' });
      await load();
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Erro ao rejeitar', message: e?.message || 'Falha ao rejeitar.' });
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteClick = (id: string) => {
    setReviewToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!reviewToDelete) return;
    try {
      setIsDeleting(true);
      setActionId(reviewToDelete);
      await apiFetch(`/reviews/${reviewToDelete}`, { method: 'DELETE' });
      addNotification({ type: 'success', title: 'Excluída', message: 'Avaliação apagada com sucesso.' });
      await load();
      setIsDeleteModalOpen(false);
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Erro ao apagar', message: e?.message || 'Falha ao apagar.' });
    } finally {
      setIsDeleting(false);
      setActionId(null);
      setReviewToDelete(null);
    }
  };

  const handleUpdate = async (id: string, data: { rating: number; comment?: string }) => {
    try {
      setActionId(id);
      await apiFetch(`/reviews/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      addNotification({ type: 'success', title: 'Atualizada', message: 'Avaliação atualizada com sucesso.' });
      setEditingReview(null);
      await load();
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Erro ao atualizar', message: e?.message || 'Falha ao atualizar.' });
    } finally {
      setActionId(null);
    }
  };

  if (loading && items.length === 0) {
    return (
      <AdminLayout title="Avaliações" breadcrumbs={[{ name: 'Admin' }, { name: 'Avaliações' }]}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Analisando feedback dos clientes..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Avaliações" breadcrumbs={[{ name: 'Admin' }, { name: 'Avaliações' }]}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Star className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Gestão de Feedback</h2>
              <p className="text-sm text-muted-foreground">Monitore e modere o depoimento de seus clientes.</p>
            </div>
          </div>
          
          <div className="flex gap-2">
             <Button variant="outline" className="gap-2" onClick={load}>
               Recarregar Dados
             </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <Grid columns={{ sm: 1, md: 3 }} gap={4}>
          <Card className="p-4 bg-primary/5 border-primary/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Total de Avaliações</p>
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
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Média de Satisfação</p>
                <p className="text-xl font-black text-foreground">{stats.avgRating.toFixed(1)} <span className="text-sm font-bold opacity-50">/ 5.0</span></p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-amber-500/5 border-amber-500/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Rejeitadas/Ocultas</p>
                <p className="text-xl font-black text-foreground">{stats.reported}</p>
              </div>
            </div>
          </Card>
        </Grid>

        {/* Filters and Search */}
        <Card className="p-4 bg-card/50 border-border">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por comentário, autor ou equipamento..."
                className="pl-10"
                value={query}
                onChange={(e: any) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                className="w-32"
                value={minRating}
                onChange={(e: any) => setMinRating(e.target.value)}
                options={[
                  { value: '', label: 'Nota: Todas' },
                  { value: '4', label: '4+ Estrelas' },
                  { value: '3', label: '3+ Estrelas' },
                  { value: '1', label: '1+ Estrela' },
                ]}
              />
              <Select
                className="w-32"
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Status: Todos' },
                  { value: 'approved', label: 'Aprovadas' },
                  { value: 'rejected', label: 'Rejeitadas' },
                ]}
              />
              <Select
                className="w-40"
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                options={[
                  { value: 'date_desc', label: 'Mais Recentes' },
                  { value: 'rating_desc', label: 'Maior Nota' },
                  { value: 'rating_asc', label: 'Menor Nota' },
                ]}
              />
               <Button variant="outline" size="icon" onClick={() => { setQuery(''); setMinRating(''); setStatusFilter('all'); }} title="Limpar Filtro">
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {error && (
          <Alert variant="error" title="Erro de Sincronização" description={error} />
        )}

        {/* Reviews List */}
        <div className="space-y-4">
          {paginated.length === 0 ? (
            <div className="py-24 text-center border-2 border-dashed border-border rounded-3xl bg-muted/20">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6 text-muted-foreground/20 ring-8 ring-muted/10">
                <MessageSquare className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Sem avaliações localizadas</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">Personalize sua busca ou aguarde o feedback espontâneo dos clientes.</p>
              <Button variant="outline" className="mt-6" onClick={() => { setQuery(''); setMinRating(''); setStatusFilter('all'); }}>
                Limpar Filtros
              </Button>
            </div>
          ) : (
            paginated.map((r) => (
              <Card key={r.id} className="p-6 hover:shadow-md transition-all group border-border">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-border flex items-center justify-center overflow-hidden shrink-0 mt-1">
                      {r.reviewer?.avatarUrl ? (
                         <img src={r.reviewer.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                         <div className="text-lg font-black text-primary/40 uppercase">{(r.reviewer?.name || 'C').charAt(0)}</div>
                      )}
                    </div>
                    
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-foreground">{r.reviewer?.name || 'Cliente Elite'}</h4>
                        <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'fill-current' : 'opacity-20'}`} />
                          ))}
                          <span className="ml-1">{r.rating}.0</span>
                        </div>
                        <Badge variant={r.reported ? 'destructive' : 'success'} className="text-[9px] font-black uppercase tracking-tighter">
                          {r.reported ? 'Oculta / Rejeitada' : 'Publicada / Ativa'}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {new Date(r.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        <span className="opacity-50">#ID {r.id.slice(0, 8)}</span>
                      </p>
                      
                      {r.comment && (
                        <p className="text-sm text-foreground/90 leading-relaxed pt-2 italic">
                          "{r.comment}"
                        </p>
                      )}
                      
                      {r.booking?.equipments && r.booking.equipments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mr-1">ITENS:</span>
                          {r.booking.equipments.map((e, idx) => (
                            <Badge key={idx} variant="outline" className="text-[9px] bg-muted/30">
                              {e.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 pt-4 lg:pt-0 border-t lg:border-t-0 border-border">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      disabled={actionId === r.id} 
                      onClick={() => setEditingReview(r)}
                      className="h-9 px-4 text-xs font-bold"
                    >
                      Editar
                    </Button>
                    
                    {!r.reported ? (
                      <Button 
                        size="sm" 
                        variant="warning" 
                        disabled={actionId === r.id} 
                        onClick={() => handleReject(r.id)}
                        className="h-9 px-4 text-xs font-bold gap-2"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" /> Rejeitar
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="success" 
                        disabled={actionId === r.id} 
                        onClick={() => handleApprove(r.id)}
                        className="h-9 px-4 text-xs font-bold gap-2"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" /> Aprovar
                      </Button>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      disabled={actionId === r.id} 
                      onClick={() => handleDeleteClick(r.id)}
                      className="h-9 px-4 text-xs font-bold"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    
                    <Button variant="outline" size="icon" className="h-9 w-9 border-transparent">
                       <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center pt-6">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={perPage}
              onPageChange={(p: number) => setPage(p)}
            />
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingReview}
        onClose={() => setEditingReview(null)}
        title="Escopo de Edição de Avaliação"
        size="md"
      >
        {editingReview && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Nota de Satisfação (1-5)</label>
              <div className="flex items-center gap-2">
                 <Input 
                   type="number" 
                   min={1} 
                   max={5} 
                   value={editingReview.rating} 
                   onChange={(e: any) => setEditingReview({ ...editingReview, rating: parseInt(e.target.value || '0', 10) })} 
                   className="w-full"
                 />
                 <div className="flex items-center gap-1 text-amber-500">
                   {Array.from({ length: 5 }).map((_, i) => (
                     <Star key={i} className={`h-5 w-5 ${i < editingReview.rating ? 'fill-current' : 'opacity-20'}`} />
                   ))}
                 </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-foreground mb-2">Comentário / Depoimento</label>
              <textarea 
                value={editingReview.comment || ''} 
                onChange={(e) => setEditingReview({ ...editingReview, comment: e.target.value })} 
                rows={4} 
                className="w-full flex min-h-[120px] rounded-2xl border border-input bg-card px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all font-medium text-foreground"
                placeholder="Edite o comentário do cliente respeitando a essência do feedback..."
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingReview(null)}>Cancelar Operação</Button>
              <Button 
                onClick={() => handleUpdate(editingReview.id, { rating: editingReview.rating, comment: editingReview.comment })} 
                isLoading={actionId === editingReview.id}
                className="shadow-lg shadow-primary/20"
              >
                Salvar Alterações
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Expurgar Avaliação do Registro?"
        message="Esta ação é irreversível. O feedback será deletado permanentemente do banco de dados e não poderá ser recuperado."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Confirmar Expurgo"
        cancelText="Manter Registro"
      />
    </AdminLayout>
  );
}
