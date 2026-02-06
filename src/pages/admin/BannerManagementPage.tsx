import { useState, useEffect } from 'react';
import { bannerService } from '../../services/bannerService';
import { Banner } from '../../types/types';
import { Trash2, Edit2, Plus } from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { useNotifications } from '../../contexts/NotificationContext';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Modal } from '../../components/ui/StandardComponents';
import { BannerForm } from '../../components/forms/BannerForm';

export const BannerManagementPage = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addNotification } = useNotifications();

  const loadBanners = async () => {
    try {
      setLoading(true);
      const data = await bannerService.getAllBanners();
      setBanners(data);
    } catch (error) {
      console.error(error);
      addNotification({ type: 'error', title: 'Erro', message: 'Falha ao carregar banners' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingBanner(null);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
      setIsModalOpen(false);
      setEditingBanner(null);
      loadBanners();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este banner?')) return;
    try {
      await bannerService.deleteBanner(id);
      addNotification({ type: 'success', title: 'Sucesso', message: 'Banner excluído' });
      loadBanners();
    } catch (error) {
      console.error(error);
      addNotification({ type: 'error', title: 'Erro', message: 'Falha ao excluir banner' });
    }
  };

  return (
    <AdminLayout
      title="Gerenciamento de Banners"
      breadcrumbs={[{ name: 'Dashboard', href: '/admin/painel' }, { name: 'Banners' }]}
    >
      <div className="container mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Gerenciamento de Banners</h1>
          <button 
            onClick={handleCreate}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Plus size={20} /> Novo Banner
          </button>
        </div>

      {loading ? (
        <BrandLoader size={120} label="Carregando banners..." />
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {banners.map((banner) => (
            <div key={banner.id} className="bg-card border rounded-lg overflow-hidden shadow-sm relative group hover:shadow-md transition-shadow">
              <div className="h-48 overflow-hidden relative">
                <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                {!banner.active && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold backdrop-blur-sm">
                    INATIVO
                  </div>
                )}
              </div>
              <div className="p-4 space-y-2">
                <div>
                   <h3 className="font-bold text-lg leading-tight">{banner.title}</h3>
                   <p className="text-sm text-muted-foreground truncate">{banner.description}</p>
                </div>
                <div className="flex justify-between items-center text-sm text-muted-foreground pt-2 border-t border-border">
                  <span className="bg-muted px-2 py-1 rounded text-xs">Ordem: {banner.sortOrder}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(banner)} 
                      className="p-2 hover:bg-muted rounded-full text-blue-500 transition-colors"
                      title="Editar banner"
                      aria-label="Editar banner"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(banner.id)} 
                      className="p-2 hover:bg-muted rounded-full text-destructive transition-colors"
                      title="Excluir banner"
                      aria-label="Excluir banner"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBanner ? 'Editar Banner' : 'Novo Banner'}
        className="max-w-3xl"
      >
        <BannerForm 
            initialData={editingBanner}
            onSuccess={handleSuccess}
            onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      </div>
    </AdminLayout>
  );
};