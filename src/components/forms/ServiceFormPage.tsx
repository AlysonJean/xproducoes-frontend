import { useEffect, useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch } from '../../services/api';
import { 
  Form, 
  FormSection, 
  FormActions, 
  Input, 
  Textarea, 
  Button,
  Select
} from '../ui/StandardComponents';
import { ItemStatus, type Service } from '../../types/types';

// Schema para o formulário de serviço
const serviceFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  price: z.number().positive('Preço deve ser positivo'),
  duration: z.number().int().positive('Duração deve ser positiva').default(60),
  status: z.nativeEnum(ItemStatus).default(ItemStatus.ACTIVE),
});

type ServiceFormData = z.infer<typeof serviceFormSchema>;

interface ServiceFormProps {
  initialData?: Service | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ServiceForm: React.FC<ServiceFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const [submitLoading, setSubmitLoading] = useState(false);
  const isEditing = Boolean(initialData);
  const { addNotification } = useNotifications();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      duration: 60,
      status: ItemStatus.ACTIVE,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        description: initialData.description,
        price: initialData.price,
        duration: initialData.duration || 60,
        status: (initialData.status === 'AVAILABLE' || initialData.status === 'RENTED' 
          ? ItemStatus.ACTIVE 
          : initialData.status === 'UNAVAILABLE' 
            ? ItemStatus.INACTIVE 
            : initialData.status as ItemStatus) || ItemStatus.ACTIVE,
      });
    }
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<ServiceFormData> = async (data) => {
    try {
      setSubmitLoading(true);

      const payload = {
        ...data,
        price: Number(data.price),
        duration: Number(data.duration),
      };

      if (isEditing && initialData) {
        await apiFetch(`/services/${initialData.id}`, { 
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch('/services', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      addNotification({
        type: 'success',
        title: 'Sucesso',
        message: `Serviço ${isEditing ? 'atualizado' : 'criado'} com sucesso.`
      });

      onSuccess();
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Erro ao salvar serviço. Tente novamente.'
      });
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormSection 
        title="Dados do Serviço"
        description="Informações sobre o serviço oferecido (Staff, DJ, Mídia, etc)"
      >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome do Serviço"
              {...register('name')}
              error={errors.name?.message}
              placeholder="Ex: DJ Profissional"
            />
            
             <Input
              label="Preço Base (€)"
              type="number"
              step="0.01"
              {...register('price', { valueAsNumber: true })}
              error={errors.price?.message}
            />
          </div>

          <Textarea
            label="Descrição"
            {...register('description')}
            error={errors.description?.message}
            rows={3}
            placeholder="O que está incluso neste serviço?"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Duração Padrão (minutos)"
              type="number"
              {...register('duration', { valueAsNumber: true })}
              error={errors.duration?.message}
              helperText="Tempo estimado de duração do serviço"
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

export default ServiceForm;
