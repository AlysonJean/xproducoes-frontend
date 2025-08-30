import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '@/services/api';

type Role = 'PHOTOGRAPHER' | 'VIDEOGRAPHER' | 'EDITOR' | 'ASSISTANT' | 'OTHER';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'PHOTOGRAPHER', label: 'Fotógrafo' },
  { value: 'VIDEOGRAPHER', label: 'Videomaker' },
  { value: 'EDITOR', label: 'Editor' },
  { value: 'ASSISTANT', label: 'Assistente' },
  { value: 'OTHER', label: 'Outro' },
];

export const CollaboratorFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('PHOTOGRAPHER');
  const [hourlyRate, setHourlyRate] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nome é obrigatório';
    if (!email.trim()) e.email = 'Email é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email inválido';
    if (hourlyRate !== '' && Number(hourlyRate) < 0) e.hourlyRate = 'Valor/hora inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      setIsSubmitting(true);
      await apiFetch('/collaborators', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role,
          hourlyRate: hourlyRate === '' ? undefined : Number(hourlyRate),
          status: 'ACTIVE',
        }),
      });
      addNotification({ type: 'success', title: 'Sucesso', message: 'Colaborador criado!' });
      navigate('/admin/collaborators');
    } catch (err) {
      addNotification({ type: 'error', title: 'Erro', message: 'Falha ao criar colaborador' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Novo Colaborador" breadcrumbs={[{ name: 'Admin' }, { name: 'Colaboradores', href: '/admin/collaborators' }, { name: 'Novo' }]}>
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
              <label className="block text-sm font-medium text-foreground mb-2">Papel</label>
              <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Valor/hora (opcional)</label>
              <Input
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0.00"
                aria-invalid={!!errors.hourlyRate}
              />
              {errors.hourlyRate && (
                <p className="mt-1 text-sm text-destructive">{errors.hourlyRate}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/collaborators')}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Criar Colaborador'}
          </Button>
        </div>
      </form>

      {isSubmitting && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6">
            <LoadingSpinner label="Salvando colaborador..." />
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default CollaboratorFormPage;
