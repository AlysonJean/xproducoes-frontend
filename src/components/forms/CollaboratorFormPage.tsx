// src/components/forms/CollaboratorFormPage.tsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { asArray } from '@/utils/normalize';
import { apiFetch, collaboratorFunctionsAPI } from '@/services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { CollaboratorFunction } from '@/types/types';
import {
  Form,
  FormSection,
  FormActions,
  Input,
  Select,
  Button
} from '@/components/ui/StandardComponents';

// Definimos o schema de forma mais simples para evitar conflitos de inferência no Vercel/TSC
const collaboratorSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  role: z.string().optional(),
  functionId: z.string().optional(),
  hourlyRate: z.any().optional(), // Deixamos como any para flexibilidade no Input
  status: z.string().default('ACTIVE'),
});


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
  const [functions, setFunctions] = useState<CollaboratorFunction[]>([]);

  // Usamos useForm sem o generic explícito se ele estiver causando problemas de tipos cruzados
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<any>({
    resolver: zodResolver(collaboratorSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'OTHER',
      functionId: '',
      hourlyRate: '',
      status: 'ACTIVE',
    },
  });

  useEffect(() => {
    const loadFunctions = async () => {
      try {
        const resp = await collaboratorFunctionsAPI.getAll();
        setFunctions(asArray(resp.data));
      } catch (err) {
        console.error('Falha ao carregar funções:', err);
      }
    };
    loadFunctions();
  }, []);

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        email: initialData.email || '',
        role: initialData.role || 'OTHER',
        functionId: initialData.functionId || '',
        hourlyRate: initialData.hourlyRate || '',
        status: initialData.status || 'ACTIVE',
      });
    }
  }, [initialData, reset]);

  const onSubmit = async (data: any) => {
    try {
      // Tratamento manual dos dados para garantir que tipos como hourlyRate vão corretamente para o backend
      const payload = {
        ...data,
        hourlyRate: (data.hourlyRate === '' || data.hourlyRate === null) ? undefined : Number(data.hourlyRate),
      };

      if (isEditing && initialData?.id) {
        await apiFetch(`/admin/collaborators/${initialData.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        addNotification({ type: 'success', title: 'Sucesso', message: 'Colaborador atualizado!' });
      } else {
        await apiFetch('/admin/collaborators', {
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
    <Form onSubmit={handleSubmit(onSubmit) as any} className="space-y-6">
      <FormSection title="Dados Pessoais" description="Informações básicas do colaborador">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nome"
            placeholder="Nome completo"
            {...register('name')}
            error={errors.name?.message as string}
          />
          <Input
            label="Email"
            type="email"
            placeholder="email@exemplo.com"
            {...register('email')}
            error={errors.email?.message as string}
          />
        </div>
      </FormSection>

      <FormSection title="Dados Profissionais" description="Função e remuneração">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Função (Personalizada)"
            {...register('functionId')}
            error={errors.functionId?.message as string}
            options={[
              { value: '', label: 'Selecione uma função...' },
              ...functions.map(f => ({ value: f.id, label: f.name }))
            ]}
          />
          <Select
            label="Papel (Sistema)"
            {...register('role')}
            error={errors.role?.message as string}
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
            error={errors.hourlyRate?.message as string}
          />
          <Select
            label="Status"
            {...register('status')}
            error={errors.status?.message as string}
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
        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          {isEditing ? 'Salvar Alterações' : 'Criar Colaborador'}
        </Button>
      </FormActions>
    </Form>
  );
};
