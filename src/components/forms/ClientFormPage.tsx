import React, { useState, useEffect, useRef } from 'react';
import { Form, FormActions, Input, Button } from '@/components/ui/StandardComponents';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '@/services/api';
import { useModal } from '@/components/modals/ModalContext';
import { generateSeoFilename } from '@/utils/seoUtils';
import type { Client } from '@/types/types';
import { useFormDraft } from '../../hooks/useFormDraft';
import { DraftRestoreBanner } from '../ui/DraftRestoreBanner';

interface ClientFormProps {
  initialData?: Client | null;
  onSuccess: () => void;
  onCancel: () => void;
  /** Notifica o formulário pai sobre alterações não salvas, para a trava de fechamento
   * acidental (ver useUnsavedChangesGuard, usado em admin/ClientsPage). */
  onDirtyChange?: (dirty: boolean) => void;
}

interface DraftableClientData {
  name: string;
  email: string;
  phone: string;
}

interface CreateClientResponse {
  tempPassword?: string;
  inviteUrl?: string;
  /** Aviso do servidor quando o cliente foi criado, mas a foto não subiu (adminController.createClient). */
  warning?: string;
  client?: { id?: string };
  clientId?: string;
  id?: string;
}

export const ClientForm: React.FC<ClientFormProps> = ({ initialData, onSuccess, onCancel, onDirtyChange }) => {
  const { addNotification } = useNotifications();
  const { openModal } = useModal();

  const isEditing = Boolean(initialData);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  const draftKey = `xp-draft-client-${initialData?.id || 'new'}`;
  const { save: saveDraft, load: loadDraft, clear: clearDraft } = useFormDraft<DraftableClientData>(draftKey);
  const [draftPrompt, setDraftPrompt] = useState<{ values: DraftableClientData; savedAt: number } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setEmail(initialData.email);
      setPhone(initialData.phone || '');
    } else {
      setName('');
      setEmail('');
      setPhone('');
    }

    const draft = loadDraft();
    if (draft) setDraftPrompt(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (!isDirty) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveDraft({ name, email, phone }), 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [name, email, phone, isDirty, saveDraft]);

  const handleRestoreDraft = () => {
    if (!draftPrompt) return;
    setName(draftPrompt.values.name);
    setEmail(draftPrompt.values.email);
    setPhone(draftPrompt.values.phone);
    setDraftPrompt(null);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setDraftPrompt(null);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nome é obrigatório';
    if (!email.trim()) e.email = 'Email é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Achado (auditoria ponta a ponta): "Reenviar convite" chamava uma rota que não existia e, mesmo com ela,
  // a janela seguiria mostrando o link do cadastro, que o reenvio derruba (o servidor troca o token). Agora a
  // janela mostra o link novo, o aviso diz se o e-mail saiu e a recusa do servidor aparece com o motivo. Um
  // reenvio por vez: com dois cliques seguidos, a janela podia ficar com o link do pedido que respondeu por
  // último, já derrubado pelo outro. A trava fica na função, não no estado do formulário, que fecha logo
  // depois de criar o cliente (ClientListPage).
  const openInviteModal = (data: { tempPassword?: string; inviteUrl?: string; clientId?: string }) => {
    let resending = false;
    openModal('invite', {
      inviteUrl: data.inviteUrl,
      tempPassword: data.tempPassword,
      onResend: async () => {
        if (!data.clientId) {
          addNotification({ type: 'error', title: 'Erro', message: 'ID do cliente não disponível para reenviar' });
          return;
        }
        if (resending) return;
        resending = true;
        try {
          const result = await apiFetch<{ inviteUrl?: string; emailSent?: boolean }>(
            `/admin/clients/${data.clientId}/resend-invite`,
            { method: 'POST' },
          );
          if (result?.inviteUrl) openInviteModal({ ...data, inviteUrl: result.inviteUrl });
          if (result?.emailSent === false) {
            addNotification({ type: 'warning', title: 'Atenção', message: 'Novo link gerado, mas o e-mail não foi enviado. O link anterior deixou de valer: copie o novo e mande ao cliente.' });
          } else {
            addNotification({ type: 'success', title: 'Sucesso', message: 'Convite reenviado. O link anterior deixou de valer.' });
          }
        } catch (err: unknown) {
          const message = err instanceof Error && err.message ? err.message : 'Falha ao reenviar convite';
          addNotification({ type: 'error', title: 'Erro', message });
        } finally {
          resending = false;
        }
      },
    });
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      setIsSubmitting(true);
            let responseData: CreateClientResponse | null = null;

      const fd = new FormData();
      
      // SEO Filename
      const seoFilename = generateSeoFilename('clients', name);
      fd.append('fileName', seoFilename);
      // Achado: sem isso, o backend cai no default 'portfolio' do Cloudinary.
      fd.append('folder', 'clients');

      fd.append('name', name.trim());
      fd.append('email', email.trim());
      fd.append('phone', phone.trim() || '');
      fd.append('status', 'ACTIVE');
      if (avatarFile) {
        fd.append('avatar', avatarFile);
      }

      if (isEditing && initialData) {
        // Edit Mode
        if (avatarFile) {
           await apiFetch(`/admin/clients/${initialData.id}`, { method: 'PUT', body: fd });
        } else {
           await apiFetch(`/admin/clients/${initialData.id}`, {
             method: 'PUT',
             body: JSON.stringify({
               name: name.trim(),
               email: email.trim(),
               phone: phone.trim() || undefined,
             })
           });
        }
        addNotification({ type: 'success', title: 'Sucesso', message: 'Cliente atualizado!' });
        clearDraft();
        onSuccess();
      } else {
        // Create Mode
        if (avatarFile) {
                    responseData = await apiFetch<CreateClientResponse>('/admin/clients', { method: 'POST', body: fd });
        } else {
                    responseData = await apiFetch<CreateClientResponse>('/admin/clients', {
            method: 'POST',
            body: JSON.stringify({
              name: name.trim(),
              email: email.trim(),
              phone: phone.trim() || undefined,
              status: 'ACTIVE',
            }),
          });
        }
        
        const tempPassword = responseData?.tempPassword;
        const inviteUrl = responseData?.inviteUrl;
        const clientId = responseData?.client?.id || responseData?.clientId || responseData?.id;

        addNotification({ type: 'success', title: 'Sucesso', message: 'Cliente criado!' });
        // Achado (auditoria ponta a ponta): o cliente é criado mesmo quando a foto não sobe (o servidor
        // responde 201 com um aviso); a tela dizia só "Cliente criado!" e a falta da foto passava despercebida.
        if (responseData?.warning) {
          addNotification({ type: 'warning', title: 'Atenção', message: responseData.warning });
        }
        clearDraft();
        onSuccess();

        if (tempPassword || inviteUrl) {
          openInviteModal({ tempPassword, inviteUrl, clientId });
        }
      }
    } catch (err: unknown) {
            const message = err instanceof Error ? err.message : `Falha ao ${isEditing ? 'atualizar' : 'criar'} cliente`;
      addNotification({ type: 'error', title: 'Erro', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <Form onSubmit={onSubmit} className="space-y-6">
        {draftPrompt && (
          <DraftRestoreBanner
            savedAt={draftPrompt.savedAt}
            onRestore={handleRestoreDraft}
            onDiscard={handleDiscardDraft}
          />
        )}
        {/* Achado (auditoria do design system): os <label> eram soltos (sem htmlFor) e o Input não
            recebia `label`/`error` — leitor de tela não ligava rótulo nem erro ao campo. O upload
            usava cinza fixo (slate-50/700), claro demais no tema escuro. */}
        <div className="space-y-4">
          <Input
            label="Nome"
            value={name}
            onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
            placeholder="Nome completo"
            error={errors.name}
          />

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setIsDirty(true); }}
            placeholder="email@exemplo.com"
            error={errors.email}
          />

          <Input
            label="Telefone (opcional)"
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setIsDirty(true); }}
            placeholder="(00) 00000-0000"
          />

          <div className="space-y-2">
            <label htmlFor="client-avatar" className="block text-sm font-medium text-foreground">Avatar (opcional)</label>
            <input
              id="client-avatar"
              type="file"
              accept="image/*"
              onChange={(e) => { setAvatarFile(e.target.files ? e.target.files[0] : null); setIsDirty(true); }}
              className="block w-full text-sm text-muted-foreground rounded-lg
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-muted file:text-foreground
                hover:file:bg-accent hover:file:text-accent-foreground
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
            />
          </div>
        </div>

        <FormActions>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Cliente')}
          </Button>
        </FormActions>
      </Form>
  );
};

export default ClientForm;
