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
import { X, Star, Video, Image as ImageIcon, Plus } from 'lucide-react';

interface PortfolioFormProps {
  initialData?: PortfolioItem | null;
  onSuccess: () => void;
  onCancel: () => void;
}

interface MediaFile {
  id?: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  file?: File;
  isCover: boolean;
  isExisting: boolean;
}

export const PortfolioForm: React.FC<PortfolioFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const isEditing = Boolean(initialData);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  
  // Media State
  const [mediaItems, setMediaItems] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      setMediaItems([]);
    }
  }, [initialData]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        <FormSection title="Informações do Projeto" description="Detalhes principais">
          <Input
            label="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Casamento Maria e João"
            required
          />

          <Textarea
            label="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva os detalhes do evento..."
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
        </FormSection>

        <FormSection title="Galeria" description="Fotos e Vídeos do evento">
          <div className="space-y-4">
            {/* Upload Button */}
            <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Clique para adicionar fotos ou vídeos</p>
                        <p className="text-xs text-muted-foreground mt-1">(JPG, PNG, MP4, WebM)</p>
                    </div>
                    <input 
                        type="file" 
                        className="hidden" 
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
                        <div key={index} className={`relative group rounded-lg overflow-hidden border ${item.isCover ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                            <div className="aspect-square bg-black/5 flex items-center justify-center relative">
                                {item.type === 'VIDEO' ? (
                                    <video src={item.url} className="w-full h-full object-cover" muted loop playsInline onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                                ) : (
                                    <img src={item.url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                )}
                                
                                {/* Overlay Actions */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="h-8 px-2 text-xs"
                                        onClick={() => setAsCover(index)}
                                    >
                                        {item.isCover ? <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1" /> : <Star className="w-4 h-4 mr-1" />}
                                        {item.isCover ? 'Capa Principal' : 'Definir Capa'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="h-8 px-2 text-xs"
                                        onClick={() => removeMedia(index)}
                                    >
                                        <X className="w-4 h-4 mr-1" />
                                        Remover
                                    </Button>
                                </div>

                                {/* Type Badge */}
                                <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center">
                                    {item.type === 'VIDEO' ? <Video className="w-3 h-3 mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
                                    {item.type}
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
