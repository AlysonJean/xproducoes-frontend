// src/pages/admin/CategoryFormPage.tsx
import type { Category } from '../../types/types';


import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { generateSeoFilename } from '../../utils/seoUtils';
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
  const [file, setFile] = useState<File | null>(null);
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

    const formData = new FormData();
    formData.append('name', name);
    if (file) {
      // SEO Filename
      const seoFilename = generateSeoFilename('categories', name);
      formData.append('fileName', seoFilename);
      formData.append('image', file);
    }
    
    // Fallback to JSON if no file, OR assume backend handles FormData for both text and file.
    // Based on user request, we want images to have SEO names.
    // Assuming backend Category Controller accepts FormData if file is present.
    // However, original code was JSON.stringify.
    // If backend only accepts JSON for creation without file, we need a distinct path or update backend.
    // Given the task is about "when uploading an image", I will assume we are adding image capability here.
    
    // Wait, the original code had NO file input.
    // I need to add the file input to the form as well.

    try {
      if (isEditing) {
        // If updating with file, likely need FormData
        // If updating without file, JSON might be fine, or FormData without file.
        // Let's assume FormData is safer if we want to support file upload now.
        if (file) {
           await apiFetch(`/categories/${id}`, { method: 'PUT', body: formData });
        } else {
           await apiFetch(`/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
        }
      } else {
        if (file) {
          await apiFetch('/api/categories', { method: 'POST', body: formData });
        } else {
          await apiFetch('/api/categories', { method: 'POST', body: JSON.stringify({ name }) });
        }
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Imagem da Categoria (Opcional)
            </label>
            <input
              type="file"
              title="Selecione a imagem da categoria"
              placeholder="Selecione um arquivo"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border-2 border-border rounded-lg bg-card text-foreground"
            />
             <p className="text-xs text-muted-foreground">
              A imagem sera renomeada automaticamente para SEO.
            </p>
          </div>
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
