// Caminho: frontend/src/pages/admin/ClientEditPage.tsx

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { User } from '../../types/types';

export const ClientEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<{ name: string; email: string; phone: string }>({
    name: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');

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
    setSuccess('');
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
      setSuccess('Dados do cliente atualizados com sucesso!');
      setTimeout(() => navigate('/admin/clients'), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar os dados.');
    }
  };

  if (loading) return <LoadingSpinner label="A carregar dados do cliente..." />;
  if (error && !client.name) return <div className="text-destructive">{error}</div>;

  return (
    <div className="w-full max-w-xl mx-auto bg-card p-8 rounded-2xl shadow-lg border border-border">
      <h1 className="text-3xl font-bold mb-6 text-primary">Editar Cliente</h1>
      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4 border border-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-success/10 text-success p-3 rounded-md mb-4 border border-success">
          {success}
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
          <Button type="button" variant="outline" size="md" onClick={() => navigate('/admin/clients')}>
            Voltar
          </Button>
        </div>
      </form>
    </div>
  );
};
