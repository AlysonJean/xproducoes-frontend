
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { bannerService } from '../../services/bannerService';
import { Banner } from '../../types/types';
import { api } from '../../services/api'; // For upload
import { Trash2, Edit2, Plus, Image as ImageIcon, Save, X } from 'lucide-react';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useNotifications } from '../../contexts/NotificationContext';

import { generateSeoFilename } from '../../utils/seoUtils';

export const BannerManagementPage = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addNotification } = useNotifications();

  const { register, handleSubmit, reset, setValue, getValues, formState: { errors } } = useForm<Partial<Banner>>();

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
    setValue('title', banner.title);
    setValue('description', banner.description);
    setValue('imageUrl', banner.imageUrl);
    setValue('mobileImageUrl', banner.mobileImageUrl);
    setValue('linkUrl', banner.linkUrl);
    setValue('active', banner.active);
    setValue('sortOrder', banner.sortOrder);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingBanner(null);
    reset({ active: true, sortOrder: 0 });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este banner?')) return;
    try {
      await bannerService.deleteBanner(id);
      addNotification({ type: 'success', title: 'Sucesso', message: 'Banner excluído' });
      loadBanners();
    } catch (error) {
      addNotification({ type: 'error', title: 'Erro', message: 'Falha ao excluir banner' });
    }
  };

  const onSubmit = async (data: Partial<Banner>) => {
    try {
      if (editingBanner?.id) {
        await bannerService.updateBanner(editingBanner.id, data);
        addNotification({ type: 'success', title: 'Sucesso', message: 'Banner atualizado' });
      } else {
        await bannerService.createBanner(data);
        addNotification({ type: 'success', title: 'Sucesso', message: 'Banner criado' });
      }
      setIsModalOpen(false);
      loadBanners();
    } catch (error) {
      addNotification({ type: 'error', title: 'Erro', message: 'Falha ao salvar banner' });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'mobileImageUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Gerar nome de arquivo otimizado para SEO
    const currentTitle = getValues('title');
    const seoFilename = generateSeoFilename('banners', currentTitle || 'novo-banner', field === 'mobileImageUrl' ? 'mobile' : 'desktop');

    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', 'banners');
    formData.append('fileName', seoFilename);

    try {
      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('Upload response:', res.data);
      // Assume resposta é { imageUrl: string }
      const url = res.data.imageUrl || res.data.url;
      
      if (url) {
        setValue(field, url);
        addNotification({ type: 'success', title: 'Upload OK', message: 'Imagem enviada com sucesso' });
      } else {
        throw new Error('URL da imagem não retornada');
      }
    } catch (error) {
      console.error(error);
      addNotification({ type: 'error', title: 'Erro', message: 'Falha no upload da imagem' });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gerenciamento de Banners</h1>
        <button 
          onClick={handleCreate}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90"
        >
          <Plus size={20} /> Novo Banner
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {banners.map((banner) => (
            <div key={banner.id} className="bg-card border rounded-lg overflow-hidden shadow-sm relative group">
              <div className="h-48 overflow-hidden relative">
                <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                {!banner.active && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold">
                    INATIVO
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg mb-1">{banner.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 truncate">{banner.description}</p>
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>Ordem: {banner.sortOrder}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(banner)} className="p-2 hover:bg-muted rounded-full text-blue-500">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(banner.id)} className="p-2 hover:bg-muted rounded-full text-red-500">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-2xl rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">{editingBanner ? 'Editar Banner' : 'Novo Banner'}</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Título</label>
                  <input {...register('title', { required: true })} className="w-full p-2 border rounded bg-background" />
                  {errors.title && <span className="text-red-500 text-xs">Obrigatório</span>}
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Descrição</label>
                  <textarea {...register('description')} className="w-full p-2 border rounded bg-background" rows={3} />
                </div>

                {/* Imagem Desktop */}
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Imagem Desktop (URL)</label>
                  <div className="flex gap-2">
                    <input {...register('imageUrl', { required: true })} className="w-full p-2 border rounded bg-background" placeholder="https://..." />
                    <label className="cursor-pointer bg-muted p-2 rounded hover:bg-muted/80">
                      <ImageIcon size={20} />
                      <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, 'imageUrl')} accept="image/*" />
                    </label>
                  </div>
                </div>

                {/* Imagem Mobile */}
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-medium mb-1">Imagem Mobile (Opcional)</label>
                  <div className="flex gap-2">
                    <input {...register('mobileImageUrl')} className="w-full p-2 border rounded bg-background" placeholder="https://..." />
                    <label className="cursor-pointer bg-muted p-2 rounded hover:bg-muted/80">
                      <ImageIcon size={20} />
                      <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, 'mobileImageUrl')} accept="image/*" />
                    </label>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Link de Destino</label>
                  <input {...register('linkUrl')} className="w-full p-2 border rounded bg-background" placeholder="/promocao" />
                </div>

                <div>
                   <label className="block text-sm font-medium mb-1">Ordem</label>
                   <input type="number" {...register('sortOrder')} className="w-full p-2 border rounded bg-background" defaultValue={0} />
                </div>

                <div className="flex items-center gap-2 mt-6">
                  <input type="checkbox" {...register('active')} className="w-4 h-4" defaultChecked />
                  <label className="text-sm font-medium">Ativo</label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded hover:bg-muted">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 flex items-center gap-2">
                  <Save size={18} /> Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
