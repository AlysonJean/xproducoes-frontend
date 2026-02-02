// src/components/forms/CategoryFormPage.tsx
import type { Category } from '../../types/types';
import React, { useState, useEffect } from 'react'; // removed useParams, useNavigate
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

interface CategoryFormProps {
  initialData?: Category | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const isEditing = Boolean(initialData);

  const [name, setName] = useState(initialData?.name || '');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
    } else {
      setName('');
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('name', name);
    if (file) {
      const seoFilename = generateSeoFilename('categories', name);
      formData.append('fileName', seoFilename);
      formData.append('image', file);
    }

    try {
      if (isEditing && initialData) {
        if (file) {
           await apiFetch(`/categories/${initialData.id}`, { method: 'PUT', body: formData });
        } else {
           await apiFetch(`/categories/${initialData.id}`, { method: 'PUT', body: JSON.stringify({ name }) });
        }
      } else {
        // Usando /category no singular para garantir compatibilidade com rotas
        const endpoint = '/category'; 
        if (file) {
          await apiFetch(endpoint, { method: 'POST', body: formData });
        } else {
          await apiFetch(endpoint, { method: 'POST', body: JSON.stringify({ name }) });
        }
      }
      onSuccess();
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
        <FormSection title="" description="">
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
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
             <p className="text-xs text-muted-foreground">
              A imagem será renomeada automaticamente para SEO.
            </p>
          </div>
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
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </FormActions>
      </Form>
    </div>
  );
};

// Export also as default to keep compatibility if imported elsewhere as default (temporarily)
export default CategoryForm;
