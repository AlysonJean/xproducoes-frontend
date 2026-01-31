import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { asArray } from '../../utils/normalize';
import { formatPrice } from '../../utils/typeSafeFormatters';
import type { Kit } from '../../types/types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import AdminLayout from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { SimpleCard } from '../../components/ui/Cards';

// formatPrice padronizado via util (BRL)

export const AdminKitListPage = () => {
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKits = async () => {
    try {
      setLoading(true);
  const data = await apiFetch('/kits');
  setKits(asArray<Kit>(data));
    } catch (err) {
      setError('Erro ao carregar kits.');
      console.error('Erro ao carregar kits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKits();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este kit?')) {
      try {
        await apiFetch(`/kits/${id}`, {
          method: 'DELETE',
        });
        await fetchKits();
        alert('Kit excluído com sucesso!');
      } catch (err) {
        console.error('Erro ao excluir kit:', err);
        alert('Erro ao excluir kit.');
      }
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Gestão de Kits" breadcrumbs={[{ name: 'Admin' }, { name: 'Kits' }]}>
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner label="A carregar kits..." />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Gestão de Kits" breadcrumbs={[{ name: 'Admin' }, { name: 'Kits' }]}>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-destructive bg-destructive/10 p-4 rounded-lg border border-destructive/20">
            {error}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestão de Kits" breadcrumbs={[{ name: 'Admin' }, { name: 'Kits' }]}>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="text-muted-foreground text-sm">
            Total de kits: <span className="font-semibold text-foreground">{kits.length}</span>
          </div>
        </div>
        <Link to="/admin/kits/novo" className="self-start sm:self-auto">
          <Button variant="primary" className="gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar Kit
          </Button>
        </Link>
      </div>

      <SimpleCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Kit
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Preço
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Equipamentos
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {kits.map((kit) => (
                <tr key={kit.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{kit.name}</p>
                        {kit.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {kit.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-foreground">
                      {formatPrice(kit.price ?? 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">
                      {kit.equipments?.length || 0} equipamentos
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link to={`/admin/kits/${kit.id}/editar`} title="Editar kit" aria-label="Editar kit">
                        <Button variant="outline" size="sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                      </Link>
                      <Button
                        onClick={() => handleDelete(kit.id)}
                        variant="danger"
                        size="sm"
                        title="Excluir kit"
                        aria-label="Excluir kit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {kits.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum kit encontrado</h3>
            <p className="text-muted-foreground">
              Comece criando o primeiro kit de equipamentos
            </p>
          </div>
        )}
      </SimpleCard>
    </AdminLayout>
  );
};
