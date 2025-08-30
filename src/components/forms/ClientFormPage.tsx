import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '@/services/api';
import { useModal } from '@/components/modals/ModalContext';

export const ClientFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { openModal } = useModal();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
        } catch (e) {
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
      let responseData: any = null;

      if (avatarFile) {
        const fd = new FormData();
        fd.append('name', name.trim());
        fd.append('email', email.trim());
        fd.append('phone', phone.trim() || '');
        fd.append('status', 'ACTIVE');
        fd.append('avatar', avatarFile);
        responseData = await apiFetch<any>('/admin/clients', { method: 'POST', body: fd });
      } else {
        responseData = await apiFetch<any>('/admin/clients', {
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

      if (tempPassword || inviteUrl) {
        openInviteModal({ tempPassword, inviteUrl, clientId });
      } else {
        navigate('/admin/clients');
      }
    } catch (err) {
      const message = (err as any)?.message || 'Falha ao criar cliente';
      addNotification({ type: 'error', title: 'Erro', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Novo Cliente" breadcrumbs={[{ name: 'Admin' }, { name: 'Clientes', href: '/admin/clients' }, { name: 'Novo' }]}>
      <form onSubmit={onSubmit} className="max-w-xl space-y-6">
        <div className="bg-card border rounded-xl p-6">
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
              <input aria-label="Avatar do cliente" type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files ? e.target.files[0] : null)} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/clients')}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Criar Cliente'}
          </Button>
        </div>
      </form>

      {isSubmitting && (
        <div className="fixed inset-0 bg-[--overlay] flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6">
            <LoadingSpinner label="Salvando cliente..." />
          </div>
        </div>
      )}

      {/* Invite modal provided by ModalManager (opened programmatically) */}
    </AdminLayout>
  );
};

export default ClientFormPage;
