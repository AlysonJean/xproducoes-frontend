import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';

// Teste do painel de 25/11/2026 (A-15): um endereço do painel que não existe (/admin/rota-que-nao-existe) deixava a tela em
// branco, só com o topo do site. Agora diz que a página não existe e leva de volta.
export function AdminNotFoundPage() {
  const navigate = useNavigate();
  return (
    <AdminLayout title="Página não encontrada" breadcrumbs={[{ name: 'Admin', href: '/admin/painel' }, { name: 'Página não encontrada' }]}>
      <div className="max-w-xl mx-auto space-y-4 py-10">
        <Alert
          variant="warning"
          title="Esta página do painel não existe"
          description="O endereço pode estar errado ou a página pode ter mudado de lugar. Use o menu ao lado ou volte para o início do painel."
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => navigate('/admin/painel')}>Ir para o início do painel</Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/admin/reservas')}>Ver reservas</Button>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminNotFoundPage;
