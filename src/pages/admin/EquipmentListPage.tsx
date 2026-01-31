// src/pages/admin/EquipmentListPage.tsx

import { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { asArray } from '../../utils/normalize';
import type { Equipment } from '../../types/types';
import { formatPrice } from '../../utils/typeSafeFormatters'; // Caminho correto
import { Link } from 'react-router-dom';
import { AdminLayout } from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { SimpleCard } from '../../components/ui/Cards';

export const EquipmentListPage = () => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEquipments = async () => {
    try {
      setLoading(true);
  const data = await apiFetch('/equipments');
  setEquipments(asArray<Equipment>(data));
    } catch (err: unknown) {
      setError(
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message?: unknown }).message)
          : 'Não foi possível carregar a lista de equipamentos.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments();
  }, []);

  const handleDelete = async (id: string) => {
    if (
      window.confirm('Tem a certeza de que quer apagar este equipamento? Esta ação é irreversível.')
    ) {
      try {
        await apiFetch(`/equipments/${id}`, { method: 'DELETE' });
        // Atualiza a lista após apagar
        fetchEquipments();
      } catch (err: unknown) {
        alert(
          `Erro ao apagar equipamento: ${
            typeof err === 'object' && err !== null && 'message' in err
              ? String((err as { message?: unknown }).message)
              : 'Erro desconhecido.'
          }`
        );
      }
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Gestão de Equipamentos" breadcrumbs={[{ name: 'Admin' }, { name: 'Equipamentos' }]}>
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner label="A carregar equipamentos..." />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Gestão de Equipamentos" breadcrumbs={[{ name: 'Admin' }, { name: 'Equipamentos' }]}>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-destructive bg-destructive/10 p-4 rounded-lg border border-destructive">
            {error}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestão de Equipamentos" breadcrumbs={[{ name: 'Admin' }, { name: 'Equipamentos' }]}>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="text-muted-foreground text-sm">
            Total de equipamentos: <span className="font-semibold text-foreground">{equipments.length}</span>
          </div>
          <div className="text-muted-foreground text-sm">
            Disponíveis: <span className="font-semibold text-emerald-600">
              {equipments.filter(e => e.isAvailable).length}
            </span>
          </div>
        </div>
        <Link to="/admin/equipamentos/novo" className="self-start sm:self-auto">
          <Button variant="primary" className="gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar Equipamento
          </Button>
        </Link>
      </div>

      <SimpleCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Equipamento
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Preço/Hora
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
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
              {equipments.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted border flex items-center justify-center">
                          <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-foreground">
                      {formatPrice(item.pricePerHour || 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.isAvailable 
                        ? 'bg-emerald-100 text-emerald-800/20'
                        : 'bg-destructive/10 text-red-800/20'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        item.isAvailable ? 'bg-emerald-400' : 'bg-red-400'
                      }`}></div>
                      {item.isAvailable ? 'Disponível' : 'Indisponível'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">
                      {item.category || 'Sem categoria'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link to={`/admin/equipamentos/${item.id}/editar`} title="Editar equipamento" aria-label="Editar equipamento">
                        <Button variant="outline" size="sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Button>
                      </Link>
                      <Button
                        onClick={() => handleDelete(item.id)}
                        variant="danger"
                        size="sm"
                        title="Excluir equipamento"
                        aria-label="Excluir equipamento"
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

        {equipments.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum equipamento encontrado</h3>
            <p className="text-muted-foreground">
              Comece adicionando o primeiro equipamento ao catálogo
            </p>
          </div>
        )}
      </SimpleCard>
    </AdminLayout>
  );
};
