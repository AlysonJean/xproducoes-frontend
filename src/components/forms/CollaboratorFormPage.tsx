// src/components/forms/CollaboratorFormPage.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch } from '@/services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  Form,
  FormSection,
  FormActions,
  Input,
  Select,
  Button
} from '@/components/ui/StandardComponents';

const collaboratorSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  role: z.enum(['PHOTOGRAPHER', 'VIDEOGRAPHER', 'EDITOR', 'ASSISTANT', 'OTHER']),
  hourlyRate: z.number().min(0, 'Valor deve ser positivo'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING_APPROVAL', 'SUSPENDED']),
});

type CollaboratorFormData = z.infer<typeof collaboratorSchema>;

interface CollaboratorFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export const CollaboratorForm: React.FC<CollaboratorFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
}) => {
  const { addNotification } = useNotifications();
  const isEditing = Boolean(initialData);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CollaboratorFormData>({
    resolver: zodResolver(collaboratorSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'PHOTOGRAPHER',
      hourlyRate: undefined,
      status: 'ACTIVE',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        email: initialData.email || '',
        role: initialData.role || 'PHOTOGRAPHER',
        hourlyRate: initialData.hourlyRate,
        status: initialData.status || 'ACTIVE',
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: CollaboratorFormData) => {
    try {
      const payload = {
        ...data,
        hourlyRate: Number(data.hourlyRate) || undefined,
      };

      if (isEditing && initialData?.id) {
        await apiFetch(`/collaborators/${initialData.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        addNotification({ type: 'success', title: 'Sucesso', message: 'Colaborador atualizado!' });
      } else {
        await apiFetch('/collaborators', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        addNotification({ type: 'success', title: 'Sucesso', message: 'Colaborador criado!' });
      }
      onSuccess();
    } catch (err) {
      console.error(err);
      addNotification({ type: 'error', title: 'Erro', message: 'Falha ao salvar colaborador' });
    }
  };

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormSection title="Dados Pessoais" description="Informações básicas do colaborador">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nome"
            placeholder="Nome completo"
            {...register('name')}
            error={errors.name?.message}
          />
          <Input
            label="Email"
            type="email"
            placeholder="email@exemplo.com"
            {...register('email')}
            error={errors.email?.message}
          />
        </div>
      </FormSection>

      <FormSection title="Dados Profissionais" description="Função e remuneração">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Função"
            {...register('role')}
            error={errors.role?.message}
            options={[
              { value: 'PHOTOGRAPHER', label: 'Fotógrafo' },
              { value: 'VIDEOGRAPHER', label: 'Videomaker' },
              { value: 'EDITOR', label: 'Editor' },
              { value: 'ASSISTANT', label: 'Assistente' },
              { value: 'OTHER', label: 'Outro' },
            ]}
          />
          <Input
            label="Valor Hora (R$)"
            type="number"
            step="0.01"
            placeholder="0.00"
            {...register('hourlyRate')}
            error={errors.hourlyRate?.message}
          />
          <Select
            label="Status"
            {...register('status')}
            error={errors.status?.message}
            options={[
              { value: 'ACTIVE', label: 'Ativo' },
              { value: 'INACTIVE', label: 'Inativo' },
              { value: 'PENDING_APPROVAL', label: 'Pendente' },
              { value: 'SUSPENDED', label: 'Suspenso' },
            ]}
          />
        </div>
      </FormSection>

      <FormActions>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Colaborador'}
        </Button>
      </FormActions>
    </Form>
  );
};
