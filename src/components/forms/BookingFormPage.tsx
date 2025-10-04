import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import LoadingSpinner from '../ui/LoadingSpinner';

const idSchema = z.union([
  z.string().uuid(),
  // prisma cuid-ish ids: alfanum, normalmente >=20 chars (cuid/varying lengths)
  z.string().regex(/^[a-z0-9]{20,}$/i),
]);

const bookingFormSchema = z
  .object({
    clientType: z.enum(['registered', 'manual']).default('registered'),
    clientId: idSchema.optional(),
    clientName: z.string().optional(),
    clientContact: z.string().optional(),
    clientEmail: z.string().email().optional(),
    selectionType: z.enum(['kit', 'equipments']).default('kit'),
    kitId: idSchema.optional(),
    equipmentIds: z.array(idSchema).optional(),
    eventDate: z.string().min(1, 'Data do evento é obrigatória'),
    eventEndDate: z.string().min(1, 'Data final do evento é obrigatória'),
    location: z.string().min(1, 'Local é obrigatório'),
    street: z.string().min(1, 'Rua é obrigatória'),
    neighborhood: z.string().min(1, 'Bairro é obrigatório'),
    city: z.string().min(1, 'Cidade é obrigatória'),
    state: z.string().min(1, 'Estado é obrigatório'),
    zipCode: z.string().min(1, 'CEP é obrigatório'),
    addressNumber: z.string().min(1, 'Número é obrigatório'),
    addressComplement: z.string().optional(),
    notes: z.string().optional(),
    status: z.string().optional(),
    deliveryStatus: z.string().optional(),
    // Campos admin-only
    serviceValue: z.number().positive('Valor do serviço deve ser positivo').optional(),
    paymentProof: z.any().optional(), // FileList será tratado no submit
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

export default function BookingFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientForSelect[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);

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
      clientType: 'registered',
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
  const clientsRes = await apiFetch<any>('/api/admin/clients');
        const list = Array.isArray(clientsRes?.data) ? clientsRes.data : (Array.isArray(clientsRes) ? clientsRes : []);
        const mapped: ClientForSelect[] = list.map((c: any) => ({
          id: c.id || c.user?.id,
          name: c.user?.name || c.name || 'Cliente',
          email: c.user?.email || c.email,
          phone: c.phone,
        })).filter((c: ClientForSelect) => !!c.id);
        setClients(mapped);

        // kits e equipamentos
        const [kitsData, eqData] = await Promise.all([
          apiFetch<Kit[]>('/api/kits'),
          apiFetch<Equipment[]>('/api/equipments'),
        ]);
        setKits(Array.isArray(kitsData) ? kitsData : []);
        setEquipments(Array.isArray(eqData) ? eqData : []);

        if (isEditing && id) {
          const booking = await apiFetch<Booking>(`/api/bookings/${id}`);
          const manualClient = !(booking as any).userId;
          const eventDate = (booking.eventDate as string) || '';
          const eventEndDate = (booking.eventEndDate as string) || eventDate;
          const location = (booking as any).location || '';
          const address = (booking as any);
          const extractedKitId = (Array.isArray(booking.kits)
            ? (booking.kits as any[])[0]?.kitId || (booking.kits as any[])[0]?.id
            : undefined) as string | undefined;
          const extractedEquipmentIds = Array.isArray(booking.equipments)
            ? (booking.equipments as any[]).map((e) => e.equipmentId || e.id).filter(Boolean)
            : [];
          reset({
            clientType: manualClient ? 'manual' : 'registered',
            clientId: (booking as any).userId as string | undefined,
            clientName: (booking as any)?.client?.name,
            clientContact: (booking as any)?.client?.phone,
            clientEmail: (booking as any)?.client?.email,
            selectionType: extractedKitId ? 'kit' : 'equipments',
            kitId: extractedKitId,
            equipmentIds: extractedEquipmentIds,
            eventDate: eventDate ? eventDate.substring(0, 16) : '',
            eventEndDate: eventEndDate ? eventEndDate.substring(0, 16) : '',
            location: location,
            street: (address as any).street || (booking as any)?.venue?.street || '',
            neighborhood: (address as any).neighborhood || '',
            city: (address as any).city || (booking as any)?.venue?.city || '',
            state: (address as any).state || (booking as any)?.venue?.state || '',
            zipCode: (address as any).zipCode || (booking as any)?.venue?.zipCode || '',
            addressNumber: (address as any).addressNumber || '',
            addressComplement: (address as any).addressComplement || '',
            notes: (booking.notes as string) || '',
            status: (booking.status as string) || 'PENDING',
            deliveryStatus: (booking.deliveryStatus as string) || 'PENDING',
            serviceValue: (booking as any).serviceValue || undefined,
          });
        }
      } catch (e: any) {
        setServerError(e?.message || 'Falha ao carregar dados do formulário');
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, [id, isEditing, reset]);

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
          
          const uploadResponse = await apiFetch('/api/upload/image', {
            method: 'POST',
            body: formData,
          });
          
          paymentProofUrl = (uploadResponse as any)?.imageUrl;
        } catch (uploadError) {
          console.error('Erro no upload do comprovante:', uploadError);
          addNotification({ 
            type: 'error', 
            title: 'Erro no upload', 
            message: 'Falha ao fazer upload do comprovante. A reserva será criada sem o comprovante.' 
          });
        }
      }

      const payload: Record<string, any> = {
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
      
      if (isEditing && id) {
  await apiFetch(`/api/bookings/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        addNotification({ type: 'success', title: 'Reserva atualizada', message: 'As alterações foram salvas.' });
        navigate(`/admin/bookings/${id}`);
      } else {
        const created = await apiFetch<any>(`/bookings`, { method: 'POST', body: JSON.stringify(payload) });
        addNotification({ type: 'success', title: 'Reserva criada', message: 'Reserva criada com sucesso.' });
        const newId = (created as any)?.data?.id || (created as any)?.id;
        navigate(newId ? `/admin/bookings/${newId}` : '/admin/bookings');
      }
    } catch (e: any) {
      setServerError(e?.message || 'Falha ao salvar reserva');
      addNotification({ type: 'error', title: 'Erro', message: e?.message || 'Não foi possível salvar.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner label="A carregar formulário de reserva..." />;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">{isEditing ? 'Editar Reserva' : 'Nova Reserva'}</h1>
        <p className="text-muted-foreground">{isEditing ? 'Atualize as informações da reserva' : 'Cadastre uma nova reserva'}</p>
      </div>

      {serverError && (
        <Alert variant="error" title="Erro" description={serverError} onClose={() => setServerError(null)} />
      )}

      <Form onSubmit={handleSubmit(onSubmit)} className="bg-card border border-border rounded-xl p-8 shadow-sm">
        <FormSection title="Cliente" description="Associe a reserva a um cliente">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Tipo de Cliente"
              value={clientType}
              onChange={(e: any) => setValue('clientType', e.target.value)}
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
              onChange={(e: any) => setValue('selectionType', e.target.value)}
              options={[
                { value: 'kit', label: 'Kit' },
                { value: 'equipments', label: 'Equipamentos' },
              ]}
            />
            {selectionType === 'kit' ? (
              <Select
                label="Kit"
                placeholder="Selecione um kit"
                {...register('kitId')}
                error={errors.kitId?.message as string | undefined}
                options={kits.map((k) => ({ value: k.id, label: k.name }))}
              />
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Equipamentos</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-56 overflow-auto p-3 border border-border rounded-lg bg-background">
                  {equipments.map((eq) => (
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
          <Button type="button" variant="outline" onClick={() => navigate('/admin/bookings')} disabled={saving}>Cancelar</Button>
          <Button type="submit" isLoading={saving} disabled={saving}>{isEditing ? 'Salvar alterações' : 'Criar reserva'}</Button>
        </FormActions>
      </Form>
    </div>
  );
}
