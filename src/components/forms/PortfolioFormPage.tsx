import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { 
  Form, 
  FormSection, 
  FormActions, 
  Input, 
  Textarea, 
  Button, 
  Alert 
} from '../ui/StandardComponents';

export const PortfolioFormPage = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !description || !eventDate || !image) {
      setError('Todos os campos são obrigatórios.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('eventDate', new Date(eventDate).toISOString());
      formData.append('image', image);

      await apiFetch('/portfolio', {
        method: 'POST',
        body: formData,
        // Remove ALL headers for FormData - let browser set them
      });

      navigate('/admin/portfolio');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar item do portfólio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Criar Item do Portfólio
        </h1>
        <p className="text-muted-foreground">
          Adicione um novo projeto ao seu portfólio
        </p>
      </div>
      
      {error && (
        <Alert 
          variant="error" 
          title="Erro" 
          description={error}
          onClose={() => setError('')}
        />
      )}

      <Form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-8 shadow-sm">
        <FormSection 
          title="Informações do Projeto"
          description="Preencha os dados básicos do projeto"
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
            <label className="text-sm font-medium text-foreground">
              Imagem do Projeto
            </label>
            <input
              type="file"
              accept="image/*"
              title="Selecione uma imagem do projeto"
              placeholder="Escolha um arquivo de imagem"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border-2 border-border rounded-lg bg-card text-foreground transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary hover:border-primary/50 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              required
            />
            <p className="text-xs text-muted-foreground">
              Formatos aceitos: JPG, PNG, GIF (máx. 10MB)
            </p>
          </div>
        </FormSection>

        <FormActions>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/portfolio')}
            disabled={loading}
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            isLoading={loading}
            disabled={loading}
          >
            {loading ? 'Criando...' : 'Criar Item'}
          </Button>
        </FormActions>
      </Form>
    </div>
  );
};
