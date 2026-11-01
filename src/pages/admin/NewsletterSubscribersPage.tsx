import { useEffect, useState, useCallback, useMemo } from 'react';
import { newsletterService, NewsletterSubscriber } from '../../services/newsletterService';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { formatDate } from '../../utils/typeSafeFormatters';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { useNotifications } from '@/contexts/NotificationContext';
import { logger } from '../../utils/logger';
import {
  Mail,
  TrendingUp,
  Users,
  Search,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';
import {
  Button,
  Card,
  Badge,
  Grid,
  Input,
  Alert
} from '../../components/ui/StandardComponents';

const PAGE_TITLE = 'Newsletter';
const BREADCRUMBS = [{ name: 'Admin', href: '/admin/painel' }, { name: 'Newsletter' }];

export const NewsletterSubscribersPage = () => {
  const { addNotification } = useNotifications();
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await newsletterService.getAllSubscribers();
      setSubscribers(data || []);
      setError(null);
    } catch (err: unknown) {
      logger.error('Erro ao carregar inscritos:', 'NewsletterSubscribersPage', err);
      setError('Não foi possível carregar os inscritos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = async () => {
    try {
      const XLSX = await import('xlsx-js-style');
      const ws = XLSX.utils.json_to_sheet(subscribers.map(s => ({
          ID: s.id,
          Email: s.email,
          'Data Inscrição': formatDate(s.createdAt),
          Ativo: s.isActive ? 'Sim' : 'Não'
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Newsletter");
      XLSX.writeFile(wb, "newsletter_subscribers.xlsx");
    } catch (err) {
      // Antes a falha ia só para o log — o botão parecia não fazer nada.
      logger.error('Erro na exportação:', 'NewsletterSubscribersPage', err);
      addNotification({ type: 'error', title: 'Erro na exportação', message: 'Não foi possível gerar a planilha.' });
    }
  };

  const filteredSubscribers = useMemo(() => {
    return subscribers.filter(s => s.email.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [subscribers, searchTerm]);

  // Achado (auditoria): o 3º card "Taxa de Conversão" mostrava o texto fixo "Estável". Removido.
  const stats = useMemo(() => ({
    total: subscribers.length,
    active: subscribers.filter(s => s.isActive).length,
  }), [subscribers]);

  if (loading && subscribers.length === 0) {
    return (
      <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Carregando inscritos…" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Inscritos na newsletter</h2>
              <p className="text-sm text-muted-foreground">E-mails cadastrados no site para receber novidades.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline" size="sm" leftIcon={<FileSpreadsheet className="h-4 w-4" />}>
              Exportar inscritos
            </Button>
          </div>
        </div>

        {/* Indicadores */}
        <Grid columns={{ sm: 1, md: 2 }} gap={4}>
          <Card className="p-4 bg-primary/5 border-primary/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total de inscritos</p>
                <p className="text-xl font-black text-foreground">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-success/5 border-success/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Inscrições ativas</p>
                <p className="text-xl font-black text-foreground">{stats.active}</p>
              </div>
            </div>
          </Card>
        </Grid>

        {/* Busca */}
        <Card className="p-4 bg-card/50 border-border">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Buscar por e-mail..."
                aria-label="Buscar inscritos por e-mail"
                leftIcon={<Search className="h-4 w-4" />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0"
              onClick={() => setSearchTerm('')}
              title="Limpar busca"
              aria-label="Limpar busca"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {error && (
          <Alert
            variant="error"
            title="Erro ao carregar"
            description={error}
            action={<Button size="sm" variant="outline" onClick={loadData}>Tentar de novo</Button>}
          />
        )}

        {/* Tabela — a coluna "Ações" só tinha um botão "Ver Detalhes" sem ação; o cabeçalho
            "Email" tinha ícone de ordenação sem ordenação. Removidos. */}
        {!(error && subscribers.length === 0) && (
        <Card className="overflow-hidden border-border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">E-mail</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Data de inscrição</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSubscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                           <Mail className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-bold text-foreground">{sub.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(sub.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={sub.isActive ? 'success' : 'ghost'}>
                        {sub.isActive ? 'Inscrito' : 'Cancelado'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredSubscribers.length === 0 && !loading && (
            <div className="py-24 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6 text-muted-foreground">
                <Mail className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Nenhum inscrito encontrado</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">
                {searchTerm ? 'Ajuste a busca.' : 'As inscrições feitas no site aparecem aqui.'}
              </p>
              {searchTerm && (
                <Button variant="outline" size="sm" className="mt-6" onClick={() => setSearchTerm('')}>
                  Limpar busca
                </Button>
              )}
            </div>
          )}
        </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default NewsletterSubscribersPage;
