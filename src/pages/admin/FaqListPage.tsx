import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  HelpCircle,
  TrendingUp,
  MessageCircle,
  XCircle,
  Search,
  ChevronRight,
  Database,
  Zap,
  BookOpen,
  Sparkles
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
  Grid
} from '../../components/ui/StandardComponents';
import FaqForm from '../../components/forms/FaqFormPage';

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

  const fetchFaqs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/faq');
      setFaqs(asArray<FaqItem>(data));
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao sincronizar base de conhecimento.';
      setError(msg);
      addNotification({
        type: 'error',
        title: 'Terminal de Documentação Offline',
        message: msg
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

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
        title: 'Registro Purgado',
        message: 'A pergunta foi removida da base de conhecimento ativa.'
      });
      setIsDeleteModalOpen(false);
    } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: 'Erro de Protocolo',
        message: err instanceof Error ? err.message : 'Não foi possível autorizar a purga.'
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
      <AdminLayout title="Base de Conhecimento" breadcrumbs={[{ name: 'Admin' }, { name: 'FAQ' }]}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Indexando fluxogramas de resposta..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Base de Conhecimento" breadcrumbs={[{ name: 'Admin' }, { name: 'Configurações' }, { name: 'FAQ' }]}>
      <div className="space-y-8">
        {/* Dynamic Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg ring-1 ring-primary/20">
              <BookOpen className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-foreground uppercase tracking-tighter">Central de FAQ</h2>
                <Badge variant="outline" className="text-[10px] font-black uppercase px-2 h-5 bg-primary/5 border-primary/20 text-primary">{faqs.length} Verbetes</Badge>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Gestão de semântica e suporte automatizado</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <Button variant="outline" onClick={fetchFaqs} className="h-11 px-6 font-black uppercase text-[10px] tracking-widest border-border/60 hover:bg-muted group">
               <Zap className="h-4 w-4 mr-2" /> Recarregar Base
             </Button>
             <Button onClick={handleCreate} className="h-11 px-8 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 bg-primary hover:scale-[1.02] transition-transform active:scale-[0.98]">
               <Plus className="h-5 w-5 mr-2" /> Mapear Nova Dúvida
             </Button>
          </div>
        </div>

        {/* Tactical Pulse Grid */}
        <Grid columns={{ sm: 1, md: 3 }} gap={6}>
          <Card className="p-6 bg-card border-border/40 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <HelpCircle size={80} />
            </div>
            <div className="relative z-10 space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">FAQs Ativos</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">{faqs.length}</p>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Conhecimento Sincronizado</p>
                    </div>
                </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-emerald-500/5 border-emerald-500/10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp size={80} />
            </div>
            <div className="relative z-10 space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Impacto de Suporte</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">84%</p>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Deflexão de Chamados</p>
                    </div>
                </div>
            </div>
          </Card>

          <Card className="p-6 bg-amber-500/5 border-amber-500/10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles size={80} />
            </div>
            <div className="relative z-10 space-y-4">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">SEO Health</p>
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">Otimizado</p>
                        <p className="text-[10px] font-bold text-amber-600 uppercase mt-1">Estrutura de Dados Schema</p>
                    </div>
                </div>
            </div>
          </Card>
        </Grid>

        {/* Console Control */}
        <Card className="p-4 bg-muted/20 border-border/50 relative overflow-visible z-20 backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Escancear por palavras-chave na pergunta ou fragmentos da resposta técnica..."
                className="pl-10 h-10 text-xs font-medium bg-card border-border/60"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 border-border/60 hover:bg-muted text-muted-foreground group"
                onClick={() => setSearchTerm('')}
              >
                <XCircle className="h-4 w-4 group-hover:rotate-90 transition-all duration-300" />
              </Button>
            </div>
          </div>
        </Card>

        {error && <Alert variant="error" title="Falha de Comunicação" description={error} />}

        {/* FAQ Registry Table */}
        <Card className="overflow-hidden border-border/60 shadow-2xl bg-card animate-in fade-in duration-700">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border/50">
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Enunciado & Protótipo</th>
                  <th className="px-6 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Vetor de Resposta</th>
                  <th className="px-6 py-5 text-[10px] font-black text-right text-muted-foreground uppercase tracking-[0.1em]">Controle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredFaqs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-24 text-center">
                      <div className="inline-flex h-20 w-20 items-center justify-center rounded-[2rem] bg-primary/5 mb-6 ring-8 ring-primary/5 transition-all">
                        <Database className="h-10 w-10 text-primary/30" />
                      </div>
                      <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Vácuo de Conhecimento</h3>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-2 font-medium">Os parâmetros de busca não retornaram correspondências no repositório semântico.</p>
                      <Button variant="outline" className="mt-8 font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-xl border-primary/20 text-primary hover:bg-primary/5" onClick={() => setSearchTerm('')}>
                        Redefinir Filtros
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredFaqs.map((faq) => (
                    <tr key={faq.id} className="hover:bg-muted/30 transition-all group animate-in fade-in slide-in-from-left-4 duration-500">
                      <td className="px-6 py-5 max-w-md">
                        <div className="flex items-start gap-5">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-border/60 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-110 transition-transform duration-500 shadow-sm font-black text-primary/40 uppercase mt-1">
                             <MessageCircle className="h-6 w-6" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-black text-foreground leading-tight uppercase tracking-tight">{faq.question}</p>
                            <p className="text-[9px] font-black text-muted-foreground uppercase opacity-40 tracking-widest mt-1.5 font-mono">ID: FAQ-{faq.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 max-w-lg">
                        <p className="text-xs text-muted-foreground font-medium line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity italic">
                           {faq.answer}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl border-border/40 hover:text-primary hover:border-primary/50 bg-card shadow-sm" 
                            onClick={() => handleEdit(faq)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl border-border/40 hover:text-destructive hover:border-destructive/50 bg-card shadow-sm" 
                            onClick={() => handleDeleteClick(faq.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/40 hover:bg-muted group/ext">
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Tactical Status Bar */}
          <div className="px-8 py-5 bg-muted/10 border-t border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 italic">
               <Zap size={14} className="text-primary animate-pulse" /> Sincronização de base de conhecimento ativa com o portal do cliente
             </p>
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-muted-foreground uppercase">Verbetes Carregados:</span>
                <Badge variant="outline" className="text-[10px] font-black px-3">{filteredFaqs.length}</Badge>
             </div>
          </div>
        </Card>
      </div>

      {/* Specialty Interface Modals */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingFaq ? 'Redação de Verbete Operacional' : 'Protocolo de Ingestão de Conhecimento'}
        size="lg"
      >
        <FaqForm
          initialData={editingFaq}
          onSuccess={() => {
            setIsFormModalOpen(false);
            fetchFaqs();
            addNotification({
              type: 'success',
              title: 'Matriz Atualizada',
              message: 'O novo verbete de FAQ foi indexado ao sistema.'
            });
          }}
          onCancel={() => setIsFormModalOpen(false)}
        />
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Validar Purga de Conhecimento?"
        message="Esta operação removerá permanentemente o verbete da base ativa. Esta ação é irreversível e afetará a deflexão de chamados imediata."
        variant="danger"
        isLoading={isDeleting}
        confirmText="Confirmar Purga"
        cancelText="Manter Registro"
      />
    </AdminLayout>
  );
};

export default FaqListPage;
