import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { apiFetch } from '../../services/api';
import { normalizeString } from '../../utils/string';
import { Button, Input, Select, Badge } from '../../components/ui/StandardComponents';
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
  const [perPage, setPerPage] = useState(10);
  const [actionId, setActionId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminReview | null>(null);
  const { addNotification } = useNotifications();

  const load = async () => {
    try {
      setLoading(true);
  const res = await apiFetch(`/api/reviews${minRating ? `?rating=${minRating}` : ''}`);
  const data = Array.isArray(res) ? res : ((res as ApiResponse<AdminReview[]>)?.data ?? []);
      setItems(data);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Falha ao carregar avaliações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [minRating]);

  const filtered = useMemo(() => {
    let data = items;
    if (statusFilter !== 'all') {
      const wantRejected = statusFilter === 'rejected';
      data = data.filter(r => (r.reported ?? false) === wantRejected);
    }
    if (!query) return data;
    const q = normalizeString(query);
    return data.filter(r =>
      normalizeString(r.comment).includes(q) ||
      normalizeString(r.reviewer?.name).includes(q) ||
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

  const handleApprove = async (id: string) => {
    try {
      setActionId(id);
  await apiFetch(`/api/reviews/${id}/approve`, { method: 'POST' });
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
  await apiFetch(`/api/reviews/${id}/reject`, { method: 'POST' });
      addNotification({ type: 'info', title: 'Rejeitada', message: 'Avaliação marcada como rejeitada.' });
      await load();
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Erro ao rejeitar', message: e?.message || 'Falha ao rejeitar.' });
    } finally {
      setActionId(null);
    }
  };
  const handleDelete = async (id: string) => {
    try {
      if (!window.confirm('Tem certeza que deseja apagar esta avaliação?')) return;
      setActionId(id);
  await apiFetch(`/api/reviews/${id}`, { method: 'DELETE' });
      addNotification({ type: 'success', title: 'Excluída', message: 'Avaliação apagada com sucesso.' });
      await load();
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Erro ao apagar', message: e?.message || 'Falha ao apagar.' });
    } finally {
      setActionId(null);
    }
  };

  const handleUpdate = async (id: string, data: { rating: number; comment?: string }) => {
    try {
      setActionId(id);
  await apiFetch(`/api/reviews/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      addNotification({ type: 'success', title: 'Atualizada', message: 'Avaliação atualizada com sucesso.' });
      setEditing(null);
      await load();
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Erro ao atualizar', message: e?.message || 'Falha ao atualizar.' });
    } finally {
      setActionId(null);
    }
  };

  return (
    <AdminLayout title="Avaliações" breadcrumbs={[{ name: 'Admin' }, { name: 'Avaliações' }]}>
      <div className="p-4">
        <div className="flex flex-col lg:flex-row gap-3 mb-4">
          <Input placeholder="Buscar por texto, autor, equipamento..." value={query} onChange={(e: any) => setQuery(e.target.value)} />
          <Select name="minRating" label="Avaliação mínima" value={minRating} onChange={(e: any) => setMinRating(e.target.value)}
            options={[
              { value: '', label: 'Qualquer' },
              { value: '1', label: '1+' },
              { value: '2', label: '2+' },
              { value: '3', label: '3+' },
              { value: '4', label: '4+' },
              { value: '5', label: '5' },
            ]}
          />
          <Select
            name="status"
            label="Status"
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Todas' },
              { value: 'approved', label: 'Aprovadas' },
              { value: 'rejected', label: 'Rejeitadas' },
            ]}
          />
          <Select
            name="sortBy"
            label="Ordenar por"
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            options={[
              { value: 'date_desc', label: 'Data (recente → antigo)' },
              { value: 'date_asc', label: 'Data (antigo → recente)' },
              { value: 'rating_desc', label: 'Nota (maior → menor)' },
              { value: 'rating_asc', label: 'Nota (menor → maior)' },
            ]}
          />
          <Select
            name="perPage"
            label="Por página"
            value={String(perPage)}
            onChange={(e: any) => { setPerPage(parseInt(e.target.value, 10)); setPage(1); }}
            options={[
              { value: '5', label: '5' },
              { value: '10', label: '10' },
              { value: '20', label: '20' },
              { value: '50', label: '50' },
            ]}
          />
          <Button onClick={load}>Recarregar</Button>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Carregando...</div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : (
          <>
          <div className="space-y-3">
            {paginated.map((r) => (
              <div key={r.id} className="border rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground">{r.reviewer?.name || 'Cliente'}</span>
                    <Badge variant={r.reported ? 'destructive' : 'secondary'}>{r.rating}★</Badge>
                    <span className={`text-xs ${r.reported ? 'text-destructive' : 'text-success'}`}>
                      {r.reported ? 'Rejeitada' : 'Aprovada'}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={actionId===r.id} onClick={() => setEditing(r)}>Editar</Button>
                    <Button size="sm" variant="outline" disabled={actionId===r.id} onClick={() => handleApprove(r.id)}>Aprovar</Button>
                    <Button size="sm" variant="warning" disabled={actionId===r.id} onClick={() => handleReject(r.id)}>Rejeitar</Button>
                    <Button size="sm" variant="destructive" disabled={actionId===r.id} onClick={() => handleDelete(r.id)}>Apagar</Button>
                  </div>
                </div>
                {r.comment && <p className="text-sm text-foreground">{r.comment}</p>}
                {r.booking?.equipments && r.booking.equipments.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Equipamentos: {r.booking.equipments.map(e => e.name).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={perPage}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          )}
          </>
        )}
      </div>
      {editing && (
        <EditModal
          review={editing}
          onClose={() => setEditing(null)}
          onSave={(data) => handleUpdate(editing.id, data)}
          saving={actionId===editing.id}
        />
      )}
    </AdminLayout>
  );
}

function EditModal({ review, onClose, onSave, saving }: { review: AdminReview; onClose: () => void; onSave: (data: { rating: number; comment?: string }) => void; saving?: boolean }) {
  const [rating, setRating] = useState<number>(review.rating);
  const [comment, setComment] = useState<string>(review.comment || '');
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-foreground mb-4">Editar Avaliação</h3>
        <div className="space-y-4">
          <label className="block text-sm text-foreground">
            Nota (1-5)
            <input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(parseInt(e.target.value||'0',10))} className="mt-1 w-full border border-border rounded px-3 py-2 bg-background text-foreground" />
          </label>
          <label className="block text-sm text-foreground">
            Comentário
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} className="mt-1 w-full border border-border rounded px-3 py-2 bg-background text-foreground" />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={() => onSave({ rating, comment })} isLoading={!!saving}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}
