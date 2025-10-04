// src/pages/admin/CategoryFormPage.tsx
import type { Category } from '../../types/types';


import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import {
  Form,
  FormSection,
  FormActions,
  Input,
  Button,
  Alert
} from '../ui/StandardComponents';

export const CategoryFormPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      const fetchCategory = async () => {
        try {
          const data: Category = await apiFetch(`/categories/${id}`);
          setName(data.name);
        } catch {
          setError('Não foi possível carregar a categoria para edição.');
        }
      };
      fetchCategory();
    }
  }, [id, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = { name };

    try {
      if (isEditing) {
        await apiFetch(`/categories/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
  await apiFetch('/api/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      navigate('/admin/categories');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro ao salvar a categoria.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {isEditing ? 'Editar Categoria' : 'Adicionar Nova Categoria'}
        </h1>
        <p className="text-muted-foreground">
          {isEditing ? 'Atualize a categoria' : 'Adicione uma nova categoria ao sistema'}
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
          title="Informações da Categoria"
          description="Preencha o nome da categoria"
        >
          <Input
            label="Nome da Categoria"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={error || undefined}
            placeholder="Digite o nome da categoria"
            required
          />
        </FormSection>

        <FormActions>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/categories')}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={loading}
            disabled={loading}
          >
            {loading ? 'A Salvar...' : 'Salvar Categoria'}
          </Button>
        </FormActions>
      </Form>
    </div>
  );
};
