import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useNotifications } from '@/contexts/NotificationContext';
import { collaboratorFunctionsAPI } from '@/services/api';
import { CollaboratorFunction } from '@/types/types';

interface CollaboratorFunctionFormProps {
  initialData?: CollaboratorFunction;
  onSuccess: () => void;
  onCancel: () => void;
}

export const CollaboratorFunctionForm: React.FC<CollaboratorFunctionFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotifications();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (initialData) {
        await collaboratorFunctionsAPI.update(initialData.id, { name, description });
        addNotification({
          type: 'success',
          title: 'Sucesso',
          message: 'Função atualizada com sucesso!',
        });
      } else {
        await collaboratorFunctionsAPI.create({ name, description });
        addNotification({
          type: 'success',
          title: 'Sucesso',
          message: 'Função criada com sucesso!',
        });
      }
      onSuccess();
    } catch (err: unknown) {
      const error = err as Error;
      addNotification({
        type: 'error',
        title: 'Erro',
        message: error.message || 'Erro ao salvar função',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Nome da Função
        </label>
        <Input
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          placeholder="Ex: Fotógrafo, Editor, Auxiliar..."
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Descrição (opcional)
        </label>
        <textarea
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          value={description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
          placeholder="Descreva as responsabilidades desta função..."
          rows={3}
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" isLoading={loading}>
          {initialData ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  );
};
