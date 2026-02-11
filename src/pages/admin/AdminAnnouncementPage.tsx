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
  MoreHorizontal,
  ArrowUpDown,
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
  Badge,
  Grid
} from '../../components/ui/StandardComponents';
import { useNotifications } from '@/contexts/NotificationContext';

const AdminAnnouncementPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [announcements, setAnnouncements] = useState<SocialAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
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
    if (!id) return;
    try {
      setLoading(true);
      const response = await socialService.getAnnouncements(id);
      setAnnouncements(Array.isArray(response) ? response : response.data || []);
    } catch (error) {
      console.error('Failed to fetch announcements', error);
      addNotification({ type: 'error', title: 'Erro', message: 'Falha ao carregar anúncios.' });
    } finally {
      setLoading(false);
    }
  }, [id, addNotification]);

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
      <AdminLayout title="Anúncios Telão" breadcrumbs={[{ name: 'Admin' }, { name: 'Anúncios' }]}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Sincronizando feed de anúncios..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Anúncios Telão" breadcrumbs={[{ name: 'Admin' }, { name: 'Anúncios' }]}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Comunicação Visual</h2>
              <p className="text-sm text-muted-foreground">Projete mensagens estratégicas no telão do evento.</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => handleOpenModal()} className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5" /> Novo Anúncio
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
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Total de Peças</p>
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
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Ativos no Momento</p>
                <p className="text-xl font-black text-foreground">{stats.active}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-purple-500/5 border-purple-500/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Tempo Médio/Exibição</p>
                <p className="text-xl font-black text-foreground">{stats.avgDuration.toFixed(1)}s</p>
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
                placeholder="Buscar por título ou corpo da mensagem..."
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

        {/* Announcements Table */}
        <Card className="overflow-hidden border-border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center gap-1 cursor-pointer">
                      Anúncio <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Frequência</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Exibição</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-right text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAnnouncements.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-border flex items-center justify-center overflow-hidden flex-shrink-0 mt-1">
                          <Megaphone className="h-5 w-5 text-primary/60" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1 italic">"{item.message}"</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest py-0.5">
                        A cada {item.frequency} slides
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 text-xs font-black text-foreground">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {item.duration}s
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <button 
                            onClick={() => toggleActive(item)}
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                item.isActive 
                                ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' 
                                : 'bg-muted text-muted-foreground hover:bg-muted/50'
                            }`}
                        >
                            {item.isActive ? 'Em Exibição' : 'Pausado'}
                        </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleOpenModal(item)}
                          className="h-8 w-8"
                          title="Refinar Criativo"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteClick(item.id)}
                          className="h-8 w-8"
                          title="Remover Anúncio"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 border-transparent">
                           <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
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
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6 text-muted-foreground/20 ring-8 ring-muted/10">
                <Megaphone className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Nenhum anúncio localizado</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">Crie alertas, chamadas ou mensagens especiais para engajar sua audiência.</p>
              <Button variant="outline" className="mt-6" onClick={() => setSearchTerm('')}>
                Limpar Filtros
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={handleCloseModal}
        title={editingItem ? 'Configurar Peça de Campanha' : 'Novo Card de Anúncio'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-bold text-foreground mb-2">Título do Alerta</label>
                <Input 
                    required
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder="Ex: Próxima Atração ou Sorteio"
                />
            </div>
            <div>
                <label className="block text-sm font-bold text-foreground mb-2">Corpo da Mensagem</label>
                <textarea 
                    required
                    className="w-full flex min-h-[100px] rounded-2xl border border-input bg-card px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all font-medium text-foreground" 
                    value={formData.message}
                    onChange={e => setFormData({...formData, message: e.target.value})}
                    placeholder="O texto que impactará os convidados no telão..."
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Frequência (Slides)</label>
                    <Input 
                        type="number"
                        min={1}
                        value={formData.frequency}
                        onChange={e => setFormData({...formData, frequency: Number(e.target.value)})}
                    />
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter mt-1.5">Aparece após N fotos.</p>
                </div>
                <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Duração (Segundos)</label>
                    <Input 
                        type="number"
                        min={3}
                        value={formData.duration}
                        onChange={e => setFormData({...formData, duration: Number(e.target.value)})}
                    />
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter mt-1.5">Tempo estático no telão.</p>
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={handleCloseModal}>Cancelar</Button>
                <Button type="submit" className="shadow-lg shadow-primary/20">{editingItem ? 'Salvar Configuração' : 'Publicar Anúncio'}</Button>
            </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Expurgar Anúncio?"
        message="Esta ação retirará a peça da programação do telão imediatamente. Você poderá criar uma nova a qualquer momento."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Confirmar Exclusão"
        cancelText="Manter Peça"
      />
    </AdminLayout>
  );
};

export default AdminAnnouncementPage;
