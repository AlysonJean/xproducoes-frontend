// packages/web/src/shared/modals/EquipmentModal.tsx

import React, { useState, useEffect } from 'react';
import { FormModal } from './FormModal';
import { EquipmentModalProps, EquipmentData, Category } from '../../types/types';
import {
  Input,
  Select,
  Textarea,
  Button,
  Alert
} from '../ui/StandardComponents';
import { apiFetch } from '../../services/api';

export const EquipmentModal: React.FC<EquipmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  initialData,
  isEditing = false,
  title,
  ...props
}) => {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const handleSubmit = (data: unknown) => {
    if (typeof data !== 'object' || data === null) return;
    const d = data as Record<string, unknown>;
    const equipmentData: EquipmentData = {
      name: d.name as string,
      description: d.description as string,
      price: parseFloat(d.price as string),
      category: d.category as string,
      status: d.status as string,
      specifications: (d.specifications as string) || '',
      availability: d.availability === 'true',
      images: imageFiles,
    };
    if (onSubmit) onSubmit(equipmentData);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles(files);

    // Create preview URLs
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const defaultCategories = [
    'Fotografia',
    'Filmagem',
    'Áudio',
    'Iluminação',
    'Acessórios',
    'Estabilização',
    'Transmissão',
    'Outros',
  ];

  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchCategories = async () => {
      try {
        const res = await apiFetch('/categories');
        if (!mounted) return;
        if (Array.isArray(res)) {
          setCategories(res as Category[]);
        } else if ((res as any)?.data && Array.isArray((res as any).data)) {
          setCategories((res as any).data as Category[]);
        } else {
          // fallback to default list transformed to Category shape
          setCategories(defaultCategories.map((name, idx) => ({ id: String(idx), name })));
        }
      } catch (e) {
        if (!mounted) return;
        setCategories(defaultCategories.map((name, idx) => ({ id: String(idx), name })));
      }
    };

    fetchCategories();
    return () => {
      mounted = false;
    };
  }, []);

  const statusOptions = ['Disponível', 'Indisponível', 'Manutenção', 'Reservado'];

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={title || (isEditing ? 'Editar Equipamento' : 'Novo Equipamento')}
      isLoading={isLoading}
      submitText={isEditing ? 'Atualizar' : 'Criar'}
      size="lg"
      {...props}
    >
      <div className="space-y-4">
        <Input
          label="Nome do Equipamento *"
          name="name"
          required
          placeholder="Ex: Canon EOS R5, Sony A7III, etc."
          defaultValue={initialData?.name as string}
        />

        <Textarea
          label="Descrição *"
          name="description"
          required
          rows={3}
          placeholder="Descreva o equipamento, suas características e especificações"
          defaultValue={initialData?.description as string}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Categoria *"
            name="category"
            required
            options={[
              { value: '', label: 'Selecione uma categoria' },
              ...categories.map((category) => ({ value: category.id || category.name, label: category.name }))
            ]}
            defaultValue={initialData?.category as string}
          />

          <div className="space-y-2">
            <Input
              label="Preço por Dia (R$) *"
              type="number"
              name="price"
              required
              min={0}
              step={0.01}
              placeholder="0.00"
              defaultValue={initialData?.price as string}
            />
            <Input
              label="Preço por Hora (R$)"
              type="number"
              name="pricePerHour"
              min={0}
              step={0.01}
              placeholder="Preço por Hora (R$)"
              defaultValue={initialData?.pricePerHour as string}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Status *"
            name="status"
            required
            options={statusOptions.map((status) => ({ value: status, label: status }))}
            defaultValue={initialData?.status as string}
          />

          <Select
            label="Disponibilidade"
            name="availability"
            options={[
              { value: 'true', label: 'Disponível' },
              { value: 'false', label: 'Indisponível' }
            ]}
            defaultValue={initialData?.availability ? 'true' : 'false'}
          />
        </div>

        <Textarea
          label="Especificações Técnicas"
          name="specifications"
          rows={4}
          placeholder="Resolução, dimensões, peso, compatibilidade, etc."
          defaultValue={initialData?.specifications as string}
        />

        <div>
          <Input
            type="file"
            label="Imagens do Equipamento"
            name="images"
            multiple
            accept="image/*"
            onChange={handleImageChange}
            description="Selecione múltiplas imagens para melhor apresentação"
          />
        </div>

        {previewUrls.length > 0 && (
          <div>
            <label className="text-sm font-medium text-secondary mb-2">
              Pré-visualização das Imagens
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-md border border-border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="xs"
                    className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center text-xs"
                    onClick={() => {
                      const newFiles = imageFiles.filter((_, i) => i !== index);
                      const newUrls = previewUrls.filter((_, i) => i !== index);
                      setImageFiles(newFiles);
                      setPreviewUrls(newUrls);
                    }}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {initialData?.status === 'Indisponível' && (
          <Alert variant="warning" title="Atenção">
            Este equipamento está marcado como indisponível. Certifique-se de que está pronto para uso antes de alterar o status.
          </Alert>
        )}
      </div>
    </FormModal>
  );
};
