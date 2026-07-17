// src/components/forms/FaqFormPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../services/api';
import type { FaqItem } from '../../types/types';
import {
  Form,
  FormSection,
  FormActions,
  Input,
  Button,
  Alert,
  Textarea
} from '../ui/StandardComponents';
import { useFormDraft } from '../../hooks/useFormDraft';
import { DraftRestoreBanner } from '../ui/DraftRestoreBanner';

interface FaqFormProps {
  initialData?: FaqItem | null;
  onSuccess: () => void;
  onCancel: () => void;
  /** Notifica o formulário pai sobre alterações não salvas, para a trava de fechamento
   * acidental (ver useUnsavedChangesGuard, usado em FaqListPage). */
  onDirtyChange?: (dirty: boolean) => void;
}

interface DraftableFaqData {
  question: string;
  answer: string;
}

export const FaqForm: React.FC<FaqFormProps> = ({ initialData, onSuccess, onCancel, onDirtyChange }) => {
  const isEditing = Boolean(initialData);

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const draftKey = `xp-draft-faq-${initialData?.id || 'new'}`;
  const { save: saveDraft, load: loadDraft, clear: clearDraft } = useFormDraft<DraftableFaqData>(draftKey);
  const [draftPrompt, setDraftPrompt] = useState<{ values: DraftableFaqData; savedAt: number } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialData) {
      setQuestion(initialData.question);
      setAnswer(initialData.answer);
    } else {
      setQuestion('');
      setAnswer('');
    }

    const draft = loadDraft();
    if (draft) setDraftPrompt(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (!isDirty) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveDraft({ question, answer }), 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [question, answer, isDirty, saveDraft]);

  const handleRestoreDraft = () => {
    if (!draftPrompt) return;
    setQuestion(draftPrompt.values.question);
    setAnswer(draftPrompt.values.answer);
    setDraftPrompt(null);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setDraftPrompt(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = { question, answer };

    try {
      if (isEditing && initialData) {
        await apiFetch(`/faq/${initialData.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiFetch('/faq', { method: 'POST', body: JSON.stringify(payload) });
      }
      clearDraft();
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Ocorreu um erro ao salvar a pergunta.');
      } else {
        setError('Ocorreu um erro ao salvar a pergunta.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert 
          variant="error" 
          title="Erro" 
          description={error}
          onClose={() => setError(null)}
        />
      )}

      <Form onSubmit={handleSubmit} className="space-y-6">
        {draftPrompt && (
          <DraftRestoreBanner
            savedAt={draftPrompt.savedAt}
            onRestore={handleRestoreDraft}
            onDiscard={handleDiscardDraft}
          />
        )}
        <FormSection
          title=""
          description=""
        >
          <Input
            label="Pergunta"
            value={question}
            onChange={(e) => { setQuestion(e.target.value); setIsDirty(true); }}
            error={error || undefined}
            placeholder="Digite a pergunta"
            required
          />
          <Textarea
            label="Resposta"
            value={answer}
            onChange={(e) => { setAnswer(e.target.value); setIsDirty(true); }}
            error={error || undefined}
            placeholder="Digite a resposta"
            rows={5}
            required
          />
        </FormSection>

        <FormActions>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={loading}
            disabled={loading}
          >
            {loading ? 'Salvar' : 'Salvar'}
          </Button>
        </FormActions>
      </Form>
    </div>
  );
};

export default FaqForm;
