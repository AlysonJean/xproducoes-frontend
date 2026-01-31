import { useEffect, useState } from 'react';
import { newsletterService, NewsletterSubscriber } from '../../services/newsletterService';
import { Button } from '../../components/ui/Button';
import { SimpleCard } from '../../components/ui/Cards';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { formatDate } from '../../utils/typeSafeFormatters';
import * as XLSX from 'xlsx-js-style';
import { Download, Mail } from 'lucide-react';

export const NewsletterSubscribersPage = () => {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await newsletterService.getAllSubscribers();
      setSubscribers(data);
    } catch (error) {
      console.error('Erro ao carregar inscritos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(subscribers.map(s => ({
        ID: s.id,
        Email: s.email,
        'Data Inscrição': formatDate(s.createdAt),
        Ativo: s.isActive ? 'Sim' : 'Não'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Newsletter");
    XLSX.writeFile(wb, "newsletter_subscribers.xlsx");
  };

  if (loading) {
    return (
      <AdminLayout title="Newsletter" breadcrumbs={[{ name: 'Admin' }, { name: 'Newsletter' }]}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Newsletter" breadcrumbs={[{ name: 'Admin' }, { name: 'Newsletter' }]}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inscritos na Newsletter</h1>
          <p className="text-muted-foreground mt-1">Gerencie os emails cadastrados para receber novidades.</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
           <Download className="w-4 h-4" /> Exportar Excel
        </Button>
      </div>

      <SimpleCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left divide-y divide-border">
            <thead className="bg-muted text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-3 font-medium tracking-wider">Email</th>
                <th className="px-6 py-3 font-medium tracking-wider">Data Inscrição</th>
                <th className="px-6 py-3 font-medium tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {subscribers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Mail className="w-8 h-8 mb-2 opacity-50" />
                      <p>Nenhum inscrito encontrado.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                subscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{sub.email}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatDate(sub.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        sub.isActive 
                          ? 'bg-success/10 text-success border-success/20' 
                          : 'bg-destructive/10 text-destructive border-destructive/20'
                      }`}>
                        {sub.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SimpleCard>
    </AdminLayout>
  );
};
