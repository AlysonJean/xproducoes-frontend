// src/pages/admin/EquipmentListPage.tsx

import { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { asArray } from '../../utils/normalize';
import type { Equipment } from '../../types/types';
import { formatPrice } from '../../utils/typeSafeFormatters'; 
import { AdminLayout } from '../../components/admin/AdminLayout';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { SimpleCard } from '../../components/ui/Cards';
import { Modal } from '../../components/ui/StandardComponents';
import EquipmentForm from '../../components/forms/EquipmentFormPage';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export const EquipmentListPage = () => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

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

  const handleCreate = () => {
    setEditingEquipment(null);
    setIsModalOpen(true);
  };

  const handleEdit = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setIsModalOpen(true);
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
        <Button onClick={handleCreate} variant="primary" className="gap-2 self-start sm:self-auto">
          <Plus size={20} />
          Adicionar Equipamento
        </Button>
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
                       <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        title="Editar equipamento"
                        aria-label="Editar equipamento"
                      >
                         <Edit2 size={16} />
                      </Button>
                      <Button
                        onClick={() => handleDelete(item.id)}
                        variant="danger"
                        size="sm"
                        title="Excluir equipamento"
                        aria-label="Excluir equipamento"
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

        {equipments.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum equipamento encontrado</h3>
            <p className="text-muted-foreground">
              Comece adicionando o primeiro equipamento
            </p>
          </div>
        )}
      </SimpleCard>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEquipment ? 'Editar Equipamento' : 'Novo Equipamento'}
        className="max-w-3xl"
      >
        <EquipmentForm
            initialData={editingEquipment}
            onSuccess={() => {
            setIsModalOpen(false);
            fetchEquipments();
            }}
            onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </AdminLayout>
  );
};
