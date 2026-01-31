// Caminho: frontend/src/pages/admin/EquipmentFormPage.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch } from '../../services/api';
import LoadingSpinner from '../ui/LoadingSpinner';
import { 
  Form, 
  FormSection, 
  FormActions, 
  Input, 
  Select, 
  Textarea, 
  Button
} from '../ui/StandardComponents';
import type { Category, Equipment } from '../../types/types';
import { generateSeoFilename } from '../../utils/seoUtils';

// Schema simplificado para o formulário de equipamento
const equipmentFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  pricePerHour: z.number().positive('Preço deve ser positivo'),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  quantity: z.number().int().positive('Quantidade deve ser positiva').optional(),
  images: z.any().optional(), // FileList será tratado no submit
});

type EquipmentFormData = z.infer<typeof equipmentFormSchema>;

// Helper removido - usando apiFetch centralizado que já gerencia autenticação


export const EquipmentFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Removido: equipment não utilizado
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isEditing] = useState(!!id);

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
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Buscar categorias — o backend retorna um array puro, porém manter compatibilidade com { data: [...] }
  const categoriesResponse = await apiFetch('/api/categories');
        if (Array.isArray(categoriesResponse)) {
          setCategories(categoriesResponse as Category[]);
        } else if ((categoriesResponse as any)?.data && Array.isArray((categoriesResponse as any).data)) {
          setCategories((categoriesResponse as any).data as Category[]);
        } else {
          setCategories([]);
        }

        // Se tiver ID, buscar equipamento para edição
        if (id) {
          const equipmentResponse = (await apiFetch(`/equipment/${id}`)) as { data: Equipment };
          const equipmentData = equipmentResponse.data;
          // setEquipment removido (não utilizado)

          // Preencher o formulário com dados do equipamento
          reset({
            name: equipmentData.name,
            description: equipmentData.description,
            pricePerHour: equipmentData.pricePerHour,
            categoryId: equipmentData.categoryId,
            quantity: equipmentData.quantity,
          });
        }
      } catch {
        // erro ao buscar dados
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, reset]);

  const onSubmit: SubmitHandler<EquipmentFormData> = async (data) => {
    try {
      setSubmitLoading(true);

      const formData = new FormData();
      
      // Generate SEO-friendly filename
      const categoryName = categories.find(c => c.id === data.categoryId)?.name;
      const seoFilename = generateSeoFilename('equipments', data.name, categoryName);
      formData.append('fileName', seoFilename);

      formData.append('name', data.name);
      formData.append('description', data.description);
      formData.append('pricePerHour', data.pricePerHour.toString());
      formData.append('categoryId', data.categoryId);

      if (data.quantity) {
        formData.append('quantity', data.quantity.toString());
      }

      // Adicionar imagens se houver
      // Backend expects a single file field named 'image' (uploadSingle('image'))
      if (data.images && data.images.length > 0) {
        // If multiple files, send the first as 'image' (required) and the rest as 'images'
        const files = Array.from((data.images as unknown) as FileList);
        if (files.length > 0) {
          formData.append('image', files[0]); // required by backend
        }
        for (let i = 1; i < files.length; i++) {
          formData.append('images', files[i]);
        }
      }

      if (isEditing) {
        await apiFetch(`/equipment/${id}`, { method: 'PUT', body: formData });
      } else {
        // Create new equipment
        await apiFetch('/equipment', { method: 'POST', body: formData });
      }

      navigate('/admin/equipment');
    } catch {
      // erro ao salvar equipamento
      alert('Erro ao salvar equipamento. Tente novamente.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {id ? 'Editar Equipamento' : 'Criar Novo Equipamento'}
          </h1>
          <p className="text-muted-foreground">
            {id ? 'Atualize as informações do equipamento' : 'Adicione um novo equipamento ao sistema'}
          </p>
        </div>

        <Form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <FormSection 
            title="Informações Básicas"
            description="Dados principais do equipamento"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Nome do Equipamento"
                {...register('name')}
                error={errors.name?.message}
                placeholder="Ex: Câmera Canon EOS R5"
                description="Nome identificador do equipamento"
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
                placeholder="Selecione uma categoria"
              />
            </div>

            <Textarea
              label="Descrição"
              {...register('description')}
              error={errors.description?.message}
              rows={4}
              placeholder="Descreva as características, especificações técnicas e detalhes importantes do equipamento..."
              description="Informações detalhadas que ajudem os clientes a entender o equipamento"
            />
          </FormSection>

          <FormSection 
            title="Configurações Comerciais"
            description="Preços e disponibilidade"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Preço por Hora (R$)"
                type="number"
                step="0.01"
                {...register('pricePerHour', { valueAsNumber: true })}
                error={errors.pricePerHour?.message}
                placeholder="0.00"
                description="Valor cobrado por hora de locação"
              />

              <Input
                label="Quantidade Disponível"
                type="number"
                {...register('quantity', { valueAsNumber: true })}
                error={errors.quantity?.message}
                placeholder="1"
                description="Quantas unidades você possui deste equipamento"
              />
            </div>
          </FormSection>

          <FormSection 
            title="Imagens"
            description="Fotos do equipamento para o catálogo"
          >
            <Input
              type="file"
              label="Imagens do Equipamento"
              {...register('images')}
              multiple
              accept="image/*"
              error={errors.images ? String(errors.images.message) : undefined}
              description="Selecione uma ou mais imagens do equipamento (formato JPG, PNG, etc.)"
            />
          </FormSection>

          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/equipment')}
              disabled={submitLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={submitLoading}
              disabled={submitLoading}
            >
              {id ? 'Atualizar Equipamento' : 'Criar Equipamento'}
            </Button>
          </FormActions>
        </Form>
      </div>
    </div>
  );
};

export default EquipmentFormPage;
