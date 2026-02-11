import { useEffect, useState, useCallback, useMemo } from 'react';
import { newsletterService, NewsletterSubscriber } from '../../services/newsletterService';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { formatDate } from '../../utils/typeSafeFormatters';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { 
  Mail, 
  TrendingUp, 
  Activity, 
  Users,
  Search,
  XCircle,
  MoreHorizontal,
  ArrowUpDown,
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

export const NewsletterSubscribersPage = () => {
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
      console.error('Erro ao carregar inscritos:', err);
      setError('Falha ao sincronizar base de leads.');
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
      console.error('Erro na exportação:', err);
    }
  };

  const filteredSubscribers = useMemo(() => {
    return subscribers.filter(s => s.email.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [subscribers, searchTerm]);

  const stats = useMemo(() => ({
    total: subscribers.length,
    active: subscribers.filter(s => s.isActive).length,
    conversion: 'Estável'
  }), [subscribers]);

  if (loading && subscribers.length === 0) {
    return (
      <AdminLayout title="Leads Newsletter" breadcrumbs={[{ name: 'Admin' }, { name: 'Newsletter' }]}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Sincronizando base de leads..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Leads Newsletter" breadcrumbs={[{ name: 'Admin' }, { name: 'Newsletter' }]}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Gestão de Newsletter</h2>
              <p className="text-sm text-muted-foreground">Monitore o crescimento da sua base de contatos direta.</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline" className="gap-2 shadow-sm border-border">
              <FileSpreadsheet className="h-4 w-4" /> Exportar Leads
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <Grid columns={{ sm: 1, md: 3 }} gap={4}>
          <Card className="p-4 bg-primary/5 border-primary/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Total de Leads</p>
                <p className="text-xl font-black text-foreground">{stats.total}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-emerald-500/5 border-emerald-500/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Status Ativo</p>
                <p className="text-xl font-black text-foreground">{stats.active}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-blue-500/5 border-blue-500/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Taxa de Conversão</p>
                <p className="text-xl font-black text-foreground">{stats.conversion}</p>
              </div>
            </div>
          </Card>
        </Grid>

        {/* Filters and Search */}
        <Card className="p-4 bg-card/50 border-border">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email de contato..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => setSearchTerm('')} title="Limpar Filtro">
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {error && (
          <Alert variant="error" title="Erro de Sincronização" description={error} />
        )}

        {/* Subscribers Table */}
        <Card className="overflow-hidden border-border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center gap-1 cursor-pointer">
                      Email de Contato <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Data de Ingresso</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-right text-muted-foreground uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSubscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                           <Mail className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-bold text-foreground">{sub.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-muted-foreground font-medium">
                        {formatDate(sub.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={sub.isActive ? 'success' : 'outline'} className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5">
                        {sub.isActive ? 'SUBSCRITO' : 'CANCELADO'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="outline" size="icon" className="h-8 w-8" title="Ver Detalhes">
                            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                         </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredSubscribers.length === 0 && !loading && (
            <div className="py-24 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6 text-muted-foreground/20 ring-8 ring-muted/10">
                <Mail className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Nenhum lead localizado</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">Personalize sua busca ou aguarde novas inscrições via portal público.</p>
              <Button variant="outline" className="mt-6" onClick={() => setSearchTerm('')}>
                Limpar Filtros
              </Button>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
};

export default NewsletterSubscribersPage;
