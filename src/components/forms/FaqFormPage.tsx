// src/pages/admin/FaqFormPage.tsx


import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

export const FaqFormPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      const fetchFaq = async () => {
        try {
          const data: FaqItem = await apiFetch(`/faq/${id}`);
          setQuestion(data.question);
          setAnswer(data.answer);
        } catch {
          setError('Não foi possível carregar a pergunta para edição.');
        }
      };
      fetchFaq();
    }
  }, [id, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = { question, answer };

    try {
      if (isEditing) {
        await apiFetch(`/faq/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await apiFetch('/faq', { method: 'POST', body: JSON.stringify(payload) });
      }
      navigate('/admin/faq');
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
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {isEditing ? 'Editar Pergunta' : 'Adicionar Nova Pergunta'}
        </h1>
        <p className="text-muted-foreground">
          {isEditing ? 'Atualize a pergunta' : 'Adicione uma nova pergunta à FAQ'}
        </p>
      </div>

      {error && (
        <Alert 
          variant="error" 
          title="Erro" 
          description={error}
          onClose={() => setError(null)}
        />
      )}

      <Form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-8 shadow-sm">
        <FormSection 
          title="Informações da Pergunta"
          description="Preencha os dados da FAQ"
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
            rows={4}
            required
          />
        </FormSection>

        <FormActions>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/faq')}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={loading}
            disabled={loading}
          >
            {loading ? 'A Salvar...' : 'Salvar Pergunta'}
          </Button>
        </FormActions>
      </Form>
    </div>
  );
};
