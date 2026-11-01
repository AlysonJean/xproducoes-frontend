import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { socialService, SocialAnnouncement } from '../../services/socialService';
import {
  Plus,
  Trash2,
  Edit2,
  Megaphone,
  TrendingUp,
  Clock,
  XCircle,
  Search,
  MessageSquare
} from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { BrandLoader } from '../../components/ui/BrandLoader';
import {
  Button,
  Card,
  Modal,
  ConfirmModal,
  Input,
  Textarea,
  Badge,
  Grid,
  Alert,
} from '../../components/ui/StandardComponents';
import { useNotifications } from '@/contexts/NotificationContext';
import { logger } from '../../utils/logger';

const PAGE_TITLE = 'Anúncios do telão';
const BREADCRUMBS = [
  { name: 'Admin', href: '/admin/painel' },
  { name: 'Mural social', href: '/admin/social' },
  { name: 'Anúncios' },
];

const AdminAnnouncementPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [announcements, setAnnouncements] = useState<SocialAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SocialAnnouncement | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { addNotification } = useNotifications();

  // Form State
  const [formData, setFormData] = useState<Partial<SocialAnnouncement>>({
    title: '',
    message: '',
    type: 'TEXT',
    duration: 10,
    frequency: 10,
    isActive: true
  });

  const fetchAnnouncements = useCallback(async () => {
    // Sem id na rota o loading ficava girando para sempre.
    if (!id) { setLoading(false); return; }
    try {
      setLoading(true);
      const response = await socialService.getAnnouncements(id);
      setAnnouncements(Array.isArray(response) ? response : response.data || []);
      setLoadError(null);
    } catch (error) {
      // Antes: só toast, e a tabela dizia "Nenhum anúncio localizado".
      logger.error('Failed to fetch announcements', 'AdminAnnouncementPage', error);
      setLoadError('Não foi possível carregar os anúncios.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleOpenModal = (item?: SocialAnnouncement) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({
        title: '',
        message: '',
        type: 'TEXT',
        duration: 10,
        frequency: 10,
        isActive: true
      });
    }
    setIsFormModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsFormModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      if (editingItem) {
        await socialService.updateAnnouncement(editingItem.id, formData);
        addNotification({ type: 'success', title: 'Sucesso', message: 'Anúncio atualizado.' });
      } else {
        await socialService.createAnnouncement(id, formData);
        addNotification({ type: 'success', title: 'Sucesso', message: 'Anúncio criado.' });
      }
      fetchAnnouncements();
      handleCloseModal();
    } catch {
      addNotification({ type: 'error', title: 'Erro', message: 'Erro ao salvar anúncio.' });
    }
  };

  const handleDeleteClick = (announcementId: string) => {
    setAnnouncementToDelete(announcementId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!announcementToDelete) return;
    try {
      setIsDeleting(true);
      await socialService.deleteAnnouncement(announcementToDelete);
      setAnnouncements(prev => prev.filter(a => a.id !== announcementToDelete));
      addNotification({ type: 'success', title: 'Excluído', message: 'Anúncio removido com sucesso.' });
      setIsDeleteModalOpen(false);
    } catch {
      addNotification({ type: 'error', title: 'Erro', message: 'Erro ao excluir anúncio.' });
    } finally {
      setIsDeleting(false);
      setAnnouncementToDelete(null);
    }
  };

  const toggleActive = async (item: SocialAnnouncement) => {
    try {
      await socialService.updateAnnouncement(item.id, { isActive: !item.isActive });
      setAnnouncements(prev => prev.map(a => a.id === item.id ? { ...a, isActive: !a.isActive } : a));
      addNotification({
        type: 'success',
        title: item.isActive ? 'Desativado' : 'Ativado',
        message: `Anúncio ${item.isActive ? 'pausado' : 'retomado'} com sucesso.`
      });
    } catch {
       addNotification({ type: 'error', title: 'Erro', message: 'Falha ao alterar status.' });
    }
  };

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(a =>
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.message.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [announcements, searchTerm]);

  const stats = useMemo(() => ({
    total: announcements.length,
    active: announcements.filter(a => a.isActive).length,
    avgDuration: announcements.length > 0 ? announcements.reduce((acc, curr) => acc + (curr.duration || 0), 0) / announcements.length : 0
  }), [announcements]);

  if (loading && announcements.length === 0) {
    return (
      <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Carregando anúncios…" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Mensagens no telão</h2>
              <p className="text-sm text-muted-foreground">Avisos exibidos entre as fotos do mural durante o evento.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => handleOpenModal()} size="sm" leftIcon={<Plus className="h-4 w-4" />}>
              Novo anúncio
            </Button>
          </div>
        </div>

        {/* Indicadores */}
        <Grid columns={{ sm: 1, md: 3 }} gap={4}>
          <Card className="p-4 bg-primary/5 border-primary/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total de anúncios</p>
                <p className="text-xl font-black text-foreground">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-success/5 border-success/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Em exibição</p>
                <p className="text-xl font-black text-foreground">{stats.active}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-info/5 border-info/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-info/10 flex items-center justify-center text-info">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Duração média</p>
                <p className="text-xl font-black text-foreground">{stats.avgDuration.toFixed(1)}s</p>
              </div>
            </div>
          </Card>
        </Grid>

        {/* Busca */}
        <Card className="p-4 bg-card/50 border-border">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Buscar por título ou mensagem..."
                aria-label="Buscar anúncios"
                leftIcon={<Search className="h-4 w-4" />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0"
              onClick={() => setSearchTerm('')}
              title="Limpar busca"
              aria-label="Limpar busca"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {loadError && (
          <Alert
            variant="error"
            title="Erro ao carregar"
            description={loadError}
            action={<Button size="sm" variant="outline" onClick={fetchAnnouncements}>Tentar de novo</Button>}
          />
        )}

        {/* Tabela — o cabeçalho "Anúncio" tinha ícone de ordenação sem ordenação; o botão "mais" não fazia nada. */}
        {!(loadError && announcements.length === 0) && (
        <Card className="overflow-hidden border-border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Anúncio</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Frequência</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Duração</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-right text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAnnouncements.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                          <Megaphone className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">{item.message}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="outline">
                        A cada {item.frequency} fotos
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 text-sm font-bold text-foreground">
                        <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                        {item.duration}s
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <Button
                            size="xs"
                            variant={item.isActive ? 'success' : 'ghost'}
                            className={item.isActive ? '' : 'bg-muted text-muted-foreground'}
                            onClick={() => toggleActive(item)}
                            aria-pressed={item.isActive}
                            title={item.isActive ? 'Clique para pausar' : 'Clique para retomar'}
                        >
                            {item.isActive ? 'Em exibição' : 'Pausado'}
                        </Button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1.5 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleOpenModal(item)}
                          className="h-8 w-8"
                          title="Editar anúncio"
                          aria-label={`Editar anúncio ${item.title}`}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteClick(item.id)}
                          className="h-8 w-8"
                          title="Excluir anúncio"
                          aria-label={`Excluir anúncio ${item.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAnnouncements.length === 0 && !loading && (
            <div className="py-24 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6 text-muted-foreground">
                <Megaphone className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Nenhum anúncio encontrado</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">
                {searchTerm ? 'Ajuste a busca.' : 'Crie avisos, chamadas ou mensagens para exibir no telão.'}
              </p>
              {searchTerm ? (
                <Button variant="outline" size="sm" className="mt-6" onClick={() => setSearchTerm('')}>
                  Limpar busca
                </Button>
              ) : (
                <Button size="sm" className="mt-6" onClick={() => handleOpenModal()}>
                  Novo anúncio
                </Button>
              )}
            </div>
          )}
        </Card>
        )}
      </div>

      <Modal
        isOpen={isFormModalOpen}
        onClose={handleCloseModal}
        title={editingItem ? 'Editar anúncio' : 'Novo anúncio'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
            <Input
                label="Título"
                required
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="Ex.: Próxima atração ou sorteio"
            />
            <Textarea
                label="Mensagem"
                required
                className="min-h-[100px] text-sm"
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
                placeholder="Texto exibido no telão"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                    label="Frequência (fotos)"
                    description="Aparece a cada N fotos."
                    type="number"
                    min={1}
                    value={formData.frequency}
                    onChange={e => setFormData({...formData, frequency: Number(e.target.value)})}
                />
                <Input
                    label="Duração (segundos)"
                    description="Tempo do aviso na tela."
                    type="number"
                    min={3}
                    value={formData.duration}
                    onChange={e => setFormData({...formData, duration: Number(e.target.value)})}
                />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={handleCloseModal}>Cancelar</Button>
                <Button type="submit">{editingItem ? 'Salvar' : 'Publicar anúncio'}</Button>
            </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir anúncio?"
        message="O anúncio sai da programação do telão imediatamente. Você pode criar outro a qualquer momento."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Excluir"
        cancelText="Cancelar"
      />
    </AdminLayout>
  );
};

export default AdminAnnouncementPage;
