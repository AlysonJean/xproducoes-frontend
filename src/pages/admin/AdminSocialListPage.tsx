import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { socialService } from '../../services/socialService';
import { 
  Plus, 
  ExternalLink, 
  Instagram, 
  Tv, 
  Settings, 
  Trash2, 
  TrendingUp, 
  Calendar, 
  Search,
  XCircle
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

interface SocialWall {
    id: string;
    name?: string;
    hashtag: string;
    slug?: string;
    bookingId?: string;
}

const AdminSocialListPage: React.FC = () => {
    const [walls, setWalls] = useState<SocialWall[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [wallToDelete, setWallToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [newWall, setNewWall] = useState({ name: '', hashtag: '', slug: '' });
    const navigate = useNavigate();
    const { addNotification } = useNotifications();

    const fetchWalls = useCallback(async () => {
        try {
            setLoading(true);
            const response = await socialService.listWalls();
            setWalls(response.data || []);
        } catch (error) {
            console.error('Failed to fetch walls', error);
            addNotification({ type: 'error', title: 'Erro', message: 'Falha ao sincronizar murais sociais.' });
        } finally {
            setLoading(false);
        }
    }, [addNotification]);

    useEffect(() => {
        fetchWalls();
    }, [fetchWalls]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await socialService.createWall(newWall);
            addNotification({ type: 'success', title: 'Sucesso', message: 'Mural social criado com sucesso.' });
            setIsFormModalOpen(false);
            setNewWall({ name: '', hashtag: '', slug: '' });
            fetchWalls();
        } catch (err: any) {
            addNotification({ 
              type: 'error', 
              title: 'Falha na Criação', 
              message: err?.response?.data?.error || err?.message || 'Erro desconhecido' 
            });
        }
    };

    const handleDeleteClick = (id: string) => {
        setWallToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!wallToDelete) return;
        try {
            setIsDeleting(true);
            await socialService.deleteWall(wallToDelete);
            addNotification({ type: 'success', title: 'Mural Removido', message: 'O registro foi apagado permanentemente.' });
            fetchWalls();
            setIsDeleteModalOpen(false);
        } catch {
            addNotification({ type: 'error', title: 'Erro', message: 'Falha ao tentar apagar o mural.' });
        } finally {
            setIsDeleting(false);
            setWallToDelete(null);
        }
    };

    const filteredWalls = useMemo(() => {
        return walls.filter(w => 
            (w.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            w.hashtag.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [walls, searchTerm]);

    const stats = useMemo(() => ({
      total: walls.length,
      withBooking: walls.filter(w => w.bookingId).length,
      hashtagPopularity: 'Alta'
    }), [walls]);

    if (loading && walls.length === 0) {
        return (
            <AdminLayout title="Social Walls" breadcrumbs={[{ name: 'Admin' }, { name: 'Painel' }]}>
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <BrandLoader size={120} label="Iniciando radar de redes sociais..." />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout 
            title="Social Walls" 
            breadcrumbs={[{ name: 'Admin' }, { name: 'Painel' }, { name: 'Social Walls' }]}
        >
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                      <Instagram className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Social Wall Hub</h2>
                      <p className="text-sm text-muted-foreground">Gerencie o engajamento social em tempo real para seus eventos.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={() => setIsFormModalOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
                      <Plus className="h-5 w-5" /> Novo Mural
                    </Button>
                  </div>
                </div>

                {/* Stats Grid */}
                <Grid columns={{ sm: 1, md: 3 }} gap={4}>
                  <Card className="p-4 bg-primary/5 border-primary/10">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Tv className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Display Ativos</p>
                        <p className="text-xl font-black text-foreground">{stats.total}</p>
                      </div>
                    </div>
                  </Card>
                  
                  <Card className="p-4 bg-emerald-500/5 border-emerald-500/10">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Vinculados a Evento</p>
                        <p className="text-xl font-black text-foreground">{stats.withBooking}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-pink-500/5 border-pink-500/10">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Tendência hashtag</p>
                        <p className="text-xl font-black text-foreground">{stats.hashtagPopularity}</p>
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
                        placeholder="Buscar por nome do evento ou hashtag..."
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

                {/* Walls Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredWalls.map((wall) => (
                        <Card key={wall.id} className="overflow-hidden flex flex-col group p-0 border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
                             <div className="p-6 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-bold text-foreground leading-tight truncate">{wall.name || 'Mural Sem Identificação'}</h3>
                                        <div className="flex items-center gap-1.5 text-pink-500 font-black text-[10px] uppercase tracking-widest mt-2 bg-pink-500/5 py-1 px-2 rounded-lg border border-pink-500/10 self-start">
                                            <Instagram size={12} /> #{wall.hashtag}
                                        </div>
                                    </div>
                                    <Badge variant={wall.bookingId ? 'primary' : 'outline'} className="text-[9px] font-black uppercase tracking-tighter shrink-0">
                                        {wall.bookingId ? 'EVENTO' : 'LIVRE'}
                                    </Badge>
                                </div>

                                {wall.slug && (
                                     <div className="mb-6 bg-muted/30 border border-border/50 p-3 rounded-xl text-[10px] font-medium text-muted-foreground flex items-center justify-between">
                                        <span className="truncate mr-2 opacity-70 italic">Link público: /tv?slug={wall.slug}</span>
                                        <a href={`/tv?slug=${wall.slug}`} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/70 transition-colors shrink-0" title="Visualização em tempo real">
                                          <ExternalLink size={14}/>
                                        </a>
                                     </div>
                                )}

                                <div className="flex gap-2 mt-auto pt-4 border-t border-border/50">
                                    <Button 
                                        onClick={() => navigate(`/admin/social/${wall.id}`)}
                                        className="flex-1 h-10 shadow-sm"
                                        size="sm"
                                    >
                                        <Settings className="h-3.5 w-3.5 mr-2" /> Gerenciar
                                    </Button>
                                     <Button 
                                        variant="outline"
                                        size="icon"
                                        onClick={() => window.open(`/tv?slug=${wall.slug || ''}&code=${wall.id.substring(0,4)}`, '_blank')}
                                        className="h-10 w-10 border-border hover:border-primary hover:text-primary"
                                        title="Painel TV"
                                    >
                                        <Tv size={18} />
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => handleDeleteClick(wall.id)}
                                        className="h-10 w-10"
                                        title="Expurgar Mural"
                                    >
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                             </div>
                        </Card>
                    ))}

                    {filteredWalls.length === 0 && !loading && (
                        <div className="col-span-full py-24 text-center border-2 border-dashed border-border rounded-3xl bg-muted/20">
                             <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6 text-muted-foreground/20 ring-8 ring-muted/10">
                                <Instagram className="h-10 w-10" />
                              </div>
                             <h3 className="text-xl font-bold text-foreground">Nenhum mural sincronizado</h3>
                             <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">Crie seu primeiro Social Wall para capturar e exibir as fotos dos convidados em tempo real.</p>
                             <Button onClick={() => setIsFormModalOpen(true)} className="mt-6">Criar Primeiro Mural</Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            <Modal
              isOpen={isFormModalOpen}
              onClose={() => setIsFormModalOpen(false)}
              title="Parametrizar Novo Mural Social"
              size="md"
            >
                <form onSubmit={handleCreate} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Identificação do Mural</label>
                        <Input 
                            placeholder="Ex: Casamento João & Maria"
                            value={newWall.name}
                            onChange={e => setNewWall({...newWall, name: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Hashtag de Monitoramento (sem #)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-black">#</span>
                            <Input 
                                className="pl-8"
                                placeholder="festa_premium_2024"
                                value={newWall.hashtag}
                                onChange={e => setNewWall({...newWall, hashtag: e.target.value.replace('#', '')})}
                                required
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter mt-1.5">Fotos marcadas com esta tag aparecerão no feed.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-2">Slug da URL (Opcional)</label>
                        <Input 
                            placeholder="casamento-joao-maria"
                            value={newWall.slug}
                            onChange={e => setNewWall({...newWall, slug: e.target.value})}
                        />
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter mt-1.5">URL personalizada para acesso rápido (ex: /tv/seu-slug).</p>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                         <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>Cancelar</Button>
                         <Button type="submit" className="shadow-lg shadow-primary/20">Instanciar Mural</Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
              isOpen={isDeleteModalOpen}
              onClose={() => setIsDeleteModalOpen(false)}
              onConfirm={confirmDelete}
              title="Expurgar Mural Social?"
              message="Esta ação é definitiva. Todas as fotos vinculadas deixarão de ser exibidas no telão e o registro de hashtag será liberado."
              variant="danger"
              isLoading={isDeleting}
              confirmText="Confirmar Expurgo"
              cancelText="Manter Registro"
            />
        </AdminLayout>
    );
};

export default AdminSocialListPage;
