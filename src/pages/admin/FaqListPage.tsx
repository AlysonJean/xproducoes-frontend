import { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { asArray } from '../../utils/normalize';
import type { FaqItem } from '../../types/types';
import BrandLoader from '../../components/ui/BrandLoader';
import { SimpleCard } from '../../components/ui/Cards';
import AdminLayout from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/StandardComponents';
import FaqForm from '../../components/forms/FaqFormPage';
import { Plus, Edit2, Trash2, HelpCircle } from 'lucide-react';

export const FaqListPage = () => {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/faq');
      setFaqs(asArray<FaqItem>(data));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar FAQ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem a certeza de que quer apagar esta pergunta?')) {
      try {
        await apiFetch(`/faq/${id}`, { method: 'DELETE' });
        fetchFaqs(); // Atualiza a lista
      } catch (err: unknown) {
        alert(
          `Erro ao apagar pergunta: ${
            err instanceof Error ? err.message : 'Erro desconhecido.'
          }`
        );
      }
    }
  };

  const handleCreate = () => {
    setEditingFaq(null);
    setIsModalOpen(true);
  };

  const handleEdit = (faq: FaqItem) => {
    setEditingFaq(faq);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <AdminLayout title="Gestão de FAQ" breadcrumbs={[{ name: 'Admin' }, { name: 'FAQ' }]}>
        <BrandLoader size={120} label="Carregando perguntas..." />
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Gestão de FAQ" breadcrumbs={[{ name: 'Admin' }, { name: 'FAQ' }]}>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-destructive bg-destructive/10 p-4 rounded-lg border border-destructive/20">
            {error}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestão de FAQ" breadcrumbs={[{ name: 'Admin' }, { name: 'FAQ' }]}>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="text-muted-foreground text-sm">
            Total de perguntas: <span className="font-semibold text-foreground">{faqs.length}</span>
          </div>
        </div>
        <Button onClick={handleCreate} variant="primary" className="gap-2 self-start sm:self-auto">
          <Plus size={20} />
          Adicionar Pergunta
        </Button>
      </div>

      <SimpleCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Pergunta
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {faqs.map((faq) => (
                <tr key={faq.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <HelpCircle className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground line-clamp-2">
                          {faq.question}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">
                      Geral
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(faq)}
                        title="Editar pergunta" 
                        aria-label="Editar pergunta"
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        onClick={() => handleDelete(faq.id)}
                        variant="danger"
                        size="sm"
                        title="Excluir pergunta"
                        aria-label="Excluir pergunta"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {faqs.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <HelpCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma pergunta encontrada</h3>
            <p className="text-muted-foreground">
              Comece adicionando as primeiras perguntas frequentes
            </p>
          </div>
        )}
      </SimpleCard>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFaq ? 'Editar Pergunta' : 'Nova Pergunta'}
        className="max-w-xl"
      >
        <FaqForm
          initialData={editingFaq}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchFaqs();
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </AdminLayout>
  );
};
