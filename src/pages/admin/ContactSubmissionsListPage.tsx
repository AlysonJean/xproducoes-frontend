/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { 
  Mail, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search,
  MessageSquare,
  TrendingUp,
  XCircle,
  MoreHorizontal,
  Calendar,
  User
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '../../services/api';
import { asArray } from '../../utils/normalize';
import type { ContactSubmission } from '../../types/types';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { 
  Button, 
  Input, 
  Select, 
  ConfirmModal, 
  Card, 
  Badge, 
  Grid,
  Alert
} from '@/components/ui/StandardComponents';

export const ContactSubmissionsListPage = () => {
  const { addNotification } = useNotifications();
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // States for search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'PENDING' | 'READ'>('all');
  
  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/admin/contacts');
      setSubmissions(asArray<ContactSubmission>(data));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar mensagens.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const updatedSubmission = await apiFetch(`/admin/contacts/${id}/read`, {
        method: 'PATCH',
      });
      setSubmissions((prev) =>
        prev.map((sub) => (sub.id === id ? (updatedSubmission as ContactSubmission) : sub))
      );
      addNotification({
        type: 'success',
        title: 'Lida',
        message: 'Mensagem marcada como lida com sucesso.'
      });
    } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: err instanceof Error ? err.message : 'Erro ao marcar como lida.'
      });
    }
  };

  const openDeleteModal = (id: string) => {
    setSubmissionToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!submissionToDelete) return;
    try {
      setIsDeleting(true);
      await apiFetch(`/admin/contacts/${submissionToDelete}`, { method: 'DELETE' });
      setSubmissions((prev) => prev.filter((sub) => sub.id !== submissionToDelete));
      addNotification({
        type: 'success',
        title: 'Sucesso',
        message: 'Mensagem apagada com sucesso.'
      });
    } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: err instanceof Error ? err.message : 'Erro ao apagar a mensagem.'
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setSubmissionToDelete(null);
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch = 
      sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'PENDING').length,
    read: submissions.filter(s => s.status === 'READ').length
  };

  if (loading && submissions.length === 0) {
    return (
      <AdminLayout title="Mensagens de Contato" breadcrumbs={[{ name: 'Admin' }, { name: 'Contatos' }]}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Sincronizando caixa de entrada..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Mensagens" breadcrumbs={[{ name: 'Admin' }, { name: 'Contatos' }]}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Caixa de Entrada</h2>
              <p className="text-sm text-muted-foreground">Gerencie as comunicações diretas dos seus clientes.</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <Grid columns={{ sm: 1, md: 3 }} gap={6}>
          <Card className="p-5 bg-primary/5 border-primary/10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total de Contatos</p>
                <p className="text-2xl font-black text-foreground">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-amber-500/5 border-amber-500/10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pendentes de Leitura</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-foreground">{stats.pending}</p>
                  {stats.pending > 0 && (
                    <span className="text-xs text-amber-600 font-bold flex items-center animate-pulse">
                      <AlertCircle className="h-3 w-3 mr-1" /> Requer atenção
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-emerald-500/5 border-emerald-500/10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Processados</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-foreground">{stats.read}</p>
                  <span className="text-xs text-emerald-600 font-bold flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" /> {((stats.read / (stats.total || 1)) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </Grid>

        {/* Filters */}
        <Card className="p-4 bg-card/50 border-border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por nome, e-mail ou conteúdo..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select
                className="w-44"
                value={filterStatus}
                                onChange={(e: any) => setFilterStatus(e.target.value as any)}
                options={[
                  { value: 'all', label: 'Todas as mensagens' },
                  { value: 'PENDING', label: 'Apenas novas' },
                  { value: 'READ', label: 'Já processadas' }
                ]}
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}
                title="Limpar Filtros"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* List Section */}
        {error ? (
          <Alert variant="error" title="Erro de Conexão" description={error}>
            <Button variant="outline" size="sm" onClick={fetchSubmissions} className="mt-2 text-xs">
              Tentar reconectar
            </Button>
          </Alert>
        ) : filteredSubmissions.length > 0 ? (
          <div className="space-y-4">
            {filteredSubmissions.map((sub) => (
              <Card 
                key={sub.id} 
                className={`group transition-all duration-300 hover:shadow-lg ${
                  sub.status === 'PENDING' 
                    ? 'border-l-4 border-l-primary bg-primary/5 ring-1 ring-primary/20' 
                    : 'bg-card'
                }`}
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">{sub.name}</h3>
                        <Badge 
                          variant={sub.status === 'PENDING' ? 'primary' : 'outline'} 
                          className="h-5 text-[10px] uppercase font-black tracking-widest px-2"
                        >
                          {sub.status === 'PENDING' ? 'Novo Contato' : 'Mensagem Lida'}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-b border-border pb-4 font-medium">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50">
                          <Mail className="h-3.5 w-3.5" />
                          {sub.email}
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(sub.createdAt).toLocaleString('pt-BR')}
                        </div>
                      </div>

                      <div className="relative">
                        <div className="absolute -left-3 top-0 bottom-0 w-1 bg-muted rounded-full" />
                        <p className="text-sm text-foreground/80 leading-relaxed font-medium pl-4 italic whitespace-pre-wrap">
                          "{sub.message}"
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row lg:flex-col gap-2 flex-shrink-0 self-end lg:self-start">
                      {sub.status === 'PENDING' && (
                        <Button
                          onClick={() => handleMarkAsRead(sub.id)}
                          variant="secondary"
                          size="sm"
                          className="gap-2 font-bold shadow-sm"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Marcar Lida
                        </Button>
                      )}
                      <Button
                        onClick={() => openDeleteModal(sub.id)}
                        variant="destructive"
                        size="sm"
                        className="gap-2 font-bold"
                      >
                        <Trash2 className="h-4 w-4" /> Excluir
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 ml-auto lg:ml-0 opacity-0 group-hover:opacity-100 transition-opacity">
                         <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-20 flex flex-col items-center justify-center text-center bg-card/50 border-dashed border-2">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6 text-muted-foreground/30 ring-8 ring-muted/20">
              <Mail className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Sua caixa está limpa!</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">
              {searchTerm || filterStatus !== 'all' 
                ? 'Nenhuma mensagem encontrada com esses critérios de filtro.' 
                : 'Ainda não foram registradas mensagens de contato no seu site.'}
            </p>
            {(searchTerm || filterStatus !== 'all') && (
              <Button variant="outline" className="mt-6" onClick={() => { setSearchTerm(''); setFilterStatus('all'); }}>
                Ver todas as mensagens
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Apagar Mensagem Permanentemente?"
        message="Esta ação não pode ser revertida. Se você ainda não respondeu ao cliente, considere salvar os dados de contato primeiro."
        variant="danger"
        confirmText="Confirmar Exclusão"
        isLoading={isDeleting}
      />
    </AdminLayout>
  );
};
