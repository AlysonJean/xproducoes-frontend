import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, apiFetch } from '../../services/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { 
  Form, 
  FormSection, 
  FormActions, 
  Input, 
  Textarea, 
  Button
} from '../ui/StandardComponents';
import { generateSeoFilename } from '../../utils/seoUtils';
import { Banner } from '../../types/types';
import LoadingSpinner from '../ui/LoadingSpinner';


// Schema
const bannerSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  imageUrl: z.string().min(1, 'URL da imagem é obrigatória'),
  mobileImageUrl: z.string().optional(),
  linkUrl: z.string().optional(),
  sortOrder: z.number().or(z.string().transform((val) => Number(val))).default(0),
  active: z.boolean().default(true),
});

type BannerFormData = z.infer<typeof bannerSchema>;

interface BannerFormProps {
  initialData?: Partial<Banner> | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const BannerForm: React.FC<BannerFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const isEditing = Boolean(initialData && initialData.id);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<BannerFormData>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      title: '',
      description: '',
      imageUrl: '',
      mobileImageUrl: '',
      linkUrl: '',
      sortOrder: 0,
      active: true,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title || '',
        description: initialData.description || '',
        imageUrl: initialData.imageUrl || '',
        mobileImageUrl: initialData.mobileImageUrl || '',
        linkUrl: initialData.linkUrl || '',
        sortOrder: initialData.sortOrder || 0,
        active: initialData.active ?? true,
      });
    } else {
        reset({
            active: true,
            sortOrder: 0
        });
    }
  }, [initialData, reset]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'mobileImageUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const setUploading = field === 'imageUrl' ? setUploadingDesktop : setUploadingMobile;
    setUploading(true);

    try {
      const currentTitle = getValues('title') || 'novo-banner';
      const seoFilename = generateSeoFilename('banners', currentTitle, field === 'mobileImageUrl' ? 'mobile' : 'desktop');

      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'banners');
      formData.append('fileName', seoFilename);

      // Using raw axios from 'api' because simple apiFetch might not handle FormData automagically the same way everywhere or we prefer explicit content-type
      // Actually standardizing on apiFetch is better but I saw axios usage in previous file. 
      // Using api.post as in previous file.
      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const url = res.data.imageUrl || res.data.url;
      if (url) {
        setValue(field, url);
        addNotification({ type: 'success', title: 'Upload concluído', message: 'Imagem carregada com sucesso' });
      } else {
        throw new Error('URL não retornada');
      }
    } catch (error) {
      console.error(error);
      addNotification({ type: 'error', title: 'Erro', message: 'Falha no upload da imagem' });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: BannerFormData) => {
    try {
      setLoading(true);
      // Ensure numeric
       const payload = {
            ...data,
            sortOrder: Number(data.sortOrder)
       };

      if (isEditing && initialData?.id) {
        await apiFetch(`/banners/${initialData.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        addNotification({ type: 'success', title: 'Sucesso', message: 'Banner atualizado.' });
      } else {
        await apiFetch(`/banners`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        addNotification({ type: 'success', title: 'Sucesso', message: 'Banner criado.' });
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      addNotification({ type: 'error', title: 'Erro', message: 'Falha ao salvar banner.' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner label="Salvando..." />;

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormSection title="Informações Básicas" description="Defina os textos principais do banner">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input
              label="Título"
              placeholder="Digite o título do banner"
              {...register('title')}
              error={errors.title?.message}
            />
          </div>
          <div className="col-span-2">
            <Textarea
              label="Descrição"
              placeholder="Descrição ou subtítulo (opcional)"
              {...register('description')}
              error={errors.description?.message}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title="Imagens" description="Faça upload ou cole a URL das imagens">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Input
                    label="Imagem Desktop (URL)"
                    placeholder="https://..."
                    {...register('imageUrl')}
                    error={errors.imageUrl?.message}
                />
                <div className="flex items-center gap-2">
                     <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                        {uploadingDesktop ? 'Enviando...' : '📷 Upload Desktop'}
                        <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'imageUrl')}
                            disabled={uploadingDesktop}
                        />
                     </label>
                </div>
            </div>

            <div className="space-y-2">
                <Input
                    label="Imagem Mobile (URL - Opcional)"
                    placeholder="https://..."
                    {...register('mobileImageUrl')}
                    error={errors.mobileImageUrl?.message}
                />
                <div className="flex items-center gap-2">
                     <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                        {uploadingMobile ? 'Enviando...' : '📱 Upload Mobile'}
                        <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'mobileImageUrl')}
                            disabled={uploadingMobile}
                        />
                     </label>
                </div>
            </div>
        </div>
      </FormSection>

      <FormSection title="Configurações" description="Link, ordenação e status">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Input
                label="Link de Destino"
                placeholder="/promocoes/verao"
                {...register('linkUrl')}
                error={errors.linkUrl?.message}
             />
             <Input
                type="number"
                label="Ordem de Exibição"
                {...register('sortOrder')}
                error={errors.sortOrder?.message}
             />
             <div className="col-span-2 pt-4">
                <div className="flex items-center space-x-2">
                    <input
                        type="checkbox" 
                        id="active"
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        {...register('active')}
                    />
                    <label htmlFor="active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Banner Ativo
                    </label>
                </div>
             </div>
        </div>
      </FormSection>

      <FormActions>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary">
          {isEditing ? 'Salvar Alterações' : 'Criar Banner'}
        </Button>
      </FormActions>
    </Form>
  );
};
