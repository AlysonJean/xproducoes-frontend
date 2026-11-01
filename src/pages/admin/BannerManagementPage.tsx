import { useState, useEffect, useCallback, useMemo } from 'react';
import { bannerService } from '../../services/bannerService';
import { Banner } from '../../types/types';
import {
  Trash2,
  Edit2,
  Plus,
  Image as ImageIcon,
  Activity,
  Layers,
  Search,
  XCircle,
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
  Input,
  Alert,
} from '../../components/ui/StandardComponents';
import { BannerForm } from '../../components/forms/BannerForm';
import { logger } from '../../utils/logger';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';

// Título e breadcrumb iguais no carregamento e com dados (antes: "Vitrine Visual" → "Banners & Vitrines",
// e o breadcrumb trocava para "Painel › Assets").
const PAGE_TITLE = 'Banners';
const BREADCRUMBS = [{ name: 'Admin', href: '/admin/painel' }, { name: 'Banners' }];

export const BannerManagementPage = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
      setLoadError(null);
    } catch (error: unknown) {
      logger.error('Erro', 'BannerManagementPage', error);
      // Antes: só toast (e nada em caso de 429) — a tela mostrava "nenhum banner", como se não houvesse.
      setLoadError(
        error instanceof Error && error.message.includes('429')
          ? 'Muitas requisições seguidas. Aguarde alguns segundos e tente de novo.'
          : 'Não foi possível carregar os banners.'
      );
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

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
      addNotification({ type: 'success', title: 'Banner salvo', message: 'As alterações foram aplicadas.' });
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
      addNotification({ type: 'success', title: 'Banner excluído', message: 'O banner foi removido da página inicial.' });
      loadBanners(false);
      setIsDeleteModalOpen(false);
    } catch (error) {
      logger.error('Erro', 'BannerManagementPage', error);
      addNotification({ type: 'error', title: 'Erro ao excluir', message: 'Não foi possível excluir o banner.' });
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

  // Achado (auditoria): o 3º card "Alcance da Rede" mostrava o texto fixo "Global". Removido.
  const stats = useMemo(() => ({
    total: banners.length,
    active: banners.filter(b => b.active).length,
  }), [banners]);

  if (loading && banners.length === 0) {
    return (
      <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Carregando banners…" />
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
                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Banners da página inicial</h2>
                  <p className="text-sm text-muted-foreground">Imagens e chamadas exibidas no topo do site.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreate} size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  Novo banner
                </Button>
              </div>
            </div>

            {/* Indicadores */}
            <Grid columns={{ sm: 1, md: 2 }} gap={4}>
              <Card className="p-4 bg-primary/5 border-primary/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total de banners</p>
                    <p className="text-xl font-black text-foreground">{stats.total}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-success/5 border-success/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center text-success border border-success/20">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Banners ativos</p>
                    <p className="text-xl font-black text-foreground">{stats.active}</p>
                  </div>
                </div>
              </Card>
            </Grid>

            {/* Busca */}
            <Card className="p-4 bg-card/50 border-border">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar por título ou descrição..."
                    aria-label="Buscar banners"
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
                action={<Button size="sm" variant="outline" onClick={() => loadBanners()}>Tentar de novo</Button>}
              />
            )}

            {/* Grade de banners */}
            {!(loadError && banners.length === 0) && (
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
                        {/* Sobre a foto escurecida: texto branco é exceção do guia */}
                        <Badge variant="outline" className="text-white border-white/40 px-4 py-1.5 backdrop-blur-md">Inativo</Badge>
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                        <Badge variant="outline" className="bg-card shadow-lg">
                           Ordem: {banner.sortOrder}
                        </Badge>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="mb-4">
                       <h3 className="font-bold text-lg text-foreground leading-tight mb-1 truncate">{banner.title}</h3>
                       <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{banner.description || 'Sem descrição.'}</p>
                    </div>

                    <div className="flex gap-2 mt-auto pt-6 border-t border-border/50">
                        <Button
                            variant="primary"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleEdit(banner)}
                            leftIcon={<Edit2 size={14} />}
                        >
                            Editar
                        </Button>
                        <Button
                            variant="destructive"
                            size="icon"
                            className="h-10 w-10"
                            onClick={() => handleDeleteClick(banner.id)}
                            title="Excluir banner"
                            aria-label={`Excluir banner ${banner.title}`}
                        >
                            <Trash2 size={18} />
                        </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {filteredBanners.length === 0 && !loading && (
                <div className="col-span-full py-24 text-center border-2 border-dashed border-border rounded-3xl bg-muted/20">
                     <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      </div>
                     <h3 className="text-xl font-bold text-foreground">Nenhum banner encontrado</h3>
                     <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">
                       {searchTerm ? 'Ajuste a busca.' : 'Cadastre o primeiro banner da página inicial.'}
                     </p>
                     {searchTerm ? (
                       <Button variant="outline" size="sm" onClick={() => setSearchTerm('')} className="mt-6">Limpar busca</Button>
                     ) : (
                       <Button size="sm" onClick={handleCreate} className="mt-6">Novo banner</Button>
                     )}
                </div>
              )}
            </div>
            )}
        </div>

        <Modal
            isOpen={isFormModalOpen}
            onClose={() => guardClose(() => setIsFormModalOpen(false))}
            title={editingBanner ? 'Editar banner' : 'Novo banner'}
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

        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title="Excluir banner?"
          message="A imagem sai da página inicial imediatamente. Esta ação não pode ser desfeita."
          variant="danger"
          isLoading={isDeleting}
          confirmText="Excluir"
          cancelText="Cancelar"
        />
    </AdminLayout>
  );
};

export default BannerManagementPage;
