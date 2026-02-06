// packages/web/src/shared/modals/KitModal.tsx

import React, { useState } from 'react';
import { FormModal } from './FormModal';
import { KitModalProps, KitData } from '../../types/types';
import {
  Input,
  Select,
  Textarea,
  Button,
  Alert
} from '../ui/StandardComponents';

export const KitModal: React.FC<KitModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  initialData,
  isEditing = false,
  availableEquipment = [],
  title,
  ...props
}) => {
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(
    Array.isArray(initialData?.equipmentIds)
      ? initialData?.equipmentIds.filter((id): id is string => typeof id === 'string')
      : []
  );

  // Função para alternar seleção de equipamento
  const toggleEquipment = (equipmentId?: string) => {
    if (!equipmentId) return;
    setSelectedEquipment((prev) =>
      prev.includes(equipmentId) ? prev.filter((id) => id !== equipmentId) : [...prev, equipmentId]
    );
  };

  // Função para upload de imagens
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles(files);
    // Criar URLs de preview
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const handleSubmit = (data: unknown) => {
    if (typeof data !== 'object' || data === null) return;
    const d = data as Partial<KitData>;
    const kitData: KitData = {
      name: d.name!,
      description: d.description!,
      price: typeof d.price === 'string' ? parseFloat(d.price) : Number(d.price ?? 0),
      category: d.category!,
      status: d.status!,
      equipmentIds: selectedEquipment,
      discountPercentage: d.discountPercentage
        ? typeof d.discountPercentage === 'string'
          ? parseFloat(d.discountPercentage)
          : Number(d.discountPercentage)
        : undefined,
      availability: d.availability === 'true' || d.availability === true,
      images: imageFiles,
    };
    if (onSubmit) onSubmit(kitData);
  };

  // ...existing code...
  const calculateTotalPrice = () => {
    return selectedEquipment.reduce((total, equipmentId) => {
      const equipment = availableEquipment.find((eq) => eq.id === equipmentId);
      return total + (equipment?.price || 0);
    }, 0);
  };

  const categories = [
    'Fotografia Completa',
    'Filmagem Profissional',
    'Áudio e Vídeo',
    'Iluminação Studio',
    'Kit Básico',
    'Kit Premium',
    'Transmissão Ao Vivo',
    'Outros',
  ];

  const statusOptions = ['Disponível', 'Indisponível', 'Manutenção', 'Reservado'];

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={title || (isEditing ? 'Editar Kit' : 'Novo Kit')}
      isLoading={isLoading}
      submitText={isEditing ? 'Atualizar' : 'Criar'}
      size="xl"
      {...props}
    >
      <div className="space-y-4">
        <Input
          label="Nome do Kit *"
          name="name"
          required
          placeholder="Ex: Kit Fotografia Casamento, Kit Filmagem Básica, etc."
          defaultValue={initialData?.name as string || ''}
        />

        <Textarea
          label="Descrição *"
          name="description"
          required
          rows={3}
          placeholder="Descreva o kit, quais equipamentos inclui e para que tipo de evento é ideal"
          defaultValue={initialData?.description as string || ''}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Categoria *"
            name="category"
            required
            options={[
              { value: '', label: 'Selecione uma categoria' },
              ...categories.map((category) => ({ value: category, label: category }))
            ]}
            defaultValue={initialData?.category as string || ''}
          />

          <Select
            label="Status *"
            name="status"
            required
            options={statusOptions.map((status) => ({ value: status, label: status }))}
            defaultValue={initialData?.status as string || ''}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-card-foreground mb-2">
            Equipamentos do Kit *
          </label>
          <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
            {availableEquipment.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum equipamento disponível</p>
            ) : (
              <div className="space-y-2">
                {availableEquipment.map((equipment) => (
                  <div
                    key={equipment.id}
                    className="flex items-center justify-between p-2 hover:bg-muted rounded"
                  >
                    <div className="flex items-center">
                      <Input
                        type="checkbox"
                        checked={equipment.id ? selectedEquipment.includes(equipment.id) : false}
                        onChange={() => toggleEquipment(equipment.id)}
                        className="mr-3 h-4 w-4 text-primary border rounded"
                        title={`Selecionar equipamento ${equipment.name}`}
                        aria-label={`Selecionar equipamento ${equipment.name}`}
                      />
                      <div>
                        <span className="text-sm font-medium">{equipment.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">({equipment.categoryId})</span>
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-success">R${equipment.price}/dia</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Selecione os equipamentos que fazem parte deste kit
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Preço do Kit (R$) *"
            type="number"
            name="price"
            required
            min={0}
            step={0.01}
            placeholder="0.00"
            defaultValue={initialData?.price as string ?? ''}
          />
          <Input
            label="Desconto (%)"
            type="number"
            name="discountPercentage"
            min={0}
            max={100}
            step={0.1}
            placeholder="0"
            defaultValue={initialData?.discountPercentage as string ?? ''}
          />
        </div>

        {selectedEquipment.length > 0 && (
          <div className="p-3 bg-primary/10 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2">Resumo de Preços</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <div className="flex justify-between">
                <span>Total dos equipamentos individuais:</span>
                <span>R${calculateTotalPrice().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Equipamentos selecionados:</span>
                <span>{selectedEquipment.length} itens</span>
              </div>
            </div>
          </div>
        )}

        <Select
          label="Disponibilidade"
          name="availability"
          options={[
            { value: 'true', label: 'Disponível' },
            { value: 'false', label: 'Indisponível' }
          ]}
          defaultValue={initialData?.availability ? 'true' : 'false'}
        />

        <Input
          type="file"
          label="Imagens do Kit"
          name="images"
          multiple
          accept="image/*"
          onChange={handleImageChange}
          description="Selecione imagens que mostrem os equipamentos do kit"
        />

        {previewUrls.length > 0 && (
          <div>
            <label className="text-sm font-medium text-card-foreground mb-2">
              Pré-visualização das Imagens
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-24 object-cover rounded-md border"
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

        {selectedEquipment.length === 0 && (
          <Alert variant="warning" title="Atenção">
            Selecione pelo menos um equipamento para criar o kit.
          </Alert>
        )}
      </div>
    </FormModal>
  );
};
