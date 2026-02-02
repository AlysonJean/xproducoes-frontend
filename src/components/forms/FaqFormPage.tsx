// src/components/forms/FaqFormPage.tsx
import React, { useState, useEffect } from 'react';
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

interface FaqFormProps {
  initialData?: FaqItem | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const FaqForm: React.FC<FaqFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const isEditing = Boolean(initialData);

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setQuestion(initialData.question);
      setAnswer(initialData.answer);
    } else {
      setQuestion('');
      setAnswer('');
    }
  }, [initialData]);

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
        <FormSection 
          title=""
          description=""
        >
          <Input
            label="Pergunta"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            error={error || undefined}
            placeholder="Digite a pergunta"
            required
          />
          <Textarea
            label="Resposta"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
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
