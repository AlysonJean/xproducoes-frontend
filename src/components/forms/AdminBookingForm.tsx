import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch } from '../../services/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Booking, Kit, Equipment } from '../../types/types';
import {
  Form,
  FormSection,
  FormActions,
  Input,
  Textarea,
  Select,
  Button,
  Alert,
} from '../ui/StandardComponents';
import { BrandLoader } from '../ui/BrandLoader';

const idSchema = z.union([
  z.string().uuid(),
  // prisma cuid-ish ids: alfanum, normalmente >=20 chars (cuid/varying lengths)
  z.string().regex(/^[a-z0-9]{20,}$/i),
]);

const bookingFormSchema = z
  .object({
    clientType: z.enum(['registered', 'manual']),
    clientId: idSchema,
    clientName: z.string(),
    clientContact: z.string(),
    clientEmail: z.string().email(),
    selectionType: z.enum(['kit', 'equipments']),
    kitId: idSchema,
    equipmentIds: z.array(idSchema),
    eventDate: z.string().min(1, 'Data do evento é obrigatória'),
    eventEndDate: z.string().min(1, 'Data final do evento é obrigatória'),
    location: z.string().min(1, 'Local é obrigatório'),
    street: z.string().min(1, 'Rua é obrigatória'),
    neighborhood: z.string().min(1, 'Bairro é obrigatório'),
    city: z.string().min(1, 'Cidade é obrigatória'),
    state: z.string().min(1, 'Estado é obrigatório'),
    zipCode: z.string().min(1, 'CEP é obrigatório'),
    addressNumber: z.string().min(1, 'Número é obrigatório'),
    addressComplement: z.string(),
    notes: z.string(),
    status: z.string(),
    deliveryStatus: z.string(),
    // Campos admin-only
    serviceValue: z.number().positive('Valor do serviço deve ser positivo'),
    paymentProof: z.unknown(), // FileList será tratado no submit
  })
  .refine(
    (d) =>
      d.clientType === 'registered'
        ? Boolean(d.clientId)
        : Boolean(d.clientName && d.clientContact),
    { message: 'Associe um cliente ou informe os dados manuais.', path: ['clientId'] }
  )
  .refine(
    (d) =>
      d.selectionType === 'kit'
        ? Boolean(d.kitId)
        : Boolean(d.equipmentIds && d.equipmentIds.length > 0),
    { message: 'Escolha um kit ou selecione equipamentos.', path: ['kitId'] }
  );

type BookingFormData = z.infer<typeof bookingFormSchema>;
type ClientForSelect = { id: string; name: string; email?: string; phone?: string };

interface ClientData {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  user?: { id?: string; name?: string; email?: string };
}
interface ClientResponse {
  data?: ClientData[];
}

interface RawBooking extends Omit<Booking, 'kits' | 'equipments'> {
  userId?: string;
  client?: { name?: string; phone?: string; email?: string };
  location?: string;
  venue?: { street?: string; neighborhood?: string; city?: string; state?: string; zipCode?: string; addressNumber?: string; addressComplement?: string };
  kits?: Array<{ id?: string; kitId?: string }>;
  equipments?: Array<{ id?: string; equipmentId?: string }>;
  serviceValue?: number;
}

interface AdminBookingFormProps {
  initialData?: Booking | null;
  defaultClientType?: 'registered' | 'manual';
  onSuccess: () => void;
  onCancel: () => void;
}

export const AdminBookingForm: React.FC<AdminBookingFormProps> = ({ initialData, defaultClientType = 'registered', onSuccess, onCancel }) => {
  const isEditing = Boolean(initialData);
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientForSelect[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [kitSearch, setKitSearch] = useState('');
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [equipSearch, setEquipSearch] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      clientType: defaultClientType,
      selectionType: 'kit',
      equipmentIds: [],
      status: 'PENDING',
      deliveryStatus: 'PENDING',
      serviceValue: undefined,
    },
  });

  const clientType = watch('clientType');
  const selectionType = watch('selectionType');

  useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoading(true);
        // clientes
        let clientsRes: ClientResponse | ClientData[] = { data: [] };
        try {
           clientsRes = await apiFetch<ClientResponse | ClientData[]>('/admin/clients');
        } catch (e) {
           console.warn("Could not load clients", e);
        }
        
        let list: ClientData[] = [];
        if (Array.isArray(clientsRes)) {
          list = clientsRes;
        } else if (clientsRes && 'data' in clientsRes && Array.isArray(clientsRes.data)) {
          list = clientsRes.data;
        }

        // Sort clients alphabetically
        list.sort((a, b) => {
          const nameA = a.user?.name || a.name || '';
          const nameB = b.user?.name || b.name || '';
          return nameA.localeCompare(nameB);
        });
        const mapped: ClientForSelect[] = list.map((c) => ({
          id: (c.id || c.user?.id) as string,
          name: c.user?.name || c.name || 'Cliente',
          email: c.user?.email || c.email,
          phone: c.phone,
        })).filter((c: ClientForSelect) => !!c.id);
        setClients(mapped);

        // kits e equipamentos
        const [kitsData, eqData] = await Promise.all([
          apiFetch<Kit[]>('/kits').catch(() => []),
          apiFetch<Equipment[]>('/equipments').catch(() => []),
        ]);
        setKits(Array.isArray(kitsData) ? kitsData : []);
        setEquipments(Array.isArray(eqData) ? eqData : []);

        if (initialData) {
          const booking = initialData as RawBooking;
          const manualClient = !booking.userId;
          const eventDate = (booking.eventDate as string) || '';
          const eventEndDate = (booking.eventEndDate as string) || eventDate;
          const location = booking.location || '';
          const address = booking.venue || (booking as unknown as { street?: string; neighborhood?: string; city?: string; state?: string; zipCode?: string; addressNumber?: string; addressComplement?: string });
          const extractedKitId = (Array.isArray(booking.kits) && booking.kits.length > 0)
            ? booking.kits[0]?.kitId || booking.kits[0]?.id
            : undefined;
          const extractedEquipmentIds = Array.isArray(booking.equipments)
            ? booking.equipments.map((e) => e.equipmentId || e.id).filter(Boolean) as string[]
            : [];
          reset({
            clientType: manualClient ? 'manual' : 'registered',
            clientId: booking.userId as string | undefined,
            clientName: booking?.client?.name,
            clientContact: booking?.client?.phone,
            clientEmail: booking?.client?.email,
            selectionType: extractedKitId ? 'kit' : 'equipments',
            kitId: extractedKitId as string | undefined,
            equipmentIds: extractedEquipmentIds,
            eventDate: eventDate ? eventDate.substring(0, 16) : '',
            eventEndDate: eventEndDate ? eventEndDate.substring(0, 16) : '',
            location: location,
            street: address.street || '',
            neighborhood: address.neighborhood || '',
            city: address.city || '',
            state: address.state || '',
            zipCode: address.zipCode || '',
            addressNumber: address.addressNumber || '',
            addressComplement: address.addressComplement || '',
            notes: (booking.notes as string) || '',
            status: (booking.status as string) || 'PENDING',
            deliveryStatus: (booking.deliveryStatus as string) || 'PENDING',
            serviceValue: booking.serviceValue || undefined,
          });
        }
      } catch (e: unknown) {
        setServerError(e instanceof Error ? e.message : 'Falha ao carregar dados do formulário');
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, [initialData, reset]);

  const onSubmit = async (data: BookingFormData) => {
    setServerError(null);
    try {
      setSaving(true);
      
      let paymentProofUrl: string | undefined;
      
      // Se for admin e há arquivo de comprovante, fazer upload primeiro
      if (isAdmin && data.paymentProof && (data.paymentProof as FileList).length > 0) {
        try {
          const formData = new FormData();
          formData.append('image', (data.paymentProof as FileList)[0]);
          formData.append('folder', 'payment-proofs');
          
          const uploadResponse = await apiFetch('/upload/image', {
            method: 'POST',
            body: formData,
          });
          
          paymentProofUrl = (uploadResponse as { imageUrl?: string })?.imageUrl;
        } catch (uploadError) {
          console.error('Erro no upload do comprovante:', uploadError);
          addNotification({ 
            type: 'error', 
            title: 'Erro no upload', 
            message: 'Falha ao fazer upload do comprovante. A reserva será criada sem o comprovante.' 
          });
        }
      }

      const payload: Record<string, unknown> = {
        clientId: data.clientType === 'registered' ? data.clientId : undefined,
        clientName: data.clientType === 'manual' ? data.clientName : undefined,
        clientContact: data.clientType === 'manual' ? data.clientContact : undefined,
        clientEmail: data.clientType === 'manual' ? data.clientEmail : undefined,
        kitId: data.selectionType === 'kit' ? data.kitId : undefined,
        equipmentIds: data.selectionType === 'equipments' ? data.equipmentIds : undefined,
        eventDate: data.eventDate,
        eventEndDate: data.eventEndDate,
        location: data.location,
        street: data.street,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        addressNumber: data.addressNumber,
        addressComplement: data.addressComplement,
        notes: data.notes,
        status: data.status,
        deliveryStatus: data.deliveryStatus,
      };

      // Adicionar campos admin se for admin
      if (isAdmin) {
        if (data.serviceValue) {
          payload.serviceValue = data.serviceValue;
        }
        if (paymentProofUrl) {
          payload.paymentProofUrl = paymentProofUrl;
        }
      }
      
      if (isEditing && initialData) {
        await apiFetch(`/bookings/${initialData.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        addNotification({ type: 'success', title: 'Reserva atualizada', message: 'As alterações foram salvas.' });
      } else {
        await apiFetch(`/bookings`, { method: 'POST', body: JSON.stringify(payload) });
        addNotification({ type: 'success', title: 'Reserva criada', message: 'Reserva criada com sucesso.' });
      }
      onSuccess();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao salvar reserva';
      setServerError(msg);
      addNotification({ type: 'error', title: 'Erro', message: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <BrandLoader size={100} label="Carregando formulário de reserva..." />;

  return (
    <div className="space-y-6">
      {serverError && (
        <Alert variant="error" title="Erro" description={serverError} onClose={() => setServerError(null)} />
      )}

      <Form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title="Cliente" description="Associe a reserva a um cliente">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Tipo de Cliente"
              value={clientType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setValue('clientType', e.target.value as 'registered' | 'manual')}
              options={[
                { value: 'registered', label: 'Registrado' },
                { value: 'manual', label: 'Manual' },
              ]}
            />
            {clientType === 'registered' ? (
              <Select
                label="Cliente"
                placeholder="Selecione um cliente"
                {...register('clientId')}
                error={errors.clientId?.message as string | undefined}
                options={clients.map((c) => ({
                  value: c.id,
                  label: `${c.name}${c.email ? ` (${c.email})` : ''}`,
                }))}
              />
            ) : (
              <>
                <Input label="Nome do Cliente" {...register('clientName')} error={errors.clientName?.message} />
                <Input label="Contacto" {...register('clientContact')} error={errors.clientContact?.message} />
                <Input label="Email" type="email" {...register('clientEmail')} error={errors.clientEmail?.message} />
              </>
            )}
          </div>
        </FormSection>

        <FormSection title="Itens" description="Selecione um kit ou equipamentos individuais">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Modo de seleção"
              value={selectionType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setValue('selectionType', e.target.value as 'kit' | 'equipments')}
              options={[
                { value: 'kit', label: 'Kit' },
                { value: 'equipments', label: 'Equipamentos' },
              ]}
            />
            {selectionType === 'kit' ? (
              <div className="space-y-2"> 
                <Input
                  label="Buscar Kit"
                  value={kitSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKitSearch(e.target.value)}
                  placeholder="Filtrar kits..."
                />
                <Select
                  label="Kit"
                  placeholder="Selecione um kit"
                  {...register('kitId')}
                  error={errors.kitId?.message as string | undefined}
                  options={kits
                    .filter(k => k.name.toLowerCase().includes(kitSearch.toLowerCase()))
                    .map((k) => ({ value: k.id, label: k.name }))
                  }
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Equipamentos</label>
                <Input
                  placeholder="Buscar equipamento..."
                  value={equipSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEquipSearch(e.target.value)}
                  className="mb-2"
                />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-56 overflow-auto p-3 border border-border rounded-lg bg-background">
                  {equipments
                    .filter(eq => eq.name.toLowerCase().includes(equipSearch.toLowerCase()))
                    .map((eq) => (
                    <label key={eq.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" value={eq.id} className="h-4 w-4" {...register('equipmentIds')} />
                      <span>{eq.name}</span>
                    </label>
                  ))}
                </div>
                {errors.equipmentIds && (
                  <p className="text-sm text-destructive">Selecione pelo menos um equipamento</p>
                )}
              </div>
            )}
          </div>
        </FormSection>

        <FormSection title="Datas do Evento" description="Defina o início e fim">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Início" type="datetime-local" {...register('eventDate')} error={errors.eventDate?.message} />
            <Input label="Término" type="datetime-local" {...register('eventEndDate')} error={errors.eventEndDate?.message} />
          </div>
        </FormSection>

        <FormSection title="Endereço" description="Local do evento/entrega">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Local" {...register('location')} error={errors.location?.message} />
            <Input label="Rua" {...register('street')} error={errors.street?.message} />
            <Input label="Bairro" {...register('neighborhood')} error={errors.neighborhood?.message} />
            <Input label="Cidade" {...register('city')} error={errors.city?.message} />
            <Input label="Estado" {...register('state')} error={errors.state?.message} />
            <Input label="CEP" {...register('zipCode')} error={errors.zipCode?.message} />
            <Input label="Número" {...register('addressNumber')} error={errors.addressNumber?.message} />
            <Input label="Complemento" {...register('addressComplement')} error={errors.addressComplement?.message} />
          </div>
        </FormSection>

        {isAdmin && (
          <FormSection title="Configurações Admin" description="Campos disponíveis apenas para administradores">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Valor do Serviço (R$)"
                type="number"
                step="0.01"
                {...register('serviceValue', { valueAsNumber: true })}
                error={errors.serviceValue?.message}
                placeholder="0.00"
                description="Valor total do serviço para esta reserva"
              />
              <Input
                type="file"
                label="Comprovante de Pagamento"
                {...register('paymentProof')}
                accept="image/*,.pdf"
                error={errors.paymentProof ? String(errors.paymentProof.message) : undefined}
                description="Anexe o comprovante de pagamento (imagem ou PDF)"
              />
            </div>
          </FormSection>
        )}

        <FormSection title="Outros" description="Notas e estados">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Textarea label="Observações" rows={3} {...register('notes')} />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Status"
                {...register('status')}
                options={[
                  { value: 'DRAFT', label: 'Rascunho' },
                  { value: 'PENDING', label: 'Pendente' },
                  { value: 'CONFIRMED', label: 'Confirmada' },
                  { value: 'IN_PROGRESS', label: 'Em Andamento' },
                  { value: 'COMPLETED', label: 'Concluída' },
                  { value: 'CANCELLED', label: 'Cancelada' },
                ]}
              />
              <Select
                label="Entrega"
                {...register('deliveryStatus')}
                options={[
                  { value: 'PENDING', label: 'Pendente' },
                  { value: 'PREPARING', label: 'Preparando' },
                  { value: 'ON_THE_WAY', label: 'A caminho' },
                  { value: 'ARRIVED', label: 'Chegou' },
                  { value: 'SETUP_COMPLETE', label: 'Montagem concluída' },
                  { value: 'PICKUP_PENDING', label: 'Aguardando recolha' },
                  { value: 'COMPLETED', label: 'Concluída' },
                ]}
              />
            </div>
          </div>
        </FormSection>

        <FormActions>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button type="submit" isLoading={saving} disabled={saving}>{isEditing ? 'Salvar alterações' : 'Criar reserva'}</Button>
        </FormActions>
      </Form>
    </div>
  );
}
