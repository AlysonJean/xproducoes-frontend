import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useNotifications } from '@/contexts/NotificationContext';
import { collaboratorFunctionsAPI } from '@/services/api';
import { CollaboratorFunction } from '@/types/types';
import { useFormDraft } from '../../hooks/useFormDraft';
import { DraftRestoreBanner } from '../ui/DraftRestoreBanner';

interface CollaboratorFunctionFormProps {
  initialData?: CollaboratorFunction;
  onSuccess: () => void;
  onCancel: () => void;
  /** Notifica o formulário pai sobre alterações não salvas, para a trava de fechamento
   * acidental (ver useUnsavedChangesGuard, usado em CollaboratorFunctionsPage). */
  onDirtyChange?: (dirty: boolean) => void;
}

interface DraftableFunctionData {
  name: string;
  description: string;
}

export const CollaboratorFunctionForm: React.FC<CollaboratorFunctionFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
  onDirtyChange,
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { addNotification } = useNotifications();

  const draftKey = `xp-draft-collaborator-function-${initialData?.id || 'new'}`;
  const { save: saveDraft, load: loadDraft, clear: clearDraft } = useFormDraft<DraftableFunctionData>(draftKey);
  const [draftPrompt, setDraftPrompt] = useState<{ values: DraftableFunctionData; savedAt: number } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) setDraftPrompt(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (!isDirty) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveDraft({ name, description }), 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [name, description, isDirty, saveDraft]);

  const handleRestoreDraft = () => {
    if (!draftPrompt) return;
    setName(draftPrompt.values.name);
    setDescription(draftPrompt.values.description);
    setDraftPrompt(null);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setDraftPrompt(null);
  };

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
      clearDraft();
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
      {draftPrompt && (
        <DraftRestoreBanner
          savedAt={draftPrompt.savedAt}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      )}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Nome da Função
        </label>
        <Input
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setName(e.target.value); setIsDirty(true); }}
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
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => { setDescription(e.target.value); setIsDirty(true); }}
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
