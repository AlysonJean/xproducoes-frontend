// Caminho: frontend/src/pages/admin/ClientEditPage.tsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { User } from '../../types/types';
import { useNotifications } from '@/contexts/NotificationContext';

import AdminLayout from '@/components/admin/AdminLayout';

export const ClientEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  const [client, setClient] = useState<{ name: string; email: string; phone: string }>({
    name: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchClient = async () => {
      try {
        setLoading(true);
        const clientData: User = await apiFetch(`/admin/clients/${id}`);
        setClient({
          name: clientData.name || '',
          email: clientData.email || '',
          phone: clientData.phone || '',
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Não foi possível carregar o cliente.');
      } finally {
        setLoading(false);
      }
    };
    fetchClient();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setClient((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!client.name || !client.email) {
      setError('Nome e e-mail são obrigatórios.');
      return;
    }
    try {
      await apiFetch(`/admin/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client),
      });
      addNotification({
        type: 'success',
        title: 'Sucesso',
        message: 'Dados do cliente atualizados com sucesso!'
      });
      setTimeout(() => navigate('/admin/clientes'), 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao atualizar os dados.';
      setError(msg);
      addNotification({
        type: 'error',
        title: 'Erro no salvamento',
        message: msg
      });
    }
  };

  if (loading) return <BrandLoader size={120} label="Carregando dados do cliente..." />;
  
  return (
    <AdminLayout 
      title="Editar Cliente" 
      breadcrumbs={[{ name: 'Admin' }, { name: 'Clientes', href: '/admin/clientes' }, { name: 'Editar' }]}
    >
      <div className="w-full max-w-xl mx-auto bg-card p-8 rounded-2xl shadow-lg border border-border">
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4 border border-destructive">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="text"
            id="name"
            name="name"
            label="Nome"
            value={client.name}
            onChange={handleChange}
            required
          />
          <Input
            type="email"
            id="email"
            name="email"
            label="Email"
            value={client.email}
            onChange={handleChange}
            required
          />
          <Input
            type="tel"
            id="phone"
            name="phone"
            label="Telefone"
            value={client.phone}
            onChange={handleChange}
          />
          <div className="flex gap-4">
            <Button type="submit" variant="primary" size="md">
              Salvar Alterações
            </Button>
            <Button type="button" variant="outline" size="md" onClick={() => navigate('/admin/clientes')}>
              Voltar
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};
