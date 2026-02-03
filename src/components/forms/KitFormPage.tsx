// src/components/forms/KitFormPage.tsx
import { useEffect, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateSeoFilename } from '../../utils/seoUtils';
import { apiFetch } from '../../services/api';
import type { Kit, Equipment } from '../../types/types';
import { BrandLoader } from '../ui/BrandLoader';
import {
  Form,
  FormSection,
  FormActions,
  Input,
  Button,
  Alert,
  Textarea
} from '../ui/StandardComponents';

const kitFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  price: z.number().positive('Preço deve ser positivo'),
  equipmentIds: z.array(z.string()).min(1, 'Selecione pelo menos um equipamento'),
  images: z.any().optional(),
});

type KitFormData = z.infer<typeof kitFormSchema>;

interface KitFormProps {
  initialData?: Kit | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const KitForm: React.FC<KitFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const isEditing = Boolean(initialData);

  const [allEquipments, setAllEquipments] = useState<Equipment[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<KitFormData>({
    resolver: zodResolver(kitFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      equipmentIds: [],
    },
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const equipData = await apiFetch('/equipments');
        setAllEquipments(equipData as Equipment[]);
        if (initialData) {
          reset({
            name: initialData.name,
            description: initialData.description,
            price: initialData.price,
            equipmentIds: initialData.equipments.map((eq) => eq.id),
          });
        }
      } catch (err) {
        setServerError(
          err instanceof Error
            ? err.message
            : 'Falha ao carregar dados. Por favor, tente novamente.'
        );
      } finally {
        setPageLoading(false);
      }
    };
    fetchInitialData();
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<KitFormData> = async (data) => {
    setServerError(null);
    const formData = new FormData();
    
    // SEO Filename
    const seoFilename = generateSeoFilename('kits', data.name);
    formData.append('fileName', seoFilename);

    formData.append('name', data.name);
    formData.append('description', data.description);
    formData.append('price', String(data.price));
    data.equipmentIds.forEach((eqId) => formData.append('equipmentIds[]', eqId));
    if (data.images && data.images instanceof FileList && data.images.length > 0) {
      const file = data.images[0];
      if (file) {
        formData.append('image', file);
      }
    }
    try {
      if (isEditing && initialData) {
        await apiFetch(`/kits/${initialData.id}`, { method: 'PUT', body: formData });
      } else {
        await apiFetch('/kits', { method: 'POST', body: formData });
      }
      onSuccess();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Ocorreu um erro ao salvar o kit.');
    }
  };

  if (pageLoading) return <BrandLoader size={100} label="Carregando formulário..." />;

  return (
    <div className="space-y-6">
      {serverError && (
        <Alert 
          variant="error" 
          title="Erro" 
          description={serverError}
          onClose={() => setServerError(null)}
        />
      )}

      <Form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection 
          title="Dados do Kit"
          description=""
        >
          <Input
            label="Nome do Kit"
            {...register('name')}
            error={errors.name?.message}
            placeholder="Digite o nome do kit"
            required
          />

          <Textarea
            label="Descrição"
            {...register('description')}
            error={errors.description?.message}
            placeholder="Descreva o kit em detalhes"
            rows={3}
            required
          />

          <Input
            label="Preço do Kit"
            type="number"
            step="0.01"
            {...register('price', { valueAsNumber: true })}
            error={errors.price?.message}
            placeholder="0.00"
            required
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Selecione os Equipamentos
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-muted/40 p-4 rounded-lg max-h-48 overflow-y-auto border">
              {allEquipments.map((eq) => (
                <label key={eq.id} className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-1 rounded">
                  <Input
                    type="checkbox"
                    value={eq.id}
                    {...register('equipmentIds')}
                    className="form-checkbox h-4 w-4 text-primary rounded border"
                  />
                  <span className="text-sm">{eq.name}</span>
                </label>
              ))}
            </div>
            {errors.equipmentIds && (
              <p className="text-sm text-destructive flex items-center gap-1">
                {errors.equipmentIds.message}
              </p>
            )}
          </div>
        </FormSection>

        <FormSection 
          title="Imagem"
          description=""
        >
          <Input
            type="file"
            label="Imagem do Kit"
            {...register('images')}
            accept="image/*"
            error={errors.images ? String(errors.images.message) : undefined}
            description="Formatos aceitos: JPG, PNG, GIF (máx. 10MB)"
            required={false}
          />
        </FormSection>

        <FormActions>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {isEditing ? 'Salvar' : 'Criar Kit'}
          </Button>
        </FormActions>
      </Form>
    </div>
  );
};

export default KitForm;
