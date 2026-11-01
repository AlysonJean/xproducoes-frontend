// src/components/forms/PortfolioFormPage.tsx
import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
  Checkbox
} from '../ui/StandardComponents';
import { X, Star, Video, Image as ImageIcon, Plus } from 'lucide-react';
import { useFormDraft } from '../../hooks/useFormDraft';
import { DraftRestoreBanner } from '../ui/DraftRestoreBanner';

interface PortfolioFormProps {
  initialData?: PortfolioItem | null;
  onSuccess: () => void;
  onCancel: () => void;
  /** Notifica o formulário pai sobre alterações não salvas, para a trava de fechamento
   * acidental (ver useUnsavedChangesGuard, usado em PortfolioListPage). */
  onDirtyChange?: (dirty: boolean) => void;
}

// Arquivos de mídia (File/blob) não são serializáveis — só os campos de texto entram no
// rascunho. Perder a galeria de mídia selecionada não é evitável aqui (limitação do
// navegador), mas o texto (título, descrição, data) é a parte mais penosa de redigitar.
interface DraftablePortfolioData {
  title: string;
  description: string;
  eventDate: string;
  isPinned: boolean;
}

interface MediaFile {
  id?: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  file?: File;
  isCover: boolean;
  isExisting: boolean;
}

export const PortfolioForm: React.FC<PortfolioFormProps> = ({ initialData, onSuccess, onCancel, onDirtyChange }) => {
  const isEditing = Boolean(initialData);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Media State
  const [mediaItems, setMediaItems] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const draftKey = `xp-draft-portfolio-${initialData?.id || 'new'}`;
  const { save: saveDraft, load: loadDraft, clear: clearDraft } = useFormDraft<DraftablePortfolioData>(draftKey);
  const [draftPrompt, setDraftPrompt] = useState<{ values: DraftablePortfolioData; savedAt: number } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (!isDirty) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft({ title, description, eventDate, isPinned });
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [title, description, eventDate, isPinned, isDirty, saveDraft]);

  const handleRestoreDraft = () => {
    if (!draftPrompt) return;
    setTitle(draftPrompt.values.title);
    setDescription(draftPrompt.values.description);
    setEventDate(draftPrompt.values.eventDate);
    setIsPinned(draftPrompt.values.isPinned);
    setDraftPrompt(null);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setDraftPrompt(null);
  };

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      
      // Handle Date
      if (initialData.eventDate) {
        const dateObj = new Date(initialData.eventDate);
        if (!isNaN(dateObj.getTime())) {
             setEventDate(dateObj.toISOString().split('T')[0]);
        }
      }

      setIsPinned(initialData.isPinned || false);

      // Handle Media mapping
      const existingMedia: MediaFile[] = [];
      const coverUrl = initialData.imageUrl; // Current cover

      // If backend provides media relation
      if (initialData.media && initialData.media.length > 0) {
        initialData.media.forEach((m) => {
          existingMedia.push({
            id: m.id,
            url: m.url,
            type: m.type,
            isCover: m.url === coverUrl, // Or rely on backend isCover flag if available
            isExisting: true
          });
        });
      } else if (initialData.imageUrl) {
        // Fallback for legacy items without relation
        existingMedia.push({
            id: 'legacy',
            url: initialData.imageUrl,
            type: 'IMAGE',
            isCover: true,
            isExisting: true
        });
      }
      setMediaItems(existingMedia);

    } else {
      setTitle('');
      setDescription('');
      setEventDate('');
      setIsPinned(false);
      setMediaItems([]);
    }

    const draft = loadDraft();
    if (draft) setDraftPrompt(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsDirty(true);
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const newMediaItems: MediaFile[] = newFiles.map(file => ({
        url: URL.createObjectURL(file),
        type: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE',
        file: file,
        isCover: false,
        isExisting: false
      }));

      setMediaItems(prev => {
        // If it's the first media ever, make it cover by default
        const updated = [...prev, ...newMediaItems];
        if (updated.length > 0 && !updated.some(i => i.isCover)) {
            updated[0].isCover = true;
        }
        return updated;
      });
    }
  };

  const removeMedia = (index: number) => {
    setIsDirty(true);
    setMediaItems(prev => {
      const item = prev[index];
      if (!item.isExisting && item.url) {
        URL.revokeObjectURL(item.url);
      }
      const updated = prev.filter((_, i) => i !== index);
      
      // If we removed the cover, set new cover to the first item
      if (item.isCover && updated.length > 0) {
        updated[0].isCover = true;
      }
      
      return updated;
    });
  };

  const setAsCover = (index: number) => {
    setIsDirty(true);
    setMediaItems(prev => prev.map((item, i) => ({
      ...item,
      isCover: i === index
    })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !description || !eventDate) {
      setError('Preencha os campos obrigatórios.');
      return;
    }

    if (mediaItems.length === 0) {
       setError('Adicione pelo menos uma imagem ou vídeo.');
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
      formData.append('isPinned', String(isPinned));
      
      // Determine what to send
      const newFilesToUpload = mediaItems.filter(item => !item.isExisting && item.file);
      const coverItem = mediaItems.find(item => item.isCover);
      
      // Append new files
      newFilesToUpload.forEach(item => {
        if (item.file) {
            formData.append('media', item.file);
        }
      });

      // Handle Cover Logic
      if (coverItem) {
          if (coverItem.isExisting) {
              // If cover is existing, send its URL as 'imageUrl' to update parent cache
              formData.append('imageUrl', coverItem.url);
          } else {
              // If cover is new, send its index relative to NEW files array
              const newFileIndex = newFilesToUpload.indexOf(coverItem);
              if (newFileIndex !== -1) {
                  formData.append('coverIndex', newFileIndex.toString());
              }
          }
      }

      if (isEditing && initialData) {
        await apiFetch(`/portfolio/${initialData.id}`, { method: 'PUT', body: formData });
      } else {
        await apiFetch('/portfolio', { method: 'POST', body: formData });
      }

      clearDraft();
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
        {draftPrompt && (
          <DraftRestoreBanner
            savedAt={draftPrompt.savedAt}
            onRestore={handleRestoreDraft}
            onDiscard={handleDiscardDraft}
          />
        )}
        <FormSection title="Informações do Projeto" description="Detalhes principais">
          <Input
            label="Título"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
            placeholder="Ex: Casamento Maria e João"
            required
          />

          <Textarea
            label="Descrição"
            value={description}
            onChange={(e) => { setDescription(e.target.value); setIsDirty(true); }}
            placeholder="Descreva os detalhes do evento..."
            rows={4}
            required
          />
          <Input
            label="Data do Evento"
            type="date"
            value={eventDate}
            onChange={(e) => { setEventDate(e.target.value); setIsDirty(true); }}
            required
          />
          <div className="px-1">
            <Checkbox
              id="isPinned"
              label="Fixar no Topo (Destaque Principal)"
              checked={isPinned}
              onChange={(e) => { setIsPinned(e.target.checked); setIsDirty(true); }}
            />
          </div>
        </FormSection>

        <FormSection title="Galeria" description="Fotos e Vídeos do evento">
          <div className="space-y-4">
            {/* Upload Button */}
            <div className="flex items-center justify-center w-full">
                {/* Achado (auditoria do design system): o input ficava `hidden` (display:none) — sem
                    foco, o upload era inalcançável pelo teclado. sr-only + focus-within no label. */}
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Plus className="w-8 h-8 text-muted-foreground mb-2" aria-hidden="true" />
                        <p className="text-sm text-muted-foreground">Clique para adicionar fotos ou vídeos</p>
                        <p className="text-xs text-muted-foreground mt-1">(JPG, PNG, MP4, WebM)</p>
                    </div>
                    <input 
                        type="file" 
                        className="sr-only" 
                        multiple 
                        accept="image/*,video/*"
                        onChange={handleFileSelect}
                    />
                </label>
            </div>

            {/* Media Grid */}
            {mediaItems.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {mediaItems.map((item, index) => (
                        <div key={index} className={`relative group rounded-lg overflow-hidden border border-border ${item.isCover ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
                            <div className="aspect-square bg-muted flex items-center justify-center relative">
                                {item.type === 'VIDEO' ? (
                                    <video src={item.url} className="w-full h-full object-cover" muted loop playsInline onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                                ) : (
                                    <img src={item.url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                )}
                                
                                {/* Overlay Actions — sempre visíveis no toque/celular; no desktop aparecem no
                                    hover ou quando um dos botões recebe foco (antes: só no hover). */}
                                <div className="absolute inset-0 bg-black/40 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="h-8 px-2 text-xs"
                                        onClick={() => setAsCover(index)}
                                    >
                                        {item.isCover ? <Star className="w-4 h-4 fill-warning text-warning mr-1" aria-hidden="true" /> : <Star className="w-4 h-4 mr-1" aria-hidden="true" />}
                                        {item.isCover ? 'Capa Principal' : 'Definir Capa'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="h-8 px-2 text-xs"
                                        onClick={() => removeMedia(index)}
                                        aria-label={`Remover mídia ${index + 1}`}
                                    >
                                        <X className="w-4 h-4 mr-1" aria-hidden="true" />
                                        Remover
                                    </Button>
                                </div>

                                {/* Type Badge */}
                                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center">
                                    {item.type === 'VIDEO' ? <Video className="w-3 h-3 mr-1" aria-hidden="true" /> : <ImageIcon className="w-3 h-3 mr-1" aria-hidden="true" />}
                                    {item.type === 'VIDEO' ? 'Vídeo' : 'Imagem'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        </FormSection>

        <FormActions>
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={loading} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </FormActions>
      </Form>
    </div>
  );
};

export default PortfolioForm;
