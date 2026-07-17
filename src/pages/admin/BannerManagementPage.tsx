import { useState, useEffect, useCallback, useMemo } from 'react';
import { bannerService } from '../../services/bannerService';
import { Banner } from '../../types/types';
import { 
  Trash2, 
  Edit2, 
  Plus, 
  Image as ImageIcon, 
  MousePointer2, 
  Activity, 
  Layers,
  Search,
  XCircle,
  MoreHorizontal
} from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { useNotifications } from '../../contexts/NotificationContext';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { 
  Button, 
  Card, 
  Modal, 
  ConfirmModal, 
  Badge, 
  Grid, 
  Input 
} from '../../components/ui/StandardComponents';
import { BannerForm } from '../../components/forms/BannerForm';
import { logger } from '../../utils/logger';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';

export const BannerManagementPage = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormDirty, setIsFormDirty] = useState(false);
  const { guardClose, isConfirmOpen, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard(isFormDirty);
  const { addNotification } = useNotifications();

  const loadBanners = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const data = await bannerService.getAllBanners();
      setBanners(data || []);
    } catch (error: unknown) {
      logger.error('Erro', 'BannerManagementPage', error);
      if (error instanceof Error && error.message.includes('429')) return;
      addNotification({ 
        type: 'error', 
        title: 'Falha de Sincronização', 
        message: 'Não foi possível carregar a galeria de banners.' 
      });
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setIsFormModalOpen(true);
  };

  const handleCreate = () => {
    setEditingBanner(null);
    setIsFormModalOpen(true);
  };

  const handleSuccess = () => {
      setIsFormModalOpen(false);
      setEditingBanner(null);
      loadBanners();
      addNotification({ type: 'success', title: 'Operação Concluída', message: 'Alterações aplicadas com sucesso.' });
  };

  const handleDeleteClick = (id: string) => {
    setIdToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!idToDelete) return;
    try {
      setIsDeleting(true);
      await bannerService.deleteBanner(idToDelete);
      addNotification({ type: 'success', title: 'Expurgado', message: 'O banner foi removido da vitrine principal.' });
      loadBanners(false);
      setIsDeleteModalOpen(false);
    } catch (error) {
      logger.error('Erro', 'BannerManagementPage', error);
      addNotification({ type: 'error', title: 'Erro de Exclusão', message: 'Não foi possível remover o ativo.' });
    } finally {
      setIsDeleting(false);
      setIdToDelete(null);
    }
  };

  const filteredBanners = useMemo(() => {
    return banners.filter(b => 
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [banners, searchTerm]);

  const stats = useMemo(() => ({
    total: banners.length,
    active: banners.filter(b => b.active).length,
    coverage: 'Global'
  }), [banners]);

  if (loading && banners.length === 0) {
    return (
      <AdminLayout title="Vitrine Visual" breadcrumbs={[{ name: 'Admin' }, { name: 'Banners' }]}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Renderizando ativos de marketing..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
        title="Banners & Vitrines" 
        breadcrumbs={[{ name: 'Admin' }, { name: 'Painel' }, { name: 'Assets' }]}
    >
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground tracking-tight">Curation Hub: Banners</h2>
                  <p className="text-sm text-muted-foreground font-medium">Gerencie a identidade visual e chamadas principais da landing page.</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleCreate} className="gap-2 shadow-lg shadow-primary/20">
                  <Plus className="h-5 w-5" /> Adicionar Asset
                </Button>
              </div>
            </div>

            {/* Stats Grid */}
            <Grid columns={{ sm: 1, md: 3 }} gap={4}>
              <Card className="p-4 bg-primary/5 border-primary/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Total de Assets</p>
                    <p className="text-xl font-black text-foreground">{stats.total}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 bg-emerald-500/5 border-emerald-500/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Campanhas Ativas</p>
                    <p className="text-xl font-black text-foreground">{stats.active}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-blue-500/5 border-blue-500/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                    <MousePointer2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Alcance da Rede</p>
                    <p className="text-xl font-black text-foreground">{stats.coverage}</p>
                  </div>
                </div>
              </Card>
            </Grid>

            {/* Filters and Search */}
            <Card className="p-4 bg-card/50 border-border">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título da campanha ou descrição..."
                    className="pl-11"
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

            {/* Banners Grid */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredBanners.map((banner) => (
                <Card key={banner.id} className="group overflow-hidden flex flex-col p-0 border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-2xl hover:-translate-y-1 duration-500">
                  <div className="h-56 overflow-hidden relative bg-muted">
                    <img 
                      src={banner.imageUrl} 
                      alt={banner.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {!banner.active && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                        <Badge variant="outline" className="text-white border-white/40 font-black tracking-[0.2em] px-4 py-1.5 backdrop-blur-md">INATIVO</Badge>
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                        <Badge variant="primary" className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 shadow-lg shadow-black/20">
                           Ordem: {banner.sortOrder}
                        </Badge>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="mb-4">
                       <h3 className="font-black text-lg text-foreground leading-tight tracking-tighter mb-1 truncate">{banner.title}</h3>
                       <p className="text-[11px] text-muted-foreground font-medium line-clamp-2 leading-relaxed italic">"{banner.description || 'Nenhuma descrição detalhada...'}"</p>
                    </div>
                    
                    <div className="flex gap-2 mt-auto pt-6 border-t border-border/50">
                        <Button
                            variant="primary"
                            className="flex-1 font-black uppercase text-[10px] tracking-widest h-10 shadow-lg shadow-primary/20"
                            onClick={() => handleEdit(banner)}
                        >
                            <Edit2 size={14} className="mr-2" /> Editar Asset
                        </Button>
                        <Button
                            variant="destructive"
                            size="icon"
                            className="h-10 w-10"
                            onClick={() => handleDeleteClick(banner.id)}
                            title="Remover Asset"
                        >
                            <Trash2 size={18} />
                        </Button>
                        <Button variant="outline" size="icon" className="h-10 w-10 opacity-50">
                           <MoreHorizontal size={18} />
                        </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {filteredBanners.length === 0 && !loading && (
                <div className="col-span-full py-32 text-center border-2 border-dashed border-border rounded-3xl bg-muted/20">
                     <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6 text-muted-foreground/10 ring-8 ring-muted/5">
                        <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                     <h3 className="text-xl font-black text-foreground uppercase tracking-widest">Ativo Não Encontrado</h3>
                     <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2 font-medium">Nenhum banner corresponde aos seus critérios de busca atuais.</p>
                     <Button variant="outline" onClick={() => setSearchTerm('')} className="mt-8 font-black uppercase text-[10px] tracking-widest">Limpar Filtros</Button>
                </div>
              )}
            </div>
        </div>

        {/* Form Modal */}
        <Modal
            isOpen={isFormModalOpen}
            onClose={() => guardClose(() => setIsFormModalOpen(false))}
            title={editingBanner ? 'Refinar Campanha Visual' : 'Novo Asset de Marketing'}
            size="lg"
        >
            <BannerForm
                initialData={editingBanner}
                onDirtyChange={setIsFormDirty}
                onSuccess={handleSuccess}
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

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title="Expurgar Ativo Visual?"
          message="Esta imagem será removida imediatamente da vitrine pública. Esta ação é considerada destrutiva e definitiva para este registro."
          variant="danger"
          isLoading={isDeleting}
          confirmText="Confirmar Exclusão"
          cancelText="Manter Asset"
        />
    </AdminLayout>
  );
};

export default BannerManagementPage;