// src/components/forms/KitFormPage.tsx (Updated: 2026-02-09)
import { useEffect, useState, useMemo } from 'react';
import { useForm, type SubmitHandler, useFieldArray } from 'react-hook-form';
import { clsx } from 'clsx';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateSeoFilename } from '../../utils/seoUtils';
import { apiFetch } from '../../services/api';
import { formatPrice } from '../../utils/typeSafeFormatters';
import type { Kit, Equipment, Service, KitExperienceLevel, Category } from '../../types/types';
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
  status?: string;
  category?: string;
};

const kitItemSchema = z.object({
  itemId: z.string(),
  quantity: z.number().min(1, 'Quantidade mínima é 1'),
  type: z.enum(['EQUIPMENT', 'SERVICE']),
});

type KitItemField = z.infer<typeof kitItemSchema> & { id: string };

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
          type: 'EQUIPMENT' as const,
          status: e.status,
          category: typeof e.category === 'object' ? (e.category as Category)?.name : e.category
        }));

        const services = (serviceData as Service[]).map(s => ({
          id: s.id,
          name: s.name,
          price: s.price,
          description: s.description,
          imageUrl: undefined,
          type: 'SERVICE' as const,
          status: s.status,
          category: 'Serviço'
        }));

        setAllItems([...equipments, ...services]);
        
        if (initialData) {
          // Map initial data to form structure
          let formItems: { itemId: string; quantity: number; type: 'EQUIPMENT' | 'SERVICE' }[] = [];
          
          if (initialData.items && initialData.items.length > 0) {
            formItems = initialData.items.map(item => ({
              itemId: item.equipmentId || item.serviceId || '',
              quantity: item.quantity,
              type: item.serviceId ? 'SERVICE' : 'EQUIPMENT'
            }));
          } else if (initialData.equipments && initialData.equipments.length > 0) {
            // Legacy fallback
            formItems = initialData.equipments.map(eq => ({
              itemId: eq.id,
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
      const found = allItems.find(i => i.id === item.itemId && i.type === item.type);
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
      !fields.some(f => (f as unknown as KitItemField).itemId === item.id) && // Exclude already selected
      (item.name.toLowerCase().includes(lower) || 
       item.description?.toLowerCase().includes(lower))
    ).slice(0, 5); // Limit suggestions
  }, [searchTerm, allItems, fields]);

  const handleAddItem = (item: SearchableItem) => {
    append({ itemId: item.id, quantity: 1, type: item.type });
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
    
    // Send items as JSON string with type info, converting back to 'id' for backend
    const mappedItems = data.items.map(item => ({
      id: item.itemId,
      quantity: item.quantity,
      type: item.type
    }));
    formData.append('items', JSON.stringify(mappedItems));
    
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Main Content: Details & Items */}
          <div className="xl:col-span-2 space-y-8">
            
            {/* 1. Basic Details Card */}
            <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-muted/30">
                <h3 className="font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Informações Básicas
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <Input
                  label="Nome do Kit"
                  {...register('name')}
                  error={errors.name?.message}
                  placeholder="Ex: Kit Festa Completa"
                  className="text-lg font-semibold"
                  required
                />
                <Textarea
                  label="Descrição Detalhada"
                  {...register('description')}
                  error={errors.description?.message}
                  placeholder="Descreva o que compõe este kit e seus benefícios..."
                  rows={3}
                  required
                />
              </div>
            </div>

            {/* 2. Composition Section */}
            <div className="bg-card border rounded-2xl shadow-sm overflow-visible relative">
              <div className="px-6 py-4 border-b bg-muted/30 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  Equipamentos & Serviços
                </h3>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {fields.length} itens
                </span>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Enhanced Search */}
                <div className="relative group">
                  <label 
                    htmlFor="item-search" 
                    className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block cursor-pointer"
                  >
                    Adicionar Itens
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      id="item-search"
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Busque por equipamentos ou serviços..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl border-2 bg-background focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm"
                    />
                  </div>
                  
                  {/* Results with better visual separation */}
                  {searchTerm && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-popover border-2 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      {filteredItems.length > 0 ? (
                        filteredItems.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleAddItem(item)}
                            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 text-left border-b last:border-0 transition-colors group/item"
                          >
                            <div className="flex items-center gap-4">
                               <div className={clsx(
                                 "w-12 h-12 rounded-lg flex items-center justify-center border shrink-0",
                                 item.type === 'EQUIPMENT' ? "bg-blue-50 border-blue-100" : "bg-slate-50 border-slate-100"
                               )}>
                                 {item.type === 'EQUIPMENT' ? (
                                   <Package className="w-6 h-6 text-blue-500" />
                                 ) : (
                                   <User className="w-6 h-6 text-slate-500" />
                                 )}
                               </div>
                               <div>
                                 <div className="flex items-center gap-2">
                                   <p className="font-bold text-foreground group-hover/item:text-primary transition-colors">{item.name}</p>
                                   <span className={clsx(
                                     "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                                     item.type === 'EQUIPMENT' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                                   )}>
                                     {item.type === 'EQUIPMENT' ? 'Equipamento' : 'Serviço'}
                                   </span>
                                 </div>
                                 <p className="text-sm text-muted-foreground line-clamp-1">{item.description || 'Sem descrição'}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-mono font-bold text-primary">{formatPrice(item.price)}</span>
                              <div className="p-1 rounded-md bg-primary/10 text-primary group-hover/item:bg-primary group-hover/item:text-white transition-all">
                                <Plus className="w-5 h-5" />
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-8 text-center text-muted-foreground">
                          Nenhum {searchTerm.length < 3 ? 'item' : 'resultado'} encontrado para "{searchTerm}"
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Grid of Selected Items */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(fields as unknown as KitItemField[]).map((field, index) => {
                    const item = allItems.find(i => i.id === field.itemId);
                    if (!item) return null;

                    return (
                      <div key={field.id} className="flex items-start gap-4 p-4 bg-muted/20 hover:bg-muted/40 rounded-2xl border-2 border-transparent hover:border-primary/20 transition-all group relative">
                        {/* Image/Icon */}
                        <div className="w-16 h-16 rounded-xl bg-card border shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              item.type === 'EQUIPMENT' ? <Package className="w-8 h-8 text-blue-400" /> : <User className="w-8 h-8 text-slate-400" />
                            )}
                         </div>
 
                         {/* Text Content */}
                         <div className="flex-1 min-w-0 pr-8">
                           <div className="flex items-center gap-1.5 mb-1">
                             <span className={clsx(
                               "w-2 h-2 rounded-full",
                               item.type === 'EQUIPMENT' ? "bg-blue-500" : "bg-slate-500"
                             )} />
                            <p className="font-bold text-sm truncate uppercase tracking-tight">{item.name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">{formatPrice(item.price)} / unidade</p>
                          
                          {/* Quantity Controls inside the card */}
                          <div className="flex items-center gap-3">
                            <label 
                              htmlFor={`quantity-${index}`}
                              className="text-[10px] font-bold uppercase text-muted-foreground cursor-pointer"
                            >
                              Quantidade
                            </label>
                            <div className="flex items-center border rounded-lg bg-card overflow-hidden">
                              <button 
                                type="button"
                                title="Diminuir quantidade"
                                onClick={() => {
                                  const currentVal = watch(`items.${index}.quantity`);
                                  if (currentVal > 1) {
                                    register(`items.${index}.quantity`).onChange({ target: { value: currentVal - 1, name: `items.${index}.quantity` } });
                                  }
                                }}
                                className="px-2 py-1 hover:bg-muted transition-colors border-r"
                              >-</button>
                              <input
                                id={`quantity-${index}`}
                                type="number"
                                min="1"
                                className="w-10 text-center text-sm font-bold bg-transparent no-spinners"
                                {...register(`items.${index}.quantity`, { valueAsNumber: true, min: 1 })}
                              />
                               <button 
                                type="button"
                                title="Aumentar quantidade"
                                onClick={() => {
                                  const currentVal = watch(`items.${index}.quantity`);
                                  register(`items.${index}.quantity`).onChange({ target: { value: currentVal + 1, name: `items.${index}.quantity` } });
                                }}
                                className="px-2 py-1 hover:bg-muted transition-colors border-l"
                              >+</button>
                            </div>
                          </div>
                        </div>

                        {/* Detach Action */}
                        <button
                          type="button"
                          title="Remover item do kit"
                          onClick={() => remove(index)}
                          className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  
                  {fields.length === 0 && (
                    <div className="md:col-span-2 text-center py-16 text-muted-foreground border-2 border-dashed rounded-3xl bg-muted/5">
                      <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-10" />
                      <p className="text-lg font-medium">Kit Vazio</p>
                      <p className="text-sm max-w-xs mx-auto">Use o campo de busca acima para incluir equipamentos e serviços na composição deste kit.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Experience Levels - Agora mais integrado */}
            <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6">
                <ExperienceLevelsEditor
                  kitId={initialData?.id || 'new'}
                  initialLevels={initialData?.experienceLevels}
                  onChange={setExperienceLevels}
                  basePrice={kitPrice || 0}
                />
              </div>
            </div>
          </div>

          {/* SIDEBAR: Actions, Pricing & Image */}
          <div className="xl:col-span-1 space-y-8">
            {/* Publication & Status */}
            <div className="bg-card p-5 rounded-2xl border shadow-sm space-y-5">
              <h3 className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Status & Visibilidade</h3>
              <Select
                label="Status Atual"
                {...register('status')}
                size="sm"
                options={[
                  { value: ItemStatus.ACTIVE, label: '🟢 Ativo' },
                  { value: ItemStatus.COMING_SOON, label: '🔵 Em Breve' },
                  { value: ItemStatus.MAINTENANCE, label: '🟠 Manutenção' },
                  { value: ItemStatus.INACTIVE, label: '🔴 Inativo' },
                ]}
                error={errors.status?.message}
              />
              
              <div className="pt-4 border-t">
                 <FormSection title="Imagem" description="Capa do kit" className="space-y-2">
                    <Input
                      type="file"
                      label=""
                      size="sm"
                      {...register('images')}
                      accept="image/*"
                      className="cursor-pointer"
                      error={errors.images ? String(errors.images.message) : undefined}
                    />
                 </FormSection>
                 {initialData?.imageUrl && (
                   <div className="mt-4 rounded-xl overflow-hidden border aspect-video">
                     <img src={initialData.imageUrl} alt="Atual" className="w-full h-full object-cover" />
                     <div className="p-2 bg-muted text-[10px] text-center font-bold">IMAGEM ATUAL</div>
                   </div>
                 )}
              </div>
            </div>

            {/* Pricing Card */}
            <div className="bg-primary/5 p-6 rounded-2xl border-2 border-primary/20 shadow-lg sticky top-6 space-y-6">
              <h3 className="font-bold flex items-center gap-2 text-primary tracking-tight text-lg">
                <Calculator className="w-5 h-5" />
                Precificação
              </h3>

              <div className="space-y-6">
                {/* Auto-calc Summary */}
                <div className="space-y-2">
                   <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-muted-foreground">Soma dos Itens Individuais:</span>
                      <span className="font-mono">{formatPrice(totalPriceOfItems)}</span>
                   </div>
                   <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary/40 animate-pulse w-full" />
                   </div>
                </div>

                <div className="space-y-1.5">
                  <label 
                    htmlFor="kit-price" 
                    className="text-xs font-bold text-foreground cursor-pointer"
                  >
                    Preço de Venda do Kit
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-primary">R$</span>
                    <input
                       id="kit-price"
                       type="number"
                       step="0.01"
                       {...register('price', { valueAsNumber: true })}
                       className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-primary bg-background text-xl font-bold focus:ring-4 focus:ring-primary/20 outline-none transition-all"
                       placeholder="0.00"
                    />
                  </div>
                  {errors.price && <p className="text-xs text-destructive font-semibold">{errors.price.message}</p>}
                </div>

                {/* Discount Strategy Visualization */}
                {discountStats && (
                  <div className={clsx(
                    "p-5 rounded-2xl border-2 flex flex-col gap-2 transition-all shadow-inner",
                    discountStats.isPositive ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"
                  )}>
                    <div className="flex justify-between items-center">
                      <span className={clsx(
                        "text-[10px] font-black uppercase tracking-widest",
                        discountStats.isPositive ? "text-green-600" : "text-orange-600"
                      )}>
                        {discountStats.isPositive ? 'Vantagem do Kit' : 'Markup do Kit'}
                      </span>
                      <div className={clsx(
                        "px-2 py-0.5 rounded text-xs font-bold",
                        discountStats.isPositive ? "bg-green-600 text-white" : "bg-orange-600 text-white"
                      )}>
                        {discountStats.isPositive ? 'ECONOMIA' : 'PLUS'}
                      </div>
                    </div>
                    
                    <div className="flex items-baseline gap-2">
                      <span className={clsx(
                        "text-3xl font-black",
                        discountStats.isPositive ? "text-green-700" : "text-orange-700"
                      )}>
                        {Math.abs(discountStats.percentage).toFixed(0)}%
                      </span>
                      <span className="text-sm text-muted-foreground font-medium">
                        ({formatPrice(Math.abs(discountStats.amount))} de diferença)
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-4">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full py-6 font-bold shadow-lg"
                    isLoading={isSubmitting}
                  >
                    Salvar Alterações
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={onCancel}
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    Descartar
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
