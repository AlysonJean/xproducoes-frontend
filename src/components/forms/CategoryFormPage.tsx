// src/components/forms/CategoryFormPage.tsx
import type { Category } from '../../types/types';
import React, { useState, useEffect, useRef } from 'react'; // removed useParams, useNavigate
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
import { useFormDraft } from '../../hooks/useFormDraft';
import { DraftRestoreBanner } from '../ui/DraftRestoreBanner';

interface CategoryFormProps {
  initialData?: Category | null;
  onSuccess: () => void;
  onCancel: () => void;
  /** Notifica o formulário pai sobre alterações não salvas, para a trava de fechamento
   * acidental (ver useUnsavedChangesGuard, usado em CategoryListPage). */
  onDirtyChange?: (dirty: boolean) => void;
}

interface DraftableCategoryData {
  name: string;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({ initialData, onSuccess, onCancel, onDirtyChange }) => {
  const isEditing = Boolean(initialData);

  const [name, setName] = useState(initialData?.name || '');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const draftKey = `xp-draft-category-${initialData?.id || 'new'}`;
  const { save: saveDraft, load: loadDraft, clear: clearDraft } = useFormDraft<DraftableCategoryData>(draftKey);
  const [draftPrompt, setDraftPrompt] = useState<{ values: DraftableCategoryData; savedAt: number } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
    } else {
      setName('');
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
    saveTimeoutRef.current = setTimeout(() => saveDraft({ name }), 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [name, isDirty, saveDraft]);

  const handleRestoreDraft = () => {
    if (!draftPrompt) return;
    setName(draftPrompt.values.name);
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

    const formData = new FormData();
    formData.append('name', name);
    if (file) {
      const seoFilename = generateSeoFilename('categories', name);
      formData.append('fileName', seoFilename);
      // Achado: sem isso, o backend cai no default 'portfolio' do Cloudinary.
      formData.append('folder', 'categories');
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
        const endpoint = '/categories'; // Padronização para plural
        if (file) {
          await apiFetch(endpoint, { method: 'POST', body: formData });
        } else {
          await apiFetch(endpoint, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }) 
          });
        }
      }
      clearDraft();
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
        {draftPrompt && (
          <DraftRestoreBanner
            savedAt={draftPrompt.savedAt}
            onRestore={handleRestoreDraft}
            onDiscard={handleDiscardDraft}
          />
        )}
        <FormSection title="" description="">
          <Input
            label="Nome da Categoria"
            value={name}
            onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
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
              onChange={(e) => { setFile(e.target.files?.[0] || null); setIsDirty(true); }}
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
