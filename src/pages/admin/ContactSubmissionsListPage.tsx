// Caminho: frontend/src/pages/admin/ContactSubmissionsListPage.tsx

import { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { asArray } from '../../utils/normalize';
import type { ContactSubmission } from '../../types/types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AdminLayout from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { SimpleCard } from '../../components/ui/Cards';

export const ContactSubmissionsListPage = () => {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
  const data = await apiFetch('/api/admin/contacts');
  setSubmissions(asArray<ContactSubmission>(data));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar mensagens.');
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const updatedSubmission = await apiFetch(`/admin/contacts/${id}/read`, {
        method: 'PATCH',
      });
      setSubmissions((prev) =>
        prev.map((sub) => (sub.id === id ? (updatedSubmission as ContactSubmission) : sub))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao marcar como lida.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem a certeza que deseja apagar esta mensagem permanentemente?')) {
      try {
        await apiFetch(`/admin/contacts/${id}`, { method: 'DELETE' });
        setSubmissions((prev) => prev.filter((sub) => sub.id !== id));
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Erro ao apagar a mensagem.');
      }
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Mensagens de Contato" breadcrumbs={[{ name: 'Admin' }, { name: 'Contatos' }]}>
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner label="A carregar mensagens..." />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Mensagens de Contato" breadcrumbs={[{ name: 'Admin' }, { name: 'Contatos' }]}>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-destructive bg-destructive/10 p-4 rounded-lg border border-destructive">
            {error}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Mensagens de Contato" breadcrumbs={[{ name: 'Admin' }, { name: 'Contatos' }]}>
      <div className="mb-8 flex justify-between items-center">
        <div className="space-y-1">
          <div className="text-muted-foreground text-sm">
            Total de mensagens: <span className="font-semibold text-foreground">{submissions.length}</span>
          </div>
          <div className="text-muted-foreground text-sm">
            Pendentes: <span className="font-semibold text-destructive">
              {submissions.filter(s => s.status === 'PENDING').length}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {submissions.length > 0 ? (
          submissions.map((sub) => (
            <SimpleCard
              key={sub.id}
              className={
                sub.status !== 'PENDING'
                  ? ''
                  : 'border-l-4 border-l-primary'
              }
            >
                <div className="flex justify-between items-start gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-foreground text-lg">
                        {sub.name}
                      </h3>
                      {sub.status === 'PENDING' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                          Nova
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                        {sub.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(sub.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-lg p-4 border">
                        {sub.message}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {sub.status === 'PENDING' && (
                      <Button
                        onClick={() => handleMarkAsRead(sub.id)}
                        variant="secondary"
                        size="sm"
                        className="gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Marcar como Lida
                      </Button>
                    )}
                    <Button
                      onClick={() => handleDelete(sub.id)}
                      variant="danger"
                      size="sm"
                      className="gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Excluir
                    </Button>
                  </div>
                </div>
            </SimpleCard>
          ))
        ) : (
          <SimpleCard className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma mensagem encontrada</h3>
            <p className="text-muted-foreground">
              Ainda não foram recebidas mensagens de contato.
            </p>
          </SimpleCard>
        )}
      </div>
    </AdminLayout>
  );
};
