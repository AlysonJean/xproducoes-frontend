import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Briefcase } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { collaboratorFunctionsAPI } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { SimpleCard } from '@/components/ui/Cards';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/StandardComponents';
import { CollaboratorFunctionForm } from '@/components/forms/CollaboratorFunctionForm';
import { CollaboratorFunction } from '@/types/types';

export const AdminCollaboratorFunctionsPage: React.FC = () => {
  const { addNotification } = useNotifications();
  const [functions, setFunctions] = useState<CollaboratorFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFunction, setEditingFunction] = useState<CollaboratorFunction | null>(null);

  const fetchFunctions = async () => {
    try {
      setLoading(true);
      const resp = await collaboratorFunctionsAPI.getAll();
      setFunctions(resp.data || []);
    } catch (err: unknown) {
      console.error(err);
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Falha ao carregar funções de colaboradores',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFunctions();
  }, []);

  const handleCreate = () => {
    setEditingFunction(null);
    setIsModalOpen(true);
  };

  const handleEdit = (func: CollaboratorFunction) => {
    setEditingFunction(func);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover esta função?')) {
      try {
        await collaboratorFunctionsAPI.delete(id);
        addNotification({
          type: 'success',
          title: 'Sucesso',
          message: 'Função removida com sucesso!',
        });
        fetchFunctions();
      } catch (err: unknown) {
        console.error(err);
        addNotification({
          type: 'error',
          title: 'Erro',
          message: 'Falha ao remover função. Certifique-se de que não há colaboradores vinculados a ela.',
        });
      }
    }
  };

  return (
    <AdminLayout title="Funções de Colaboradores" breadcrumbs={[{ name: 'Admin' }, { name: 'Colaboradores', href: '/admin/colaboradores' }, { name: 'Funções' }]}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Funções de Colaboradores</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie as funções disponíveis para sua equipe</p>
        </div>
        <Button variant="primary" onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Função
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <BrandLoader size={80} label="Carregando funções..." />
        </div>
      ) : (
        <SimpleCard>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase">Função</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase">Descrição</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {functions.map((func) => (
                  <tr key={func.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">{func.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {func.description || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${func.active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                        {func.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(func)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(func.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {functions.length === 0 && (
            <div className="text-center py-12">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground">Nenhuma função cadastrada</h3>
              <p className="text-muted-foreground">Cadastre as funções para poder vincular aos seus colaboradores.</p>
            </div>
          )}
        </SimpleCard>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFunction ? 'Editar Função' : 'Nova Função'}
        className="max-w-md"
      >
        <CollaboratorFunctionForm
          initialData={editingFunction || undefined}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchFunctions();
          }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </AdminLayout>
  );
};
