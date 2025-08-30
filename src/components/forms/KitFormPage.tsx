// Caminho: frontend/src/pages/admin/KitFormPage.tsx


import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch } from '../../services/api';
import type { Kit, Equipment } from '../../types/types';
import LoadingSpinner from '../ui/LoadingSpinner';
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

export const KitFormPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

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
        if (isEditing) {
          const kitData: Kit = await apiFetch(`/kits/${id}`);
          reset({
            name: kitData.name,
            description: kitData.description,
            price: kitData.price,
            equipmentIds: kitData.equipments.map((eq) => eq.id),
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
  }, [id, isEditing, reset]);

  const onSubmit: SubmitHandler<KitFormData> = async (data) => {
    setServerError(null);
    const formData = new FormData();
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
      if (isEditing) {
        await apiFetch(`/kits/${id}`, { method: 'PUT', body: formData });
      } else {
        await apiFetch('/kits', { method: 'POST', body: formData });
      }
      navigate('/admin/kits');
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Ocorreu um erro ao salvar o kit.');
    }
  };

  if (pageLoading) return <LoadingSpinner label="A carregar formulário do kit..." />;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {isEditing ? 'Editar Kit' : 'Adicionar Novo Kit'}
        </h1>
        <p className="text-muted-foreground">
          {isEditing ? 'Atualize as informações do kit' : 'Adicione um novo kit ao sistema'}
        </p>
      </div>

      {serverError && (
        <Alert 
          variant="error" 
          title="Erro" 
          description={serverError}
          onClose={() => setServerError(null)}
        />
      )}

      <Form onSubmit={handleSubmit(onSubmit)} className="bg-card border border-border rounded-xl p-8 shadow-sm">
        <FormSection 
          title="Informações do Kit"
          description="Preencha os dados básicos do kit"
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-card p-4 rounded-lg max-h-60 overflow-y-auto">
              {allEquipments.map((eq) => (
                <label key={eq.id} className="flex items-center space-x-2 cursor-pointer">
                  <Input
                    type="checkbox"
                    value={eq.id}
                    {...register('equipmentIds')}
                    className="form-checkbox h-5 w-5 text-primary bg-card border rounded"
                  />
                  <span>{eq.name}</span>
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
          title="Imagem do Kit"
          description="Adicione uma imagem representativa do kit"
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
            onClick={() => navigate('/admin/kits')}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {isEditing ? 'Atualizar Kit' : 'Criar Kit'}
          </Button>
        </FormActions>
      </Form>
    </div>
  );
};
