// src/components/forms/KitFormPage.tsx
import { useEffect, useState, useMemo } from 'react';
import { useForm, type SubmitHandler, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateSeoFilename } from '../../utils/seoUtils';
import { apiFetch } from '../../services/api';
import { formatPrice } from '../../utils/typeSafeFormatters';
import type { Kit, Equipment, Service, KitExperienceLevel } from '../../types/types';
import { ItemStatus } from '../../types/types';
import { BrandLoader } from '../ui/BrandLoader';
import {
  Form,
  FormSection,
  Input,
  Button,
  Alert,
  Textarea,
  Select
} from '../ui/StandardComponents';
import { Search, Plus, Trash2, ShoppingBag, Calculator, Package, User } from 'lucide-react';
import { ExperienceLevelsEditor } from '../kits/ExperienceLevelsEditor';

// Combined item type for UI
type SearchableItem = {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  type: 'EQUIPMENT' | 'SERVICE';
};

const kitItemSchema = z.object({
  id: z.string(),
  quantity: z.number().min(1, 'Quantidade mínima é 1'),
  type: z.enum(['EQUIPMENT', 'SERVICE']),
});

const kitFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  price: z.number().positive('Preço deve ser positivo'),
  items: z.array(kitItemSchema).min(1, 'Selecione pelo menos um item'),
  status: z.nativeEnum(ItemStatus),
  images: z.any(),
});

type KitFormData = z.infer<typeof kitFormSchema>;

interface KitFormProps {
  initialData?: Kit | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const KitForm: React.FC<KitFormProps> = ({ initialData, onSuccess, onCancel }) => {
  const isEditing = Boolean(initialData);

  const [allItems, setAllItems] = useState<SearchableItem[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [experienceLevels, setExperienceLevels] = useState<Partial<KitExperienceLevel>[]>(
    initialData?.experienceLevels || []
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<KitFormData>({
    resolver: zodResolver(kitFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      items: [],
      status: ItemStatus.ACTIVE,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // Watch for price calculations
  const watchedItems = watch('items');
  const kitPrice = watch('price');

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [equipData, serviceData] = await Promise.all([
          apiFetch('/equipments'),
          apiFetch('/services')
        ]);

        const equipments = (equipData as Equipment[]).map(e => ({
          id: e.id,
          name: e.name,
          price: e.pricePerHour || e.price || 0,
          description: e.description,
          imageUrl: e.imageUrl,
          type: 'EQUIPMENT' as const
        }));

        const services = (serviceData as Service[]).map(s => ({
          id: s.id,
          name: s.name,
          price: s.price,
          description: s.description,
          imageUrl: undefined,
          type: 'SERVICE' as const
        }));

        setAllItems([...equipments, ...services]);
        
        if (initialData) {
          // Map initial data to form structure
          let formItems: { id: string; quantity: number; type: 'EQUIPMENT' | 'SERVICE' }[] = [];
          
          if (initialData.items && initialData.items.length > 0) {
            formItems = initialData.items.map(item => ({
              id: item.equipmentId || item.serviceId || '',
              quantity: item.quantity,
              type: item.serviceId ? 'SERVICE' : 'EQUIPMENT'
            }));
          } else if (initialData.equipments && initialData.equipments.length > 0) {
            // Legacy fallback
            formItems = initialData.equipments.map(eq => ({
              id: eq.id,
              quantity: 1,
              type: 'EQUIPMENT'
            }));
          }

          reset({
            name: initialData.name,
            description: initialData.description || '',
            price: Number(initialData.price) || 0,
            items: formItems,
          });
        }
      } catch (err) {
        setServerError(
          err instanceof Error
            ? err.message
            : 'Falha ao carregar dados. Por favor, tente novamente.'
        );
      } finally {
        setPageLoading(false);
      }
    };
    fetchInitialData();
  }, [initialData, reset]);

  // Calculations
  const totalPriceOfItems = useMemo(() => {
    if (!watchedItems) return 0;
    return watchedItems.reduce((acc, item) => {
      const found = allItems.find(i => i.id === item.id && i.type === item.type);
      return acc + ((found?.price || 0) * item.quantity);
    }, 0);
  }, [watchedItems, allItems]);

  const discountStats = useMemo(() => {
    if (totalPriceOfItems === 0 || !kitPrice) return null;
    const diff = totalPriceOfItems - kitPrice;
    const percentage = (diff / totalPriceOfItems) * 100;
    return {
      amount: diff,
      percentage: percentage,
      isPositive: diff > 0
    };
  }, [totalPriceOfItems, kitPrice]);

  // Search Filter
  const filteredItems = useMemo(() => {
    if (!searchTerm) return [];
    const lower = searchTerm.toLowerCase();
    return allItems.filter(item => 
      !fields.some(f => f.id === item.id) && // Exclude already selected
      (item.name.toLowerCase().includes(lower) || 
       item.description?.toLowerCase().includes(lower))
    ).slice(0, 5); // Limit suggestions
  }, [searchTerm, allItems, fields]);

  const handleAddItem = (item: SearchableItem) => {
    append({ id: item.id, quantity: 1, type: item.type });
    setSearchTerm(''); // Clear search after adding
  };

  const onSubmit: SubmitHandler<KitFormData> = async (data) => {
    setServerError(null);
    const formData = new FormData();
    
    // SEO Filename
    const seoFilename = generateSeoFilename('kits', data.name);
    formData.append('fileName', seoFilename);

    formData.append('name', data.name);
    formData.append('description', data.description);
    formData.append('price', String(data.price));
    
    // Send items as JSON string with type info
    formData.append('items', JSON.stringify(data.items));
    
    // Send experience levels
    if (experienceLevels.length > 0) {
      formData.append('experienceLevels', JSON.stringify(experienceLevels));
    }

    if (data.images && data.images instanceof FileList && data.images.length > 0) {
      const file = data.images[0];
      if (file) {
        formData.append('image', file);
      }
    }

    try {
      if (isEditing && initialData) {
        await apiFetch(`/kits/${initialData.id}`, { method: 'PUT', body: formData });
      } else {
        await apiFetch('/kits', { method: 'POST', body: formData });
      }
      onSuccess();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Ocorreu um erro ao salvar o kit.');
    }
  };

  if (pageLoading) return <BrandLoader size={100} label="Carregando formulário..." />;

  return (
    <div className="space-y-6">
      {serverError && (
        <Alert 
          variant="error" 
          title="Erro" 
          description={serverError}
          onClose={() => setServerError(null)}
        />
      )}

      <Form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* === LEFT COLUMN / TOP SECTION === */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <FormSection title="Detalhes do Kit" description="Informações básicas">
              <Input
                label="Nome do Kit"
                {...register('name')}
                error={errors.name?.message}
                placeholder="Ex: Kit Festa Completa"
                required
              />
              <Textarea
                label="Descrição"
                {...register('description')}
                error={errors.description?.message}
                placeholder="Descreva o que compõe este kit..."
                rows={3}
                required
              />
            </FormSection>

            <div className="p-6 bg-card rounded-xl border shadow-sm space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  Composição do Kit
                </h3>
                <span className="text-sm text-muted-foreground">
                  {fields.length} itens adicionados
                </span>
              </div>

              {/* Search Area */}
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Busque equipamentos ou serviços..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                
                {/* Search Results Dropdown */}
                {searchTerm && filteredItems.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden">
                    {filteredItems.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleAddItem(item)}
                        className="w-full flex items-center justify-between p-3 hover:bg-muted text-left transition-colors"
                      >
                        <div className="flex items-center gap-3">
                           {item.type === 'EQUIPMENT' ? (
                             <Package className="w-4 h-4 text-blue-500" />
                           ) : (
                             <User className="w-4 h-4 text-purple-500" />
                           )}
                           <div>
                             <p className="font-medium text-sm">{item.name}</p>
                             <p className="text-xs text-muted-foreground">{formatPrice(item.price)}</p>
                           </div>
                        </div>
                        <Plus className="w-4 h-4 text-primary" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.items && (
                 <p className="text-sm text-destructive mt-2">{errors.items.message}</p>
              )}

              {/* Selected Items List */}
              <div className="space-y-3 mt-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {fields.map((field, index) => {
                  const item = allItems.find(i => i.id === field.id);
                  if (!item) return null;

                  return (
                    <div key={field.id} className="flex items-center gap-4 p-3 bg-card rounded-lg border shadow-sm group hover:border-primary/50 transition-all">
                      {/* Image Thumbnail or Icon */}
                      <div className="w-12 h-12 rounded bg-muted/30 border flex items-center justify-center overflow-hidden shrink-0">
                         {item.imageUrl ? (
                           <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                         ) : (
                           item.type === 'EQUIPMENT' ? (
                             <Package className="w-5 h-5 text-blue-500" />
                           ) : (
                             <User className="w-5 h-5 text-purple-500" />
                           )
                         )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                           <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${item.type === 'SERVICE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {item.type === 'SERVICE' ? 'Serviço' : 'Equip.'}
                           </span>
                           <p className="font-medium text-sm truncate">{item.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatPrice(item.price)} un.</p>
                      </div>

                      {/* Quantity Input */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">Qtd:</label>
                        <input
                          type="number"
                          min="1"
                          className="w-16 p-1 text-center text-sm border rounded bg-background"
                          {...register(`items.${index}.quantity`, { valueAsNumber: true, min: 1 })}
                        />
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                        title="Remover item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
                
                {fields.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p>Nenhum item adicionado ainda.</p>
                    <p className="text-xs">Use a busca acima para adicionar equipamentos ou serviços.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Níveis de Experiência */}
            <div className="p-6 bg-card rounded-xl border shadow-sm">
              <ExperienceLevelsEditor
                kitId={initialData?.id || 'new'}
                initialLevels={initialData?.experienceLevels}
                onChange={setExperienceLevels}
                basePrice={kitPrice || 0}
              />
            </div>
          </div>

          {/* === RIGHT COLUMN: PRICING & IMAGE === */}
          <div className="space-y-6">
              <div className="bg-card p-6 rounded-xl border shadow-sm">
                <h3 className="font-semibold mb-4">Publicação</h3>
                <Select
                  label="Status do Kit"
                  {...register('status')}
                  options={[
                    { value: ItemStatus.ACTIVE, label: 'Ativo' },
                    { value: ItemStatus.MAINTENANCE, label: 'Em Manutenção' },
                    { value: ItemStatus.COMING_SOON, label: 'Em Breve' },
                    { value: ItemStatus.INACTIVE, label: 'Inativo' },
                  ]}
                  error={errors.status?.message}
                />
              </div>

             <FormSection title="Imagem de Capa" description="">
                <Input
                  type="file"
                  label="Upload"
                  {...register('images')}
                  accept="image/*"
                  error={errors.images ? String(errors.images.message) : undefined}
                />
             </FormSection>

             <div className="bg-card p-6 rounded-xl border shadow-sm sticky top-6">
                <h3 className="font-semibold flex items-center gap-2 mb-6">
                  <Calculator className="w-5 h-5 text-primary" />
                  Precificação
                </h3>

                <div className="space-y-4">
                  {/* Auto-calc Total */}
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border">
                    <span className="text-sm text-muted-foreground">Soma dos Itens:</span>
                    <span className="font-mono font-medium">{formatPrice(totalPriceOfItems)}</span>
                  </div>

                  <Input
                     label="Preço do Kit (Final)"
                     type="number"
                     step="0.01"
                     {...register('price', { valueAsNumber: true })}
                     error={errors.price?.message}
                     placeholder="0.00"
                  />

                  {/* Discount Badge */}
                  {discountStats && (
                    <div className={`p-4 rounded-lg flex flex-col gap-1 border-l-4 ${discountStats.isPositive ? 'bg-green-500/10 border-green-500' : 'bg-red-500/10 border-red-500'}`}>
                      <span className={`text-xs font-bold uppercase tracking-wider ${discountStats.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {discountStats.isPositive ? 'Economia para o cliente' : 'Acréscimo'}
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">
                          {discountStats.percentage.toFixed(0)}%
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({formatPrice(Math.abs(discountStats.amount))} {discountStats.isPositive ? 'OFF' : 'extra'})
                        </span>
                      </div>
                    </div>
                  )}

                  <hr className="border-border my-4" />

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onCancel}
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      isLoading={isSubmitting}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      Salvar Kit
                    </Button>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </Form>
    </div>
  );
};

export default KitForm;
