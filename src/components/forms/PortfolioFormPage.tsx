// src/components/forms/PortfolioFormPage.tsx
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { generateSeoFilename } from '../../utils/seoUtils';
import type { PortfolioItem } from '../../types/types';
import { 
  Form, 
  FormSection, 
  FormActions, 
  Input, 
  Textarea, 
  Button, 
  Alert 
} from '../ui/StandardComponents';

interface PortfolioFormProps {
  initialData?: PortfolioItem | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PortfolioForm: React.FC<PortfolioFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const isEditing = Boolean(initialData);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      // Date logic removed as PortfolioItem lacks date
    } else {
      setTitle('');
      setDescription('');
      // setEventDate(''); removed
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For edit, image is optional. For create, it is required.
    if (!title || !description || !eventDate || (!isEditing && !image)) {
      setError('Todos os campos são obrigatórios.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();

      // SEO Filename
      const seoFilename = generateSeoFilename('portfolio', title);
      formData.append('fileName', seoFilename);

      formData.append('title', title);
      formData.append('description', description);
      formData.append('eventDate', new Date(eventDate).toISOString());
      if (image) {
        formData.append('image', image);
      }

      if (isEditing && initialData) {
        await apiFetch(`/portfolio/${initialData.id}`, { method: 'PUT', body: formData });
      } else {
        await apiFetch('/portfolio', { method: 'POST', body: formData });
      }

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar item do portfólio.');
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
          onClose={() => setError('')}
        />
      )}

      <Form onSubmit={handleSubmit} className="space-y-6">
        <FormSection 
          title=""
          description=""
        >
          <Input
            label="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Digite o título do projeto"
            required
          />

          <Textarea
            label="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o projeto em detalhes"
            rows={4}
            required
          />

          <Input
            label="Data do Evento"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            required
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Imagem do Projeto
            </label>
            <input
              type="file"
              accept="image/*"
              title="Selecione uma imagem do projeto"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required={!isEditing}
            />
            <p className="text-xs text-muted-foreground">
              Formatos aceitos: JPG, PNG, GIF (máx. 10MB)
            </p>
            {isEditing && initialData?.imageUrl && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Imagem atual:</p>
                <img 
                  src={initialData.imageUrl} 
                  alt={initialData.title} 
                  className="h-24 w-auto object-cover rounded border"
                />
              </div>
            )}
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

export default PortfolioForm;
