import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  MessageCircle,
  XCircle,
  Search,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '../../services/api';
import { asArray } from '../../utils/normalize';
import type { FaqItem } from '../../types/types';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  Button,
  Card,
  Modal,
  ConfirmModal,
  Alert,
  Input,
  Badge,
} from '../../components/ui/StandardComponents';
import FaqForm from '../../components/forms/FaqFormPage';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';

// Título e breadcrumb iguais no carregamento e com dados.
const PAGE_TITLE = 'Perguntas frequentes';
const BREADCRUMBS = [{ name: 'Admin', href: '/admin/painel' }, { name: 'FAQ' }];

export const FaqListPage = () => {
  const { addNotification } = useNotifications();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [faqToDelete, setFaqToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const { guardClose, isConfirmOpen, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard(isFormDirty);

  const fetchFaqs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/faq');
      setFaqs(asArray<FaqItem>(data));
      setError(null);
    } catch (err: unknown) {
      // O erro aparece no Alert da página (com "Tentar de novo"); o toast duplicava a mensagem.
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as perguntas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const handleDeleteClick = (id: string) => {
    setFaqToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!faqToDelete) return;

    try {
      setIsDeleting(true);
      await apiFetch(`/faq/${faqToDelete}`, { method: 'DELETE' });
      await fetchFaqs();
      addNotification({
        type: 'success',
        title: 'Pergunta excluída',
        message: 'A pergunta foi removida do site.'
      });
      setIsDeleteModalOpen(false);
    } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Erro ao excluir',
        message: err instanceof Error ? err.message : 'Não foi possível excluir a pergunta.'
      });
    } finally {
      setIsDeleting(false);
      setFaqToDelete(null);
    }
  };

  const handleCreate = () => {
    setEditingFaq(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (faq: FaqItem) => {
    setEditingFaq(faq);
    setIsFormModalOpen(true);
  };

  const filteredFaqs = useMemo(() => {
    return faqs.filter(f =>
      f.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [faqs, searchTerm]);

  if (loading && faqs.length === 0) {
    return (
      <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Carregando perguntas…" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
      <div className="space-y-6">
        {/* Cabeçalho. Achado (auditoria): os cards "84% Deflexão de Chamados", "SEO Health: Otimizado"
            e "Conhecimento Sincronizado" eram textos fixos, sem dado por trás — removidos. */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">Perguntas e respostas</h2>
                <Badge variant="primary">{faqs.length} {faqs.length === 1 ? 'pergunta' : 'perguntas'}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Perguntas frequentes exibidas no site.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
             <Button variant="outline" size="sm" onClick={fetchFaqs} leftIcon={<RefreshCw className="h-4 w-4" />}>
               Recarregar
             </Button>
             <Button size="sm" onClick={handleCreate} leftIcon={<Plus className="h-4 w-4" />}>
               Nova pergunta
             </Button>
          </div>
        </div>

        {/* Busca */}
        <Card className="p-4 bg-muted/20 border-border">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                size="sm"
                placeholder="Buscar na pergunta ou na resposta..."
                aria-label="Buscar perguntas"
                leftIcon={<Search className="h-4 w-4" />}
                className="bg-card"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => setSearchTerm('')}
              aria-label="Limpar busca"
              title="Limpar busca"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {error && (
          <Alert
            variant="error"
            title="Não foi possível carregar as perguntas"
            description={error}
            action={<Button size="sm" variant="outline" onClick={fetchFaqs}>Tentar de novo</Button>}
          />
        )}

        {!(error && faqs.length === 0) && (
        <Card className="overflow-hidden border-border shadow-sm animate-in fade-in duration-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Pergunta</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Resposta</th>
                  <th className="px-6 py-4 text-xs font-bold text-right text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredFaqs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-20 text-center">
                      <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                        <MessageCircle className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">Nenhuma pergunta encontrada</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
                        {searchTerm ? 'Ajuste a busca.' : 'Cadastre a primeira pergunta frequente.'}
                      </p>
                      {searchTerm && (
                        <Button variant="outline" size="sm" className="mt-6" onClick={() => setSearchTerm('')}>
                          Limpar busca
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredFaqs.map((faq) => (
                    <tr key={faq.id} className="hover:bg-muted/20 transition-colors group animate-in fade-in slide-in-from-left-4 duration-500">
                      <td className="px-6 py-4 max-w-md">
                        <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                             <MessageCircle className="h-5 w-5 text-primary" />
                          </div>
                          <p className="text-sm font-bold text-foreground leading-snug">{faq.question}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-lg">
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                           {faq.answer}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => handleEdit(faq)}
                            aria-label={`Editar pergunta: ${faq.question}`}
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 hover:text-destructive hover:border-destructive/50"
                            onClick={() => handleDeleteClick(faq.id)}
                            aria-label={`Excluir pergunta: ${faq.question}`}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredFaqs.length > 0 && (
            <div className="px-6 py-4 bg-muted/10 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Mostrando {filteredFaqs.length} de {faqs.length} {faqs.length === 1 ? 'pergunta' : 'perguntas'}.
              </p>
            </div>
          )}
        </Card>
        )}
      </div>

      <Modal
        isOpen={isFormModalOpen}
        onClose={() => guardClose(() => setIsFormModalOpen(false))}
        title={editingFaq ? 'Editar pergunta' : 'Nova pergunta'}
        size="lg"
      >
        <FaqForm
          initialData={editingFaq}
          onDirtyChange={setIsFormDirty}
          onSuccess={() => {
            setIsFormModalOpen(false);
            fetchFaqs();
            addNotification({
              type: 'success',
              title: 'Pergunta salva',
              message: 'A pergunta foi salva.'
            });
          }}
          onCancel={() => guardClose(() => setIsFormModalOpen(false))}
        />
      </Modal>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={cancelDiscard}
        onConfirm={confirmDiscard}
        title="Descartar alterações?"
        message="Você preencheu dados que ainda não foram salvos. Deseja descartar essas alterações?"
        variant="warning"
        confirmText="Descartar"
        cancelText="Continuar Editando"
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir pergunta?"
        message="A pergunta será removida do site. Esta ação não pode ser desfeita."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Excluir"
        cancelText="Cancelar"
      />
    </AdminLayout>
  );
};

export default FaqListPage;
