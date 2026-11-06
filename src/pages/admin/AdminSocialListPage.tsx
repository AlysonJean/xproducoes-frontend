import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { socialService } from '../../services/socialService';
import {
  Plus,
  ExternalLink,
  Instagram,
  Tv,
  Settings,
  Trash2,
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
  Grid,
  Alert,
} from '../../components/ui/StandardComponents';
import { useNotifications } from '@/contexts/NotificationContext';
import { logger } from '../../utils/logger';

interface SocialWall {
    id: string;
    name?: string;
    hashtag: string;
    slug?: string;
    bookingId?: string;
}

// Título e breadcrumb constantes, em português (antes "Social Walls", com breadcrumb diferente no loading).
const PAGE_TITLE = 'Mural social';
const BREADCRUMBS = [{ name: 'Admin', href: '/admin/painel' }, { name: 'Mural social' }];

const AdminSocialListPage: React.FC = () => {
    const [walls, setWalls] = useState<SocialWall[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
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
            // Achado (lote 12): desde adcea6a (31/03/2026) o interceptor do axios tira o envelope { success, data }
            // e chega a lista de murais direto; ler `.data` de novo deixava a lista sempre vazia. Aceita os dois
            // formatos.
            const list: unknown = Array.isArray(response) ? response : (response as { data?: unknown } | undefined)?.data;
            setWalls(Array.isArray(list) ? (list as SocialWall[]) : []);
            setLoadError(null);
        } catch (error) {
            // Antes: só toast, e a tela dizia "Nenhum mural sincronizado".
            logger.error('Failed to fetch walls', 'AdminSocialListPage', error);
            setLoadError('Não foi possível carregar os murais.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWalls();
    }, [fetchWalls]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // D5 (Q4): o servidor acrescenta um código aleatório ao endereço; o aviso mostra o endereço final.
            // O interceptor do axios já tira o envelope { success, data }: chega o mural (aceita os dois formatos).
            const created = (await socialService.createWall(newWall)) as unknown as { slug?: unknown; data?: { slug?: unknown } } | undefined;
            const slug = created?.slug ?? created?.data?.slug;
            const finalSlug = typeof slug === 'string' ? slug : null;
            addNotification({
              type: 'success',
              title: 'Mural criado',
              message: finalSlug ? `Endereço do telão: /tv?slug=${finalSlug}` : 'Mural social criado com sucesso.',
            });
            setIsFormModalOpen(false);
            setNewWall({ name: '', hashtag: '', slug: '' });
            fetchWalls();
        } catch (err: unknown) {
            const message = axios.isAxiosError(err)
              ? err.response?.data?.error || err.message
              : err instanceof Error ? err.message : 'Erro desconhecido';
            addNotification({
              type: 'error',
              title: 'Erro ao criar mural',
              message
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
            addNotification({ type: 'success', title: 'Mural excluído', message: 'O mural foi apagado.' });
            fetchWalls();
            setIsDeleteModalOpen(false);
        } catch {
            addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível excluir o mural.' });
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

    // Achado (auditoria): o 3º card "Tendência hashtag" mostrava "Alta" fixo, e "Display Ativos"
    // contava todos os murais (não só os ativos). Ficam as duas contagens reais, com rótulo correto.
    const stats = useMemo(() => ({
      total: walls.length,
      withBooking: walls.filter(w => w.bookingId).length,
    }), [walls]);

    if (loading && walls.length === 0) {
        return (
            <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <BrandLoader size={120} label="Carregando murais…" />
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
                      <Instagram className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Murais sociais</h2>
                      <p className="text-sm text-muted-foreground">Fotos dos convidados exibidas no telão, com moderação.</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => setIsFormModalOpen(true)} size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                      Novo mural
                    </Button>
                  </div>
                </div>

                {/* Indicadores */}
                <Grid columns={{ sm: 1, md: 2 }} gap={4}>
                  <Card className="p-4 bg-primary/5 border-primary/10">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Tv className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Murais</p>
                        <p className="text-xl font-black text-foreground">{stats.total}</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-success/5 border-success/10">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Vinculados a reserva</p>
                        <p className="text-xl font-black text-foreground">{stats.withBooking}</p>
                      </div>
                    </div>
                  </Card>
                </Grid>

                {/* Busca */}
                <Card className="p-4 bg-card/50 border-border">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Buscar por nome ou hashtag..."
                        aria-label="Buscar murais"
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
                    action={<Button size="sm" variant="outline" onClick={fetchWalls}>Tentar de novo</Button>}
                  />
                )}

                {/* Grade de murais */}
                {!(loadError && walls.length === 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredWalls.map((wall) => (
                        <Card key={wall.id} className="overflow-hidden flex flex-col group p-0 border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
                             <div className="p-6 flex flex-col h-full">
                                <div className="flex justify-between items-start gap-3 mb-6">
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-bold text-foreground leading-tight truncate">{wall.name || 'Mural sem nome'}</h3>
                                        <div className="inline-flex items-center gap-1.5 text-primary font-bold text-sm mt-2 bg-primary/5 py-1 px-2 rounded-lg border border-primary/10">
                                            <Instagram size={14} aria-hidden="true" /> #{wall.hashtag}
                                        </div>
                                    </div>
                                    <Badge variant={wall.bookingId ? 'primary' : 'outline'} className="shrink-0">
                                        {wall.bookingId ? 'Reserva' : 'Avulso'}
                                    </Badge>
                                </div>

                                {wall.slug && (
                                     <div className="mb-6 bg-muted/30 border border-border p-3 rounded-xl text-sm text-muted-foreground flex items-center justify-between gap-2">
                                        <span className="truncate">Endereço público: /tv?slug={wall.slug}</span>
                                        <a
                                          href={`/tv?slug=${wall.slug}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-primary hover:text-primary/70 transition-colors shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                          title="Abrir o telão em nova aba"
                                          aria-label={`Abrir o telão de ${wall.name || wall.hashtag} em nova aba`}
                                        >
                                          <ExternalLink size={16}/>
                                        </a>
                                     </div>
                                )}

                                <div className="flex gap-2 mt-auto pt-4 border-t border-border/50">
                                    <Button
                                        onClick={() => navigate(`/admin/social/${wall.id}`)}
                                        className="flex-1"
                                        size="sm"
                                        leftIcon={<Settings className="h-4 w-4" />}
                                    >
                                        Gerenciar
                                    </Button>
                                     <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => window.open(`/tv?slug=${wall.slug || ''}&code=${wall.id.substring(0,4)}`, '_blank')}
                                        className="h-10 w-10"
                                        title="Abrir telão"
                                        aria-label={`Abrir telão de ${wall.name || wall.hashtag}`}
                                    >
                                        <Tv size={18} />
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => handleDeleteClick(wall.id)}
                                        className="h-10 w-10"
                                        title="Excluir mural"
                                        aria-label={`Excluir mural ${wall.name || wall.hashtag}`}
                                    >
                                        <Trash2 size={18} />
                                    </Button>
                                </div>
                             </div>
                        </Card>
                    ))}

                    {filteredWalls.length === 0 && !loading && (
                        <div className="col-span-full py-24 text-center border-2 border-dashed border-border rounded-3xl bg-muted/20">
                             <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6 text-muted-foreground">
                                <Instagram className="h-10 w-10" />
                              </div>
                             <h3 className="text-xl font-bold text-foreground">Nenhum mural encontrado</h3>
                             <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">
                               {searchTerm ? 'Ajuste a busca.' : 'Crie o primeiro mural para exibir as fotos dos convidados no telão.'}
                             </p>
                             {searchTerm ? (
                               <Button variant="outline" size="sm" onClick={() => setSearchTerm('')} className="mt-6">Limpar busca</Button>
                             ) : (
                               <Button size="sm" onClick={() => setIsFormModalOpen(true)} className="mt-6">Criar mural</Button>
                             )}
                        </div>
                    )}
                </div>
                )}
            </div>

            <Modal
              isOpen={isFormModalOpen}
              onClose={() => setIsFormModalOpen(false)}
              title="Novo mural social"
              size="md"
            >
                <form onSubmit={handleCreate} className="space-y-6">
                    <Input
                        label="Nome do mural"
                        placeholder="Ex.: Casamento João e Maria"
                        value={newWall.name}
                        onChange={e => setNewWall({...newWall, name: e.target.value})}
                        required
                    />
                    <Input
                        label="Hashtag monitorada (sem #)"
                        description="Fotos marcadas com esta hashtag aparecem no mural."
                        leftIcon={<span className="font-bold" aria-hidden="true">#</span>}
                        placeholder="festa_ana_2026"
                        value={newWall.hashtag}
                        onChange={e => setNewWall({...newWall, hashtag: e.target.value.replace('#', '')})}
                        required
                    />
                    {/* O texto antigo dizia "/tv/seu-slug", mas o endereço real é /tv?slug=… */}
                    <Input
                        label="Endereço do telão (opcional)"
                        description="Se ficar em branco, usamos o nome do mural. No fim entra um código aleatório (ex.: casamento-ana-7k3p), para ninguém achar o mural de uma festa particular por adivinhação."
                        placeholder="casamento-joao-maria"
                        value={newWall.slug}
                        onChange={e => setNewWall({...newWall, slug: e.target.value})}
                    />
                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                         <Button type="button" variant="outline" onClick={() => setIsFormModalOpen(false)}>Cancelar</Button>
                         <Button type="submit">Criar mural</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
              isOpen={isDeleteModalOpen}
              onClose={() => setIsDeleteModalOpen(false)}
              onConfirm={confirmDelete}
              title="Excluir mural?"
              message="As fotos vinculadas deixam de aparecer no telão e a hashtag fica livre para outro mural. Esta ação não pode ser desfeita."
              variant="danger"
              isLoading={isDeleting}
              confirmText="Excluir"
              cancelText="Cancelar"
            />
        </AdminLayout>
    );
};

export default AdminSocialListPage;
