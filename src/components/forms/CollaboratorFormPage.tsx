// src/components/forms/CollaboratorFormPage.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { asArray } from '@/utils/normalize';
import { apiFetch, collaboratorFunctionsAPI } from '@/services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import { useModal } from '@/components/modals/ModalContext';
import { CollaboratorFunction } from '@/types/types';
import { logger } from '../../utils/logger';
import {
  Form,
  FormSection,
  FormActions,
  Input,
  Select,
  Checkbox,
  Button
} from '@/components/ui/StandardComponents';
import { COLLABORATOR_ROLE_OPTIONS } from '../../utils/collaboratorRoles';
import { useFormDraft } from '../../hooks/useFormDraft';
import { DraftRestoreBanner } from '../ui/DraftRestoreBanner';

// Definimos o schema de forma mais simples para evitar conflitos de inferência no Vercel/TSC
const collaboratorSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  role: z.string().optional(),
  functionId: z.string().optional(),
  hourlyRate: z.union([z.string(), z.number()]).optional(), // Input HTML sempre envia string; number cobre valores vindos de initialData
  status: z.string(), // default 'ACTIVE' já é aplicado via defaultValues do useForm
  // D3: só no cadastro novo ("Enviar link de acesso por e-mail", marcada por padrão).
  sendAccessLink: z.boolean().optional(),
});

type CollaboratorFormValues = z.infer<typeof collaboratorSchema>;

interface CollaboratorInitialData {
  id?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  role?: string;
  functionId?: string | null;
  hourlyRate?: string | number | null;
  status?: string;
}

// Resposta de POST /collaborators (D3): o colaborador criado, mais o link de acesso (só com a caixa
// marcada) e se o e-mail com o link saiu.
interface CreatedCollaborator {
  id?: string;
  inviteUrl?: string;
  emailSent?: boolean;
}

// D3: o aviso fica na janela, junto do link. A notificação some em 5 s, e sem o aviso o admin podia
// fechar a janela achando que o e-mail tinha saído.
const EMAIL_NOT_SENT_NOTICE =
  'O e-mail com o link não foi enviado. Copie o link e mande ao colaborador, por WhatsApp por exemplo.';

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
  const { openModal } = useModal();
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
      phone: '',
      role: 'OTHER',
      functionId: '',
      hourlyRate: '',
      status: 'ACTIVE',
      sendAccessLink: true,
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
        phone: initialData.phone || '',
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
      const phone = (data.phone || '').trim();
      const hourlyRate = data.hourlyRate === '' || data.hourlyRate == null ? null : Number(data.hourlyRate);

      // Achado (revisão antes do deploy): gravava em /admin/collaborators, rota que o backend nunca
      // teve (404 em todo "Salvar"). As rotas reais, só de admin, são POST/PUT /collaborators.
      if (isEditing && initialData?.id) {
        // D3 (aprovada em 02/11/2026): na edição, apagar a função ou o valor grava vazio. Antes o campo
        // apagado ia como undefined (fica fora do JSON): o servidor mantinha o valor antigo e a tela dizia
        // "Colaborador atualizado!". Função, valor e telefone vão vazios só quando havia um e ele foi
        // apagado; campo que já estava vazio não vai (o servidor não precisa "desligar" o que não existe).
        const hadRate = initialData.hourlyRate != null && initialData.hourlyRate !== '';
        await apiFetch(`/collaborators/${initialData.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            phone: phone || (initialData.phone ? '' : undefined),
            role: data.role,
            functionId: data.functionId || (initialData.functionId ? null : undefined),
            hourlyRate: hourlyRate ?? (hadRate ? null : undefined),
            status: data.status,
          }),
        });
        addNotification({ type: 'success', title: 'Sucesso', message: 'Colaborador atualizado!' });
        clearDraft();
        onSuccess();
        return;
      }

      // D3: "Novo colaborador" cria a conta e o perfil juntos. Com a caixa marcada, o servidor gera o link
      // de acesso (72 h, para a pessoa criar a senha), manda por e-mail e devolve o link, que a janela do
      // convite mostra para copiar. Com a caixa desmarcada, não há link nem janela.
      const created = await apiFetch<CreatedCollaborator>('/collaborators', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: phone || undefined,
          role: data.role,
          // Sem função personalizada o select manda '', que a validação de id do backend recusa (400).
          functionId: data.functionId || undefined,
          hourlyRate: hourlyRate ?? undefined,
          status: data.status,
          sendAccessLink: data.sendAccessLink === true,
        }),
      });
      addNotification({
        type: 'success',
        title: 'Sucesso',
        message: !created?.inviteUrl
          ? 'Colaborador criado, sem link de acesso. Para mandar depois, use “Reenviar link de acesso” na lista.'
          : created.emailSent
            ? 'Colaborador criado. O link de acesso foi enviado por e-mail.'
            : 'Colaborador criado!',
      });
      clearDraft();
      onSuccess();
      if (created?.inviteUrl) {
        openModal('invite', {
          inviteUrl: created.inviteUrl,
          notice: created.emailSent === false ? EMAIL_NOT_SENT_NOTICE : undefined,
        });
      }
    } catch (err) {
      logger.error('Erro', 'CollaboratorFormPage', err);
      // D3: a recusa do servidor aparece com o motivo (ex.: 409 "Já existe uma conta com este e-mail.").
      const message = err instanceof Error && err.message ? err.message : 'Falha ao salvar colaborador';
      addNotification({ type: 'error', title: 'Erro', message });
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
          {/* D3: o telefone entra no cadastro (é por ele que o admin manda o link pelo WhatsApp). */}
          <Input
            label="Telefone"
            type="tel"
            placeholder="(31) 99999-9999"
            {...register('phone')}
            error={errors.phone?.message as string}
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
            // Achado (auditoria do design system): a lista local tinha "EDITOR", que o enum do
            // backend não tem (salvar falhava), e faltavam 6 funções reais. Fonte única agora.
            options={COLLABORATOR_ROLE_OPTIONS}
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

      {!isEditing && (
        <FormSection title="Acesso ao painel" description="Como o colaborador entra no painel da equipe">
          <Checkbox
            label="Enviar link de acesso por e-mail"
            description="A pessoa cria a própria senha pelo link, que vale 72 horas. Depois de criar, o link também aparece aqui para copiar. Desmarque se ela ainda não vai usar o painel; dá para mandar depois em “Reenviar link de acesso”."
            {...register('sendAccessLink')}
          />
        </FormSection>
      )}

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
