import { useState, useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '../../services/api';
import { asArray } from '../../utils/normalize';
import { transformKit } from '../../utils/transformKit';
import { formatPrice } from '../../utils/typeSafeFormatters';
import type { Kit } from '../../types/types';
import { BrandLoader } from '@/components/ui/BrandLoader';
import AdminLayout from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/Button';
import { SimpleCard } from '../../components/ui/Cards';
import KitForm from '../../components/forms/KitFormPage';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { Modal } from '@/components/ui/StandardComponents';
import { StatusSelect } from '../../components/admin/StatusSelect';
import { ItemStatus } from '../../types/types';

export const AdminKitListPage = () => {
  const { addNotification } = useNotifications();
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<Kit | null>(null);

  const fetchKits = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/kits');
      setKits(asArray<Kit>(data).map(transformKit));
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
        addNotification({
          type: 'success',
          title: 'Sucesso',
          message: 'Kit excluído com sucesso!'
        });
      } catch (err) {
        console.error('Erro ao excluir kit:', err);
        addNotification({
          type: 'error',
          title: 'Erro',
          message: 'Erro ao excluir kit.'
        });
      }
    }
  };

  const handleStatusChange = async (kit: Kit, newStatus: ItemStatus) => {
    try {
      const formData = new FormData();
      formData.append('status', newStatus);

      await apiFetch(`/kits/${kit.id}`, {
        method: 'PUT',
        body: formData,
      });

      fetchKits();
      addNotification({
        type: 'success',
        title: 'Sucesso',
        message: 'Status atualizado com sucesso!'
      });
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Erro ao atualizar status.'
      });
    }
  };

  const handleCreate = () => {
    setEditingKit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (kit: Kit) => {
    setEditingKit(kit);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <AdminLayout title="Gestão de Kits" breadcrumbs={[{ name: 'Admin' }, { name: 'Kits' }]}>
        <div className="flex items-center justify-center min-h-96">
          <BrandLoader size={120} label="Carregando kits..." />
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
        <Button onClick={handleCreate} variant="primary" className="gap-2 self-start sm:self-auto">
          <Plus size={20} />
          Adicionar Kit
        </Button>
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
                  Status
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
                    <div className="flex items-center gap-4">
                      {kit.imageUrl ? (
                        <img
                          src={kit.imageUrl}
                          alt={kit.name}
                          className="w-12 h-12 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <Package className="w-6 h-6 text-primary" />
                        </div>
                      )}
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
                    <StatusSelect 
                      currentStatus={kit.status as ItemStatus || ItemStatus.ACTIVE}
                      onStatusChange={(newStatus) => handleStatusChange(kit, newStatus)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">
                      {(kit.items?.length || kit.equipments?.length) || 0} equipamentos
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                       <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(kit)}
                        title="Editar kit"
                        aria-label="Editar kit"
                      >
                         <Edit2 size={16} />
                      </Button>
                      <Button
                        onClick={() => handleDelete(kit.id)}
                        variant="danger"
                        size="sm"
                        title="Excluir kit"
                        aria-label="Excluir kit"
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

        {kits.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum kit encontrado</h3>
            <p className="text-muted-foreground">
              Comece criando o primeiro kit de equipamentos
            </p>
          </div>
        )}
      </SimpleCard>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingKit ? 'Editar Kit' : 'Novo Kit'}
        className="max-w-2xl"
      >
        <div className="max-h-[80vh]">
            <KitForm
            initialData={editingKit}
            onSuccess={() => {
                setIsModalOpen(false);
                fetchKits();
            }}
            onCancel={() => setIsModalOpen(false)}
            />
        </div>
      </Modal>
    </AdminLayout>
  );
};
