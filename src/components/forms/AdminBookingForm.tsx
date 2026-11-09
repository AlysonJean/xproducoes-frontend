import { useEffect, useRef, useState } from 'react';
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
  Checkbox,
} from '../ui/StandardComponents';
import { BOOKING_STATUS_OPTIONS, DELIVERY_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS } from '../../utils/bookingStatus';
import { BrandLoader } from '../ui/BrandLoader';
import { logger } from '../../utils/logger';
import { useFormDraft } from '../../hooks/useFormDraft';
import { DraftRestoreBanner } from '../ui/DraftRestoreBanner';
import { NotifyClientCheckbox } from '../bookings/NotifyClientCheckbox';
import { notifyClientPayload } from '../../utils/notifyClient';
import { useEquipmentPriceUnit } from '../../hooks/usePricingRules';
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_RULE_TEXT,
  attachmentFileProblem,
  attachmentUploadErrorMessage,
  uploadBookingAttachment,
} from '../../utils/bookingAttachments';

const idSchema = z.union([
  z.string().uuid(),
  // prisma cuid-ish ids: alfanum, normalmente >=20 chars (cuid/varying lengths)
  z.string().regex(/^[a-z0-9]{20,}$/i),
]);

// Achado (auditoria ponta a ponta): a edição cortava o ISO do backend (UTC) e mostrava 21:00 para um
// evento das 18:00, e o envio mandava o horário sem fuso, que o servidor (UTC) gravava 3 h antes. O
// campo mostra o horário local e o envio volta para ISO, como na Proposta Rápida e no modal da agenda.
const toLocalInput = (iso: string): string => {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Achado (auditoria ponta a ponta): os campos dos dois modos eram todos obrigatórios — clientId com
// cliente manual, nome/contato/e-mail com cliente cadastrado, kitId com equipamentos avulsos. O campo
// do outro modo nem aparece na tela: o erro ficava invisível e "Criar reserva" não fazia nada. O
// e-mail do cliente manual, opcional na Proposta Rápida, também barrava quem não tinha. Cada modo
// confere os próprios campos nas validações do fim do schema ('' = select sem nada escolhido).
// Na edição, o cliente cadastrado e os itens aparecem só para leitura (ver o formulário): a escolha
// deles só é conferida na criação.
const bookingFormSchema = (isEditing: boolean) => z
  .object({
    clientType: z.enum(['registered', 'manual']),
    clientId: idSchema.optional().or(z.literal('')),
    clientName: z.string().optional(),
    clientContact: z.string().optional(),
    clientEmail: z.string().email().optional().or(z.literal('')),
    selectionType: z.enum(['kit', 'equipments']),
    kitId: idSchema.optional().or(z.literal('')),
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
    // Campos admin-only. D8a (aprovada em 02/11/2026): um valor final só, opcional. Em branco, o servidor
    // calcula pelos itens, com as horas tiradas das datas. Antes era o "Valor do Serviço", obrigatório e
    // gravado à parte do total (e a página do cliente somava os dois).
    finalValue: z.number().positive('O valor final deve ser maior que zero.').optional(),
    paymentProof: z.unknown(), // FileList será tratado no submit
    paymentStatus: z.string(), // '' = não informado
  })
  // O erro vai para o campo do modo escolhido: com cliente manual, `clientId` não está na tela.
  .superRefine((d, ctx) => {
    if (d.clientType === 'registered') {
      if (!isEditing && !d.clientId) ctx.addIssue({ code: 'custom', path: ['clientId'], message: 'Selecione um cliente.' });
      return;
    }
    if (!d.clientName?.trim()) ctx.addIssue({ code: 'custom', path: ['clientName'], message: 'Informe o nome do cliente.' });
    if (!d.clientContact?.trim()) ctx.addIssue({ code: 'custom', path: ['clientContact'], message: 'Informe o contato do cliente.' });
  })
  .refine(
    (d) =>
      isEditing ||
      (d.selectionType === 'kit'
        ? Boolean(d.kitId)
        : Boolean(d.equipmentIds && d.equipmentIds.length > 0)),
    { message: 'Escolha um kit ou selecione equipamentos.', path: ['kitId'] }
  );
const createSchema = bookingFormSchema(false);
const editSchema = bookingFormSchema(true);

type BookingFormData = z.infer<typeof createSchema>;
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

// Reserva como a API devolve: cliente cadastrado em clientId/client (nome em client.user, ou em
// client.name como a lista de Reservas monta), contato do cliente digitado na própria reserva
// (clientName/clientContact/clientEmail), kit em `kit`, equipamentos e serviços em listas.
interface RawBooking extends Omit<Booking, 'kits' | 'equipments'> {
  clientId?: string | null;
  client?: { name?: string; user?: { name?: string } };
  clientName?: string | null;
  clientContact?: string | null;
  clientEmail?: string | null;
  location?: string;
  venue?: { street?: string; neighborhood?: string; city?: string; state?: string; zipCode?: string; addressNumber?: string; addressComplement?: string };
  equipments?: Array<{ name?: string }>;
  services?: Array<{ name?: string }>;
}

// Na edição: o tipo de cliente é o da reserva, e os itens dela aparecem só para leitura.
const editClientTypeOf = (booking: RawBooking): 'registered' | 'manual' =>
  booking.clientId ? 'registered' : 'manual';
const itemNamesOf = (booking: RawBooking): string[] =>
  [booking.kit?.name, ...(booking.equipments ?? []).map((e) => e.name), ...(booking.services ?? []).map((s) => s.name)]
    .filter((name): name is string => Boolean(name));

interface AdminBookingFormProps {
  initialData?: Booking | null;
  defaultClientType?: 'registered' | 'manual';
  onSuccess: () => void;
  onCancel: () => void;
  /** Notifica o formulário pai sobre alterações não salvas, para a trava de fechamento
   * acidental (ver useUnsavedChangesGuard, usado em AdminBookingsPage). */
  onDirtyChange?: (dirty: boolean) => void;
}

export const AdminBookingForm: React.FC<AdminBookingFormProps> = ({ initialData, defaultClientType = 'registered', onSuccess, onCancel, onDirtyChange }) => {
  const isEditing = Boolean(initialData);
  const editedBooking = (initialData ?? null) as RawBooking | null;
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
  // D11 (aprovada em 02/11/2026): reserva criada já Confirmada avisa o cliente uma vez, com "Avisar o cliente por
  // e-mail" marcada por padrão. Fora do rascunho do formulário: a escolha vale para este envio.
  const [notifyClient, setNotifyClient] = useState(true);

  const draftKey = `xp-draft-admin-booking-${initialData?.id || 'new'}`;
  const { save: saveDraft, load: loadDraft, clear: clearDraft } = useFormDraft<Omit<BookingFormData, 'paymentProof'>>(draftKey);
  const [draftPrompt, setDraftPrompt] = useState<{ values: Omit<BookingFormData, 'paymentProof'>; savedAt: number } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<BookingFormData>({
    resolver: zodResolver(isEditing ? editSchema : createSchema),
    defaultValues: {
      clientType: defaultClientType,
      // Achado (auditoria ponta a ponta): sem valor inicial, o select abria no primeiro cliente/kit
      // da lista (o placeholder é desabilitado) e a reserva ia para esse cliente sem ninguém
      // escolher. '' deixa o select no placeholder e a validação pede a escolha.
      clientId: '',
      kitId: '',
      selectionType: 'kit',
      equipmentIds: [],
      status: 'PENDING',
      deliveryStatus: 'PENDING',
      finalValue: undefined,
      paymentStatus: '',
    },
  });

  const clientType = watch('clientType');
  const selectionType = watch('selectionType');

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const watchedValues = watch();
  useEffect(() => {
    if (!isDirty) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const { paymentProof: _paymentProof, ...draftable } = watchedValues;
      void _paymentProof;
      saveDraft(draftable);
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watchedValues), isDirty]);

  const handleRestoreDraft = () => {
    if (!draftPrompt) return;
    // Na edição o tipo de cliente é o da reserva (o seletor não aparece), mesmo com rascunho da
    // versão anterior do formulário, que deixava trocar.
    // D8a: o rascunho salvo pela versão anterior do formulário guarda o "Valor do Serviço" (serviceValue);
    // ele volta no "Valor final", para não perder o que foi digitado.
    const { serviceValue: legacyValue, ...saved } = draftPrompt.values as typeof draftPrompt.values & { serviceValue?: number | null };
    const values = saved.finalValue === undefined && legacyValue ? { ...saved, finalValue: legacyValue } : saved;
    reset(editedBooking ? { ...values, clientType: editClientTypeOf(editedBooking) } : values);
    setDraftPrompt(null);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setDraftPrompt(null);
  };

  useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoading(true);
        // clientes
        let clientsRes: ClientResponse | ClientData[] = { data: [] };
        try {
           clientsRes = await apiFetch<ClientResponse | ClientData[]>('/admin/clients');
        } catch (e) {
           logger.warn("Could not load clients", 'AdminBookingForm', e);
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
          const eventDate = (booking.eventDate as string) || '';
          const eventEndDate = (booking.eventEndDate as string) || eventDate;
          const location = booking.location || '';
          const address = booking.venue || (booking as unknown as { street?: string; neighborhood?: string; city?: string; state?: string; zipCode?: string; addressNumber?: string; addressComplement?: string });
          // Achado (auditoria ponta a ponta): o tipo de cliente saía de `userId`, que a reserva não
          // tem (é clientId), e a edição abria sempre no modo "Manual", com nome e contato lidos do
          // cadastro (`client`): vazios na reserva de cliente digitado, que guarda o contato nela
          // mesma. Para salvar era preciso redigitar, e o servidor não gravava o que se digitava.
          // Agora o cliente digitado abre com o contato da reserva (e o servidor grava); o cadastrado
          // aparece só para leitura, sem campos. Kit e equipamentos também (ver a seção Itens).
          const typed = editClientTypeOf(booking) === 'manual';
          reset({
            clientType: typed ? 'manual' : 'registered',
            clientId: '',
            clientName: typed ? booking.clientName || '' : '',
            clientContact: typed ? booking.clientContact || '' : '',
            clientEmail: typed ? booking.clientEmail || '' : '',
            selectionType: 'kit',
            kitId: '',
            equipmentIds: [],
            eventDate: toLocalInput(eventDate),
            eventEndDate: toLocalInput(eventEndDate),
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
            finalValue: Number(booking.totalPrice) || undefined,
            paymentStatus: booking.paymentStatus || '',
          });
        }

        const draft = loadDraft();
        if (draft) setDraftPrompt(draft);
      } catch (e: unknown) {
        setServerError(e instanceof Error ? e.message : 'Falha ao carregar dados do formulário');
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
    // Achado (revisão da auditoria): dependia do OBJETO initialData — quem passava `{ ...booking }` inline
    // criava um objeto novo a cada render, e o primeiro onDirtyChange (1ª tecla) re-renderizava o pai,
    // recarregava tudo e fazia reset(): o que a pessoa digitava sumia (lista de Reservas e ficha).
    // Recarrega só quando muda a RESERVA editada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id, reset]);

  const onSubmit = async (data: BookingFormData) => {
    setServerError(null);
    // D21 (aprovada em 02/11/2026): o comprovante vira anexo privado da reserva, enviado depois que ela é salva
    // (antes subia por /upload/image, público e com link eterno, e o PDF era recusado sem aviso). Tipo e tamanho
    // são conferidos antes de salvar, para não criar a reserva e só então recusar o arquivo.
    const proofFile = isAdmin ? ((data.paymentProof as FileList | undefined)?.[0] ?? null) : null;
    const proofProblem = proofFile ? attachmentFileProblem(proofFile) : null;
    if (proofProblem) {
      setServerError(`Comprovante de pagamento: ${proofProblem}`);
      return;
    }
    try {
      setSaving(true);

      // Na edição não vão cliente cadastrado, kit, equipamentos nem status: nada disso muda por aqui
      // (o servidor não grava), e o formulário não os oferece.
      const payload: Record<string, unknown> = {
        clientId: !isEditing && data.clientType === 'registered' ? data.clientId : undefined,
        clientName: data.clientType === 'manual' ? data.clientName : undefined,
        clientContact: data.clientType === 'manual' ? data.clientContact : undefined,
        // E-mail em branco fica fora do corpo ('' o backend recusa, como na Proposta Rápida). Na
        // edição, apagar o e-mail que a reserva tinha manda null, que o tira da reserva; reserva sem
        // e-mail segue sem o campo no corpo (o backend anterior a este lote recusa null).
        clientEmail: data.clientType === 'manual' ? data.clientEmail || (editedBooking?.clientEmail ? null : undefined) : undefined,
        kitId: !isEditing && data.selectionType === 'kit' ? data.kitId : undefined,
        equipmentIds: !isEditing && data.selectionType === 'equipments' ? data.equipmentIds : undefined,
        // Horário local digitado → ISO (ver toLocalInput).
        eventDate: new Date(data.eventDate).toISOString(),
        eventEndDate: new Date(data.eventEndDate).toISOString(),
        location: data.location,
        street: data.street,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        addressNumber: data.addressNumber,
        addressComplement: data.addressComplement,
        notes: data.notes,
        status: isEditing ? undefined : data.status,
        deliveryStatus: data.deliveryStatus,
      };

      // Adicionar campos admin se for admin
      if (isAdmin) {
        // D8a: o valor final vai como totalPrice; em branco, o servidor calcula pelos itens (na edição, o
        // total atual fica como está).
        if (data.finalValue) {
          payload.totalPrice = data.finalValue;
        }
        // Na edição, "Não informado" limpa (null); na criação, só manda se escolhido.
        if (data.paymentStatus || isEditing) {
          payload.paymentStatus = data.paymentStatus || null;
        }
      }
      
      if (!isEditing && data.status === 'CONFIRMED') Object.assign(payload, notifyClientPayload(notifyClient));

      let savedId: string | undefined;
      if (isEditing && initialData) {
        await apiFetch(`/bookings/${initialData.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        savedId = initialData.id;
        addNotification({ type: 'success', title: 'Reserva atualizada', message: 'As alterações foram salvas.' });
      } else {
        const created = await apiFetch<{ id?: string }>(`/bookings`, { method: 'POST', body: JSON.stringify(payload) });
        savedId = created?.id;
        addNotification({ type: 'success', title: 'Reserva criada', message: 'Reserva criada com sucesso.' });
      }

      // A reserva já foi salva: se o comprovante falhar, ela fica como está e o aviso diz onde anexar de novo.
      if (proofFile && savedId) {
        try {
          await uploadBookingAttachment(savedId, proofFile);
        } catch (uploadError) {
          logger.error('Erro no envio do comprovante:', 'AdminBookingForm', uploadError);
          addNotification({
            type: 'error',
            title: 'Comprovante não enviado',
            message: `${attachmentUploadErrorMessage(uploadError)} A reserva foi salva: anexe o comprovante na ficha, em "Anexos e comprovantes".`,
          });
        }
      }
      clearDraft();
      onSuccess();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha ao salvar reserva';
      setServerError(msg);
      addNotification({ type: 'error', title: 'Erro', message: msg });
    } finally {
      setSaving(false);
    }
  };

  // Diária (lote 13): o texto do valor final diz como o servidor calcula o equipamento (por hora ou por
  // diária, EQUIPMENT_PRICE_UNIT). Só a criação mostra esse texto, então só ela consulta.
  const equipmentUnit = useEquipmentPriceUnit(!isEditing && !loading);

  if (loading) return <BrandLoader size={100} label="Carregando formulário de reserva..." />;

  // Na edição, só para leitura: o nome do cliente cadastrado e os itens da reserva.
  const registeredClientName = editedBooking?.client?.user?.name || editedBooking?.client?.name || editedBooking?.clientName;
  const editItemNames = editedBooking ? itemNamesOf(editedBooking) : [];

  return (
    <div className="space-y-6">
      {serverError && (
        <Alert variant="error" title="Erro" description={serverError} onClose={() => setServerError(null)} />
      )}

      <Form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {draftPrompt && (
          <DraftRestoreBanner
            savedAt={draftPrompt.savedAt}
            onRestore={handleRestoreDraft}
            onDiscard={handleDiscardDraft}
          />
        )}
        <FormSection
          title="Cliente"
          description={
            !isEditing
              ? 'Associe a reserva a um cliente'
              : clientType === 'registered'
                ? 'O cliente cadastrado da reserva não troca na edição'
                : 'Nome e contato do cliente gravados nesta reserva'
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Na edição o tipo não troca: vincular ou desvincular o cadastro de um cliente não é por aqui. */}
            {!isEditing && (
              <Select
                label="Tipo de Cliente"
                value={clientType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setValue('clientType', e.target.value as 'registered' | 'manual')}
                options={[
                  { value: 'registered', label: 'Registrado' },
                  { value: 'manual', label: 'Manual' },
                ]}
              />
            )}
            {isEditing && clientType === 'registered' ? (
              <p className="text-sm text-foreground">
                Cliente cadastrado: <strong>{registeredClientName || 'sem nome'}</strong>
              </p>
            ) : clientType === 'registered' ? (
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
                <Input label="Contato" {...register('clientContact')} error={errors.clientContact?.message} />
                <Input label="Email" type="email" {...register('clientEmail')} error={errors.clientEmail?.message} />
              </>
            )}
          </div>
        </FormSection>

        {isEditing ? (
          // Achado (auditoria ponta a ponta): a edição deixava trocar kit e equipamentos, e o servidor
          // não gravava a troca. Gravar exige recalcular o valor da reserva (regra de preço ainda em
          // decisão); até lá, na edição eles aparecem só para leitura.
          <FormSection title="Itens" description="Kit, equipamentos e serviços não mudam na edição: trocar exigiria recalcular o valor da reserva.">
            {editItemNames.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1 text-sm text-foreground">
                {editItemNames.map((name, index) => <li key={index}>{name}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum item nesta reserva.</p>
            )}
          </FormSection>
        ) : (
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
                <div className="space-y-2" role="group" aria-labelledby="admin-booking-equipments-label">
                  <p id="admin-booking-equipments-label" className="text-sm font-medium text-foreground">Equipamentos</p>
                  <Input
                    aria-label="Buscar equipamento"
                    placeholder="Buscar equipamento..."
                    value={equipSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEquipSearch(e.target.value)}
                    className="mb-2"
                  />
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-56 overflow-auto p-3 border border-border rounded-lg bg-background">
                    {equipments
                      .filter(eq => eq.name.toLowerCase().includes(equipSearch.toLowerCase()))
                      .map((eq) => (
                      <Checkbox
                        key={eq.id}
                        id={`admin-booking-eq-${eq.id}`}
                        value={eq.id}
                        label={eq.name}
                        {...register('equipmentIds')}
                      />
                    ))}
                  </div>
                  {errors.equipmentIds && (
                    <p role="alert" className="text-sm text-destructive">Selecione pelo menos um equipamento</p>
                  )}
                </div>
              )}
            </div>
          </FormSection>
        )}

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
                label="Valor final (R$)"
                type="number"
                step="0.01"
                min="0"
                {...register('finalValue', {
                  // Em branco vira "sem valor final" (o servidor calcula), não NaN.
                  setValueAs: (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
                })}
                error={errors.finalValue?.message}
                placeholder={isEditing ? 'Valor atual mantido' : 'Calculado pelos itens'}
                // Na edição o servidor não recalcula: sem valor final, o total da reserva fica como está.
                description={isEditing
                  ? 'Opcional. O valor que o cliente paga, o mesmo em todo lugar. Em branco, o valor atual da reserva fica como está.'
                  : equipmentUnit === 'day'
                    ? 'Opcional. O valor que o cliente paga, o mesmo em todo lugar. Em branco, é calculado pelos itens e pelas diárias do evento.'
                    : 'Opcional. O valor que o cliente paga, o mesmo em todo lugar. Em branco, é calculado pelos itens e pelas horas do evento.'}
              />
              <Input
                type="file"
                label="Comprovante de Pagamento"
                {...register('paymentProof')}
                accept={ATTACHMENT_ACCEPT}
                error={errors.paymentProof ? String(errors.paymentProof.message) : undefined}
                description={`Opcional. ${ATTACHMENT_RULE_TEXT}. Vai para "Anexos e comprovantes" da reserva depois de salvar.`}
              />
              <Select
                label="Situação do Pagamento"
                {...register('paymentStatus')}
                options={PAYMENT_STATUS_OPTIONS}
              />
            </div>
          </FormSection>
        )}

        <FormSection title="Outros" description="Notas e estados">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Textarea label="Observações" rows={3} {...register('notes')} />
            <div className="grid grid-cols-2 gap-4">
              {/* Na edição o status não aparece: o servidor não o grava por aqui, e ele muda pelos botões
                  da ficha e pela lista de Reservas (confirmar confere conflito e avisa o cliente). */}
              {!isEditing && (
                <Select
                  label="Status"
                  {...register('status')}
                  options={BOOKING_STATUS_OPTIONS}
                />
              )}
              <Select
                label="Entrega"
                {...register('deliveryStatus')}
                options={DELIVERY_STATUS_OPTIONS}
              />
            </div>
          </div>
          {!isEditing && watchedValues.status === 'CONFIRMED' && (
            <div className="mt-4">
              <NotifyClientCheckbox checked={notifyClient} onChange={setNotifyClient} />
            </div>
          )}
        </FormSection>

        <FormActions>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button type="submit" isLoading={saving} disabled={saving}>{isEditing ? 'Salvar alterações' : 'Criar reserva'}</Button>
        </FormActions>
      </Form>
    </div>
  );
}
