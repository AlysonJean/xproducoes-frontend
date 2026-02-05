import { useState, useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '../../services/api';
import { asArray } from '../../utils/normalize';
import type { Service } from '../../types/types';
import { formatMoney } from '../../utils/typeSafeFormatters'; 
import { AdminLayout } from '../../components/admin/AdminLayout';
import BrandLoader from '../../components/ui/BrandLoader';
import { Button } from '../../components/ui/Button';
import { SimpleCard } from '../../components/ui/Cards';
import { Modal } from '../../components/ui/StandardComponents';
import ServiceForm from '../../components/forms/ServiceFormPage';
import { Plus, Edit2, Trash2, Clock } from 'lucide-react';
import { StatusSelect } from '../../components/admin/StatusSelect';
import { ItemStatus } from '../../types/types';

export const AdminServiceListPage = () => {
  const { addNotification } = useNotifications();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/services');
      setServices(asArray<Service>(data));
    } catch (err: unknown) {
      setError(
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message?: unknown }).message)
          : 'Não foi possível carregar a lista de serviços.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleDelete = async (id: string) => {
    if (
      window.confirm('Tem a certeza de que quer apagar este serviço? Esta ação é irreversível.')
    ) {
      try {
        await apiFetch(`/services/${id}`, { method: 'DELETE' });
        fetchServices();
        addNotification({
          type: 'success',
          title: 'Sucesso',
          message: 'Serviço apagado com sucesso.'
        });
      } catch (err: unknown) {
        addNotification({
          type: 'error',
          title: 'Erro',
          message: `Erro ao apagar serviço: ${
            typeof err === 'object' && err !== null && 'message' in err
              ? String((err as { message?: unknown }).message)
              : 'Erro desconhecido.'
          }`
        });
      }
    }
  };

  const handleStatusChange = async (service: Service, newStatus: ItemStatus) => {
    try {
      await apiFetch(`/services/${service.id}`, { 
        method: 'PUT', 
        body: JSON.stringify({ status: newStatus }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      fetchServices();
      addNotification({
        type: 'success',
        title: 'Sucesso',
        message: 'Status atualizado com sucesso.'
      });
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Erro ao atualizar status.'
      });
      console.error(err);
    }
  };

  const handleCreate = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <AdminLayout title="Gestão de Serviços" breadcrumbs={[{ name: 'Admin' }, { name: 'Serviços' }]}>
        <BrandLoader size={120} label="Carregando serviços..." />
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Gestão de Serviços" breadcrumbs={[{ name: 'Admin' }, { name: 'Serviços' }]}>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-destructive bg-destructive/10 p-4 rounded-lg border border-destructive">
            {error}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestão de Serviços" breadcrumbs={[{ name: 'Admin' }, { name: 'Serviços' }]}>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="text-muted-foreground text-sm">
            Total de serviços: <span className="font-semibold text-foreground">{services.length}</span>
          </div>
          <div className="text-muted-foreground text-sm">
            Ativos: <span className="font-semibold text-emerald-600">
              {services.filter(s => s.status === 'ACTIVE').length}
            </span>
          </div>
        </div>
        <Button onClick={handleCreate} variant="primary" className="gap-2 self-start sm:self-auto">
          <Plus size={20} />
          Adicionar Serviço
        </Button>
      </div>

      <SimpleCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Serviço
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Preço Base
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Duração
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {services.map((item) => (
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
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{item.name}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-foreground">
                      {formatMoney(item.price)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock size={14} className="mr-1" />
                      {(item.duration / 60).toFixed(1).replace('.0', '')}h
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusSelect 
                      currentStatus={item.status as ItemStatus || ItemStatus.ACTIVE}
                      onStatusChange={(newStatus) => handleStatusChange(item, newStatus)}
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                       <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        title="Editar serviço"
                      >
                         <Edit2 size={16} />
                      </Button>
                      <Button
                        onClick={() => handleDelete(item.id)}
                        variant="danger"
                        size="sm"
                        title="Excluir serviço"
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

        {services.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum serviço encontrado</h3>
            <p className="text-muted-foreground">
              Comece adicionando o primeiro serviço (ex: DJ, Fotógrafo)
            </p>
          </div>
        )}
      </SimpleCard>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? 'Editar Serviço' : 'Novo Serviço'}
        className="max-w-3xl"
      >
        <ServiceForm
            initialData={editingService}
            onSuccess={() => {
              setIsModalOpen(false);
              fetchServices();
            }}
            onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </AdminLayout>
  );
};
