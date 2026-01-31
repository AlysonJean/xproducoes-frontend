import React, { useEffect, useState } from 'react';
import { newsletterService, NewsletterSubscriber } from '../../services/newsletterService';
import { Button, Card } from '../../components/ui/StandardComponents';
import { formatDate } from '../../utils/date';
import { PageLoading } from '../../components/layouts/PageLayout';
import * as XLSX from 'xlsx';

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

  if (loading) return <PageLoading />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inscritos na Newsletter</h1>
          <p className="text-muted-foreground">Gerencie os emails cadastrados para receber novidades.</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
           📥 Exportar Excel
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Data Inscrição</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {subscribers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                    Nenhum inscrito encontrado.
                  </td>
                </tr>
              ) : (
                subscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{sub.email}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatDate(sub.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        sub.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
      </Card>
    </div>
  );
};
