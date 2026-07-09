import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '@/services/api';
import { useModal } from '@/components/modals/ModalContext';
import { generateSeoFilename } from '@/utils/seoUtils';
import type { Client } from '@/types/types';

interface ClientFormProps {
  initialData?: Client | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface CreateClientResponse {
  tempPassword?: string;
  inviteUrl?: string;
  client?: { id?: string };
  clientId?: string;
  id?: string;
}

export const ClientForm: React.FC<ClientFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const { addNotification } = useNotifications();
  const { openModal } = useModal();

  const isEditing = Boolean(initialData);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
  }, [initialData]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nome é obrigatório';
    if (!email.trim()) e.email = 'Email é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const openInviteModal = (data: { tempPassword?: string; inviteUrl?: string; clientId?: string }) => {
    openModal('invite', {
      inviteUrl: data.inviteUrl,
      tempPassword: data.tempPassword,
      onResend: async () => {
        if (!data.clientId) {
          addNotification({ type: 'error', title: 'Erro', message: 'ID do cliente não disponível para reenviar' });
          return;
        }
        try {
          await apiFetch(`/admin/clients/${data.clientId}/resend-invite`, { method: 'POST' });
          addNotification({ type: 'success', title: 'Sucesso', message: 'Convite reenviado' });
        } catch {
          addNotification({ type: 'error', title: 'Erro', message: 'Falha ao reenviar convite' });
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
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Nome</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Telefone (opcional)</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Avatar (opcional)</label>
            <input aria-label="Avatar do cliente" type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files ? e.target.files[0] : null)} className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-slate-50 file:text-slate-700
              hover:file:bg-slate-100" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Cliente')}
          </Button>
        </div>
      </form>
  );
};

export default ClientForm;
