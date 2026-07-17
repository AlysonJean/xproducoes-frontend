import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { couponService, Coupon } from '../../services/couponService';
import { useNotifications } from '../../contexts/NotificationContext';
import {
  Form,
  FormSection,
  FormActions,
  Input,
  Select,
  Checkbox,
  Button,
} from '../ui/StandardComponents';
import { BrandLoader } from '../ui/BrandLoader';
import { logger } from '../../utils/logger';
import { useFormDraft } from '../../hooks/useFormDraft';
import { DraftRestoreBanner } from '../ui/DraftRestoreBanner';

const couponSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  description: z.string().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.coerce.number().positive('O valor do desconto deve ser positivo'),
  minOrderValue: z.coerce.number().nonnegative().optional().or(z.literal('')),
  maxDiscountAmount: z.coerce.number().nonnegative().optional().or(z.literal('')),
  maxUses: z.coerce.number().int().positive().optional().or(z.literal('')),
  maxUsesPerClient: z.coerce.number().int().positive().optional().or(z.literal('')),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  active: z.boolean(),
});

type CouponFormInput = z.input<typeof couponSchema>;
type CouponFormData = z.output<typeof couponSchema>;

interface CouponFormProps {
  initialData?: Coupon | null;
  onSuccess: () => void;
  onCancel: () => void;
  /** Notifica o formulário pai sobre alterações não salvas, para a trava de fechamento
   * acidental (ver useUnsavedChangesGuard, usado em CouponManagementPage). */
  onDirtyChange?: (dirty: boolean) => void;
}

function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

export const CouponForm: React.FC<CouponFormProps> = ({ initialData, onSuccess, onCancel, onDirtyChange }) => {
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const isEditing = Boolean(initialData?.id);

  const draftKey = `xp-draft-coupon-${initialData?.id || 'new'}`;
  const { save: saveDraft, load: loadDraft, clear: clearDraft } = useFormDraft<CouponFormInput>(draftKey);
  const [draftPrompt, setDraftPrompt] = useState<{ values: CouponFormInput; savedAt: number } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<CouponFormInput, unknown, CouponFormData>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: '',
      description: '',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      active: true,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        code: initialData.code,
        description: initialData.description || '',
        discountType: initialData.discountType,
        discountValue: initialData.discountValue,
        minOrderValue: initialData.minOrderValue ?? '',
        maxDiscountAmount: initialData.maxDiscountAmount ?? '',
        maxUses: initialData.maxUses ?? '',
        maxUsesPerClient: initialData.maxUsesPerClient ?? '',
        validFrom: toDateInputValue(initialData.validFrom),
        validUntil: toDateInputValue(initialData.validUntil),
        active: initialData.active,
      });
    } else {
      reset({ code: '', description: '', discountType: 'PERCENTAGE', discountValue: 10, active: true });
    }

    const draft = loadDraft();
    if (draft) setDraftPrompt(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, reset]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const watchedValues = watch();
  useEffect(() => {
    if (!isDirty) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveDraft(watchedValues), 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watchedValues), isDirty]);

  const handleRestoreDraft = () => {
    if (!draftPrompt) return;
    reset(draftPrompt.values);
    setDraftPrompt(null);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setDraftPrompt(null);
  };

  const onSubmit = async (data: CouponFormData) => {
    try {
      setLoading(true);
      const payload = {
        ...data,
        minOrderValue: data.minOrderValue === '' ? undefined : Number(data.minOrderValue),
        maxDiscountAmount: data.maxDiscountAmount === '' ? undefined : Number(data.maxDiscountAmount),
        maxUses: data.maxUses === '' ? undefined : Number(data.maxUses),
        maxUsesPerClient: data.maxUsesPerClient === '' ? undefined : Number(data.maxUsesPerClient),
        validFrom: data.validFrom || undefined,
        validUntil: data.validUntil || undefined,
      };

      if (isEditing && initialData?.id) {
        await couponService.update(initialData.id, payload);
        addNotification({ type: 'success', title: 'Sucesso', message: 'Cupom atualizado.' });
      } else {
        await couponService.create(payload);
        addNotification({ type: 'success', title: 'Sucesso', message: 'Cupom criado.' });
      }
      clearDraft();
      onSuccess();
    } catch (error) {
      logger.error('Erro', 'CouponForm', error);
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Falha ao salvar cupom.';
      addNotification({ type: 'error', title: 'Erro', message: msg });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <BrandLoader size={80} label="Salvando..." />;

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {draftPrompt && (
        <DraftRestoreBanner
          savedAt={draftPrompt.savedAt}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      )}
      <FormSection title="Identificação" description="Código que o cliente vai digitar no orçamento">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Código *"
            placeholder="Ex: BEMVINDO10"
            className="uppercase"
            {...register('code')}
            error={errors.code?.message}
          />
          <Input
            label="Descrição (uso interno)"
            placeholder="Ex: Campanha de boas-vindas"
            {...register('description')}
            error={errors.description?.message}
          />
        </div>
      </FormSection>

      <FormSection title="Desconto" description="Tipo e valor do desconto aplicado">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Tipo *"
            options={[
              { value: 'PERCENTAGE', label: 'Percentual (%)' },
              { value: 'FIXED', label: 'Valor fixo (R$)' },
            ]}
            {...register('discountType')}
            error={errors.discountType?.message}
          />
          <Input
            type="number"
            step="0.01"
            label="Valor *"
            {...register('discountValue')}
            error={errors.discountValue?.message}
          />
          <Input
            type="number"
            step="0.01"
            label="Teto de desconto (R$, opcional)"
            placeholder="Ex: 50"
            {...register('maxDiscountAmount')}
            error={errors.maxDiscountAmount?.message}
          />
        </div>
      </FormSection>

      <FormSection title="Regras de Uso" description="Limites de validade e uso (deixe em branco para ilimitado)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            type="number"
            step="0.01"
            label="Pedido mínimo (R$)"
            {...register('minOrderValue')}
            error={errors.minOrderValue?.message}
          />
          <Input
            type="number"
            label="Limite total de usos"
            {...register('maxUses')}
            error={errors.maxUses?.message}
          />
          <Input
            type="number"
            label="Limite de usos por cliente"
            {...register('maxUsesPerClient')}
            error={errors.maxUsesPerClient?.message}
          />
          <div />
          <Input
            type="date"
            label="Válido a partir de"
            {...register('validFrom')}
            error={errors.validFrom?.message}
          />
          <Input
            type="date"
            label="Válido até"
            {...register('validUntil')}
            error={errors.validUntil?.message}
          />
        </div>
        <div className="pt-4">
          <Checkbox label="Cupom ativo" {...register('active')} />
        </div>
      </FormSection>

      <FormActions>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary">
          {isEditing ? 'Salvar Alterações' : 'Criar Cupom'}
        </Button>
      </FormActions>
    </Form>
  );
};
