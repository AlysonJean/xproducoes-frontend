// src/components/forms/EquipmentFormPage.tsx
import { useEffect, useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch } from '../../services/api';
import { BrandLoader } from '../ui/BrandLoader';
import { 
  Form, 
  FormSection, 
  FormActions, 
  Input, 
  Select, 
  Textarea, 
  Button
} from '../ui/StandardComponents';
import { ItemStatus, type Category, type Equipment } from '../../types/types';
import { generateSeoFilename } from '../../utils/seoUtils';

// Schema simplificado para o formulário de equipamento
const equipmentFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  pricePerHour: z.number().positive('Preço deve ser positivo'),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  quantity: z.number().int().positive('Quantidade deve ser positiva'),
  status: z.nativeEnum(ItemStatus),
  images: z.custom<FileList>().optional(),
});

type EquipmentFormData = z.infer<typeof equipmentFormSchema>;

interface EquipmentFormProps {
  initialData?: Equipment | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const EquipmentForm: React.FC<EquipmentFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const isEditing = Boolean(initialData);
  const { addNotification } = useNotifications();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      pricePerHour: 0,
      categoryId: '',
      quantity: 1,
      status: ItemStatus.ACTIVE,
    },
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        // Backend returns mixed structures sometimes, normalize it
        const categoriesResponse = await apiFetch<Category[] | { data: Category[] }>('/categories');
        
        let cats: Category[] = [];
        if (Array.isArray(categoriesResponse)) {
          cats = categoriesResponse;
        } else if (categoriesResponse && 'data' in categoriesResponse && Array.isArray(categoriesResponse.data)) {
          cats = categoriesResponse.data;
        }
        setCategories(cats);
        
        if (initialData) {
          reset({
            name: initialData.name,
            description: initialData.description,
            pricePerHour: initialData.pricePerHour,
            categoryId: initialData.categoryId || '',
            quantity: initialData.quantity || 1,
            status: (initialData.status === 'AVAILABLE' || initialData.status === 'RENTED' 
              ? ItemStatus.ACTIVE 
              : initialData.status === 'UNAVAILABLE' 
                ? ItemStatus.INACTIVE 
                : initialData.status as ItemStatus) || ItemStatus.ACTIVE,
          });
        }
      } catch (err) {
        console.error('Failed to load form data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<EquipmentFormData> = async (data) => {
    try {
      setSubmitLoading(true);

      const formData = new FormData();
      
      const categoryName = categories.find(c => c.id === data.categoryId)?.name;
      const seoFilename = generateSeoFilename('equipments', data.name, categoryName);
      formData.append('fileName', seoFilename);

      formData.append('name', data.name);
      formData.append('description', data.description);
      formData.append('pricePerHour', data.pricePerHour.toString());
      formData.append('categoryId', data.categoryId);
      formData.append('status', data.status);

      if (data.quantity) {
        formData.append('quantity', data.quantity.toString());
      }

      if (data.images && data.images.length > 0) {
        const files = Array.from((data.images as unknown) as FileList);
        if (files.length > 0) {
          formData.append('image', files[0]);
        }
        for (let i = 1; i < files.length; i++) {
          formData.append('images', files[i]);
        }
      }

      if (isEditing && initialData) {
        await apiFetch(`/equipment/${initialData.id}`, { method: 'PUT', body: formData });
      } else {
        await apiFetch('/equipment', { method: 'POST', body: formData });
      }

      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar equipamento. Tente novamente.';
      addNotification({
        type: 'error',
        title: 'Erro ao Salvar',
        message: errorMessage
      });
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <BrandLoader size={100} label="Carregando..." />
      </div>
    );
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormSection 
        title="Dados do Equipamento"
        description=""
      >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome"
              {...register('name')}
              error={errors.name?.message}
              placeholder="Ex: Câmera Canon EOS R5"
            />

            <Select
              label="Categoria"
              {...register('categoryId')}
              options={[
                { value: '', label: 'Selecione uma categoria' },
                ...categories.map(category => ({
                  value: category.id,
                  label: category.name
                }))
              ]}
              error={errors.categoryId?.message}
            />
          </div>

          <Textarea
            label="Descrição"
            {...register('description')}
            error={errors.description?.message}
            rows={3}
            placeholder="Descrição detalhada do equipamento"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Preço por Hora (€)"
              type="number"
              step="0.01"
              {...register('pricePerHour', { valueAsNumber: true })}
              error={errors.pricePerHour?.message}
            />

            <Input
              label="Quantidade"
              type="number"
              {...register('quantity', { valueAsNumber: true })}
              error={errors.quantity?.message}
            />

            <Select
              label="Status"
              {...register('status')}
              options={[
                { value: ItemStatus.ACTIVE, label: 'Ativo' },
                { value: ItemStatus.MAINTENANCE, label: 'Em Manutenção' },
                { value: ItemStatus.COMING_SOON, label: 'Em Breve' },
                { value: ItemStatus.INACTIVE, label: 'Inativo' },
              ]}
              error={errors.status?.message}
            />
          </div>

          <div className="space-y-2">
            <label 
              htmlFor="equipment-images"
              className="block text-sm font-medium text-foreground cursor-pointer"
            >
              Imagens
            </label>
            <input
              id="equipment-images"
              type="file"
              multiple
              accept="image/*"
              className="block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90"
              {...register('images')}
            />
            {initialData?.imageUrl && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Imagem atual:</p>
                <img 
                  src={initialData.imageUrl} 
                  alt={initialData.name} 
                  className="h-20 w-20 object-cover rounded border"
                />
              </div>
            )}
          </div>
        </FormSection>

        <FormActions>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={submitLoading}
            disabled={submitLoading}
          >
            {submitLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </FormActions>
      </Form>
  );
};

export default EquipmentForm;
