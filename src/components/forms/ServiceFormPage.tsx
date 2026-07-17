// src/components/forms/ServiceFormPage.tsx
import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { apiFetch } from '../../services/api';
import {
  Form,
  FormSection,
  FormActions,
  Input,
  Textarea,
  Button,
  Select
} from '../ui/StandardComponents';
import { ItemStatus, type Service } from '../../types/types';
import { Upload, X } from 'lucide-react';
import { generateSeoFilename } from '../../utils/seoUtils';
import { logger } from '../../utils/logger';
import { useFormDraft } from '../../hooks/useFormDraft';
import { DraftRestoreBanner } from '../ui/DraftRestoreBanner';

interface ServiceFormProps {
  initialData?: Service | null;
  onSuccess: () => void;
  onCancel: () => void;
  /** Notifica o formulário pai sobre alterações não salvas, para a trava de fechamento
   * acidental (ver useUnsavedChangesGuard, usado em AdminServiceListPage). */
  onDirtyChange?: (dirty: boolean) => void;
}

interface DraftableServiceData {
  name: string;
  description: string;
  price: number | string;
  duration: number | string;
  status: ItemStatus;
}

export const ServiceForm: React.FC<ServiceFormProps> = ({ initialData, onSuccess, onCancel, onDirtyChange }) => {
  const [submitLoading, setSubmitLoading] = useState(false);
  const isEditing = Boolean(initialData);
  const { addNotification } = useNotifications();

  // State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | string>(0);
  const [duration, setDuration] = useState<number | string>(1); // Store in hours for display
  const [status, setStatus] = useState<ItemStatus>(ItemStatus.ACTIVE);
  const [isDirty, setIsDirty] = useState(false);

  // Single image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const draftKey = `xp-draft-service-${initialData?.id || 'new'}`;
  const { save: saveDraft, load: loadDraft, clear: clearDraft } = useFormDraft<DraftableServiceData>(draftKey);
  const [draftPrompt, setDraftPrompt] = useState<{ values: DraftableServiceData; savedAt: number } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description);
      setPrice(initialData.price);
      // Convert minutes from backend to hours for display
      setDuration(initialData.duration / 60);
      setStatus((initialData.status as ItemStatus) || ItemStatus.ACTIVE);

      if (initialData.imageUrl) {
        setImagePreview(initialData.imageUrl);
      }
    }

    const draft = loadDraft();
    if (draft) setDraftPrompt(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  // Avisa o pai sempre que o estado de "alterado" mudar, para a trava de fechamento.
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Auto-salva um rascunho (debounced) enquanto o usuário digita — protege contra fechar o
  // modal sem querer, fechar a aba ou um crash do navegador. Imagem (File) não é serializável,
  // não entra no rascunho.
  useEffect(() => {
    if (!isDirty) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft({ name, description, price, duration, status });
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [name, description, price, duration, status, isDirty, saveDraft]);

  const handleRestoreDraft = () => {
    if (!draftPrompt) return;
    setName(draftPrompt.values.name);
    setDescription(draftPrompt.values.description);
    setPrice(draftPrompt.values.price);
    setDuration(draftPrompt.values.duration);
    setStatus(draftPrompt.values.status);
    setDraftPrompt(null);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setDraftPrompt(null);
  };

  // Clean up object URL
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setIsDirty(true);

      // Revoke old preview
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }

      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview('');
    setIsDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      const formData = new FormData();
      
      // Generate SEO-friendly filename
      const seoFilename = generateSeoFilename('services', name);
      formData.append('fileName', seoFilename);
      formData.append('folder', 'services');
      
      formData.append('name', name);
      formData.append('description', description);
      formData.append('price', String(price));
      // Convert hours to minutes for backend
      formData.append('duration', String(Number(duration) * 60));
      formData.append('status', status);

      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (isEditing && initialData) {
        await apiFetch(`/services/${initialData.id}`, { 
          method: 'PUT',
          body: formData 
        });
      } else {
        await apiFetch('/services', { 
          method: 'POST',
          body: formData 
        });
      }

      addNotification({
        type: 'success',
        title: 'Sucesso',
        message: `Serviço ${isEditing ? 'atualizado' : 'criado'} com sucesso.`
      });

      clearDraft();
      onSuccess();
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Erro ao salvar serviço. Tente novamente.'
      });
      logger.error('Erro', 'ServiceFormPage', err);
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit} className="space-y-6">
      {draftPrompt && (
        <DraftRestoreBanner
          savedAt={draftPrompt.savedAt}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      )}
      <FormSection
        title="Dados do Serviço"
        description="Informações sobre o serviço oferecido (Staff, DJ, Mídia, etc)"
      >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome do Serviço"
              value={name}
              onChange={e => { setName(e.target.value); setIsDirty(true); }}
              placeholder="Ex: DJ Profissional"
              required
            />

             <Input
              label="Preço Base (€)"
              type="number"
              step="0.01"
              value={price}
              onChange={e => { setPrice(e.target.value); setIsDirty(true); }}
              required
            />
          </div>

          <Textarea
            label="Descrição"
            value={description}
            onChange={e => { setDescription(e.target.value); setIsDirty(true); }}
            rows={3}
            placeholder="O que está incluso neste serviço?"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Duração Padrão (horas)"
              type="number"
              step="0.5"
              min="0.5"
              value={duration}
              onChange={e => { setDuration(e.target.value); setIsDirty(true); }}
              helperText="Tempo estimado de duração do serviço (ex: 2, 4.5, 8)"
            />

            <Select
              label="Status"
              value={status}
              onChange={e => { setStatus(e.target.value as ItemStatus); setIsDirty(true); }}
              options={[
                { value: ItemStatus.ACTIVE, label: 'Ativo' },
                { value: ItemStatus.MAINTENANCE, label: 'Em Manutenção' },
                { value: ItemStatus.COMING_SOON, label: 'Em Breve' },
                { value: ItemStatus.INACTIVE, label: 'Inativo' },
              ]}
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-foreground">Imagem de Capa</label>
            
            {/* Upload Button or Preview */}
            {!imagePreview ? (
              <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Clique para adicionar imagem</p>
                      </div>
                      <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleFileSelect}
                      />
                  </label>
              </div>
            ) : (
              <div className="relative w-full max-w-sm">
                <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg border" />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full"
                  onClick={removeImage}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </FormSection>

        <FormActions>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitLoading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            isLoading={submitLoading}
            disabled={submitLoading}
          >
            {submitLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </FormActions>
      </Form>
  );
};

export default ServiceForm;
