// src/components/forms/CollaboratorFormPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { asArray } from '@/utils/normalize';
import { apiFetch, collaboratorFunctionsAPI } from '@/services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { CollaboratorFunction } from '@/types/types';
import { logger } from '../../utils/logger';
import {
  Form,
  FormSection,
  FormActions,
  Input,
  Select,
  Button
} from '@/components/ui/StandardComponents';
import { useFormDraft } from '../../hooks/useFormDraft';
import { DraftRestoreBanner } from '../ui/DraftRestoreBanner';

// Definimos o schema de forma mais simples para evitar conflitos de inferência no Vercel/TSC
const collaboratorSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  role: z.string().optional(),
  functionId: z.string().optional(),
  hourlyRate: z.union([z.string(), z.number()]).optional(), // Input HTML sempre envia string; number cobre valores vindos de initialData
  status: z.string(), // default 'ACTIVE' já é aplicado via defaultValues do useForm
});

type CollaboratorFormValues = z.infer<typeof collaboratorSchema>;

interface CollaboratorInitialData {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  functionId?: string;
  hourlyRate?: string | number;
  status?: string;
}

interface CollaboratorFormProps {
    initialData?: CollaboratorInitialData | null;
  onSuccess: () => void;
  onCancel: () => void;
  /** Notifica o formulário pai sobre alterações não salvas, para a trava de fechamento
   * acidental (ver useUnsavedChangesGuard, usado em CollaboratorListPage). */
  onDirtyChange?: (dirty: boolean) => void;
}

export const CollaboratorForm: React.FC<CollaboratorFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
  onDirtyChange,
}) => {
  const { addNotification } = useNotifications();
  const isEditing = Boolean(initialData);
  const [functions, setFunctions] = useState<CollaboratorFunction[]>([]);

  const draftKey = `xp-draft-collaborator-${initialData?.id || 'new'}`;
  const { save: saveDraft, load: loadDraft, clear: clearDraft } = useFormDraft<CollaboratorFormValues>(draftKey);
  const [draftPrompt, setDraftPrompt] = useState<{ values: CollaboratorFormValues; savedAt: number } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Usamos useForm sem o generic explícito se ele estiver causando problemas de tipos cruzados
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
    } = useForm<CollaboratorFormValues>({
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
        logger.error('Falha ao carregar funções:', 'CollaboratorFormPage', err);
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

    const draft = loadDraft();
    if (draft) setDraftPrompt(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, reset]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const watchedValues = watch();
  useEffect(() => {
    if (!isDirty) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveDraft(watchedValues), 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watchedValues), isDirty]);

  const handleRestoreDraft = () => {
    if (!draftPrompt) return;
    reset(draftPrompt.values);
    setDraftPrompt(null);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setDraftPrompt(null);
  };

    const onSubmit = async (data: CollaboratorFormValues) => {
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
      clearDraft();
      onSuccess();
    } catch (err) {
      logger.error('Erro', 'CollaboratorFormPage', err);
      addNotification({ type: 'error', title: 'Erro', message: 'Falha ao salvar colaborador' });
    }
  };

  return (
        <Form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {draftPrompt && (
        <DraftRestoreBanner
          savedAt={draftPrompt.savedAt}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      )}
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
