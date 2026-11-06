// Caminho: frontend/src/components/admin/ManualBookingModal.tsx

import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// Zod já está corretamente importado
import { useEffect, useState, type ChangeEvent } from 'react';
import { apiFetch } from '../../services/api';
import type { Equipment, Kit } from '../../types/types';
import { Button, Input, Textarea, FormActions, Alert, Select, Checkbox } from '../ui/StandardComponents';
import { Modal } from '../ui/Modal';
import { formatPrice } from '../../utils/typeSafeFormatters';
import { notifyClientPayload } from '../../utils/notifyClient';
import { NotifyClientCheckbox } from '../bookings/NotifyClientCheckbox';

const manualBookingSchema = z
  .object({
    clientName: z.string().min(3, 'Nome do cliente é obrigatório.'),
    clientContact: z.string().min(8, 'Contato é obrigatório.'),
    eventDate: z.string().min(1, 'Data de início é obrigatória.'),
    eventEndDate: z.string().min(1, 'Data final é obrigatória.'),
    kitId: z.string().optional(),
    equipmentIds: z.array(z.string()).optional(),
    // Campos de endereço obrigatórios
    location: z.string().min(1, 'Local do evento é obrigatório.'),
    street: z.string().min(1, 'Rua é obrigatória.'),
    neighborhood: z.string().min(1, 'Bairro é obrigatório.'),
    city: z.string().min(1, 'Cidade é obrigatória.'),
    state: z.string().min(1, 'Estado é obrigatório.'),
    zipCode: z.string().min(1, 'CEP é obrigatório.'),
    addressNumber: z.string().min(1, 'Número é obrigatório.'),
    addressComplement: z.string().optional(),
    // D8a (aprovada em 02/11/2026): valor final opcional, o mesmo do formulário completo. Em branco, o
    // servidor calcula pelo kit ou pelos equipamentos e pelas horas do evento (antes nascia com R$ 0).
    finalValue: z.number().positive('O valor final deve ser maior que zero.').optional(),
    notes: z.string().optional(),
  })
  .refine(
        (data) => {
      // Garante que ou um kit ou pelo menos um equipamento seja selecionado
      return !!data.kitId || (Array.isArray(data.equipmentIds) && data.equipmentIds.length > 0);
    },
    {
      message: 'É necessário selecionar um kit ou pelo menos um equipamento.',
      path: ['kitId'],
    }
  );
type ManualBookingFormData = z.infer<typeof manualBookingSchema>;

// Rádio nativo com a cor da marca e foco visível (antes: `rounded`, sem estilo de foco).
const RADIO_CLASSES =
  'h-4 w-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background';

interface RawClientRecord {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  user?: { id?: string; name?: string; email?: string };
}

interface RawClientsResponse {
  data?: RawClientRecord[];
}

interface ManualBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ManualBookingModal = ({ isOpen, onClose, onSuccess }: ManualBookingModalProps) => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedEquipments, setSelectedEquipments] = useState<string[]>([]);
  const [selectedKit, setSelectedKit] = useState<string>('');
  const [clients, setClients] = useState<Array<{id: string, name: string, email?: string, phone?: string}>>([]);
  const [kitSearch, setKitSearch] = useState('');
  const [equipSearch, setEquipSearch] = useState('');
  // D11 (aprovada em 02/11/2026): a reserva deste modal nasce Confirmada e avisa o cliente uma vez, com
  // "Avisar o cliente por e-mail" marcada por padrão.
  const [notifyClient, setNotifyClient] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<ManualBookingFormData>({
    resolver: zodResolver(manualBookingSchema),
    defaultValues: {
      equipmentIds: [],
      kitId: '',
    },
  });

  const handleEquipmentChange = (equipmentId: string, checked: boolean) => {
    let newSelection: string[];
    if (checked) {
      newSelection = [...selectedEquipments, equipmentId];
    } else {
      newSelection = selectedEquipments.filter((id) => id !== equipmentId);
    }
    setSelectedEquipments(newSelection);
    setValue('equipmentIds', newSelection);

    // Se selecionou equipamento individual, desmarcar kit
    if (checked && selectedKit) {
      setSelectedKit('');
      setValue('kitId', '');
    }
  };

  const handleKitChange = (kitId: string) => {
    setSelectedKit(kitId);
    setValue('kitId', kitId);

    // Se selecionou kit, desmarcar equipamentos individuais
    if (kitId) {
      setSelectedEquipments([]);
      setValue('equipmentIds', []);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const loadData = async () => {
      try {
        const [equipData, kitData, clientsRes] = await Promise.all([
          apiFetch('/equipments'),
          apiFetch('/kits'),
                      apiFetch<RawClientsResponse | RawClientRecord[]>('/admin/clients').catch(() => ({ data: [] })),
        ]);
        setEquipments(equipData as Equipment[]);
        setKits(kitData as Kit[]);

        const list: RawClientRecord[] = Array.isArray(clientsRes)
          ? clientsRes
          : (Array.isArray(clientsRes?.data) ? clientsRes.data : []);
                  const mappedClients = list.map((c) => ({
          id: c.id || c.user?.id || '',
          name: c.user?.name || c.name || 'Cliente',
          email: c.user?.email || c.email,
          phone: c.phone || '',
                  })).sort((a, b) => a.name.localeCompare(b.name));
        setClients(mappedClients);
      } catch {
        setServerError('Falha ao carregar dados.');
      }
    };
    loadData();
  }, [isOpen]);

  // Reset do estado local do formulário no evento real de fechamento (não reativo a `isOpen`
  // via efeito — evita setState síncrono dentro de um efeito, react-hooks/set-state-in-effect).
  // Cobre todos os caminhos de fechamento: X/overlay/esc (via Modal) e sucesso no submit.
  const handleModalClose = () => {
    setSelectedEquipments([]);
    setSelectedKit('');
    setValue('equipmentIds', []);
    setValue('kitId', '');
    setNotifyClient(true);
    onClose();
  };

  const onSubmit: SubmitHandler<ManualBookingFormData> = async (data) => {
    setServerError(null);
    try {
      // Converter as datas para formato ISO datetime
      const { finalValue, ...rest } = data;
      const payload = {
        ...rest,
        ...(finalValue ? { totalPrice: finalValue } : {}),
        eventDate: new Date(data.eventDate).toISOString(),
        eventEndDate: new Date(data.eventEndDate).toISOString(),
        status: 'CONFIRMED' as const,
        kitId: selectedKit || undefined,
        equipmentIds: selectedEquipments.length > 0 ? selectedEquipments : undefined,
      };
  await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify({ ...payload, ...notifyClientPayload(notifyClient) }),
      });
      onSuccess();
      handleModalClose();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Ocorreu um erro ao criar a reserva.');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Adicionar Reserva Manual"
      className="max-w-4xl"
    >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          <div className="bg-muted/50 p-4 rounded-lg mb-4">
            <Select
              label="Buscar cliente cadastrado (opcional)"
              placeholder="Selecione para preencher automaticamente..."
              options={clients.map(c => ({ 
                value: c.id, 
                label: `${c.name} ${c.phone ? `(${c.phone})` : ''}` 
              }))}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                const clientId = e.target.value;
                const client = clients.find(c => c.id === clientId);
                if (client) {
                   setValue('clientName', client.name);
                   if (client.phone) setValue('clientContact', client.phone);
                }
              }}
            />
          </div>

          <Input
            {...register('clientName')}
            label="Nome do cliente"
            className="w-full"
            error={errors.clientName?.message}
          />

          <Input
            {...register('clientContact')}
            label="Contato (telefone ou e-mail)"
            className="w-full"
            error={errors.clientContact?.message}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Início do evento"
              type="datetime-local"
              {...register('eventDate')}
              className="w-full"
              error={errors.eventDate?.message}
            />
            <Input
              label="Fim do evento"
              type="datetime-local"
              {...register('eventEndDate')}
              className="w-full"
              error={errors.eventEndDate?.message}
            />
          </div>

          {/* Campos de Endereço */}
          <Input
            {...register('location')}
            label="Local do evento"
            className="w-full"
            error={errors.location?.message}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                {...register('street')}
                label="Rua"
                className="w-full"
                error={errors.street?.message}
              />
            </div>
            <div>
              <Input
                {...register('addressNumber')}
                label="Número"
                className="w-full"
                error={errors.addressNumber?.message}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                {...register('neighborhood')}
                label="Bairro"
                className="w-full"
                error={errors.neighborhood?.message}
              />
            </div>
            <div>
              <Input
                {...register('zipCode')}
                label="CEP"
                className="w-full"
                error={errors.zipCode?.message}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                {...register('city')}
                label="Cidade"
                className="w-full"
                error={errors.city?.message}
              />
            </div>
            <div>
              <Input
                {...register('state')}
                label="Estado"
                className="w-full"
                error={errors.state?.message}
              />
            </div>
          </div>

          <Input
            {...register('addressComplement')}
            label="Complemento (opcional)"
            className="w-full"
          />

          <Input
            type="number"
            step="0.01"
            min="0"
            {...register('finalValue', {
              setValueAs: (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
            })}
            label="Valor final (R$)"
            placeholder="Calculado pelos itens"
            description="Opcional. Em branco, é calculado pelo kit ou pelos equipamentos e pelas horas do evento."
            error={errors.finalValue?.message}
            className="w-full"
          />

          <Textarea
            {...register('notes')}
            label="Observações (opcional)"
            rows={3}
            className="w-full"
          />

          {/* Seleção de Kit ou Equipamentos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Seleção de Equipamentos</h3>
            <p className="text-sm text-muted-foreground">
              Escolha um kit completo OU equipamentos individuais (não ambos)
            </p>

            {/* Kits */}
            <div role="group" aria-labelledby="manual-booking-kits-title" className="bg-muted p-4 rounded-md">
              <h4 id="manual-booking-kits-title" className="font-semibold mb-2">Kits Disponíveis</h4>
              <Input
                aria-label="Buscar kit"
                placeholder="Buscar kit..."
                value={kitSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKitSearch(e.target.value)}
                size="xs"
                className="mb-2 bg-background"
              />
              <div className="max-h-32 overflow-y-auto space-y-2">
                {kits
                  .filter(kit => kit.name.toLowerCase().includes(kitSearch.toLowerCase()))
                  .map((kit) =>
                  kit.id ? (
                    <label key={kit.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="kitSelection"
                        checked={selectedKit === kit.id}
                        onChange={() => handleKitChange(kit.id!)}
                        className={RADIO_CLASSES}
                      />
                      <span>
                        {kit.name} - {formatPrice(kit.price ?? 0)}
                      </span>
                    </label>
                  ) : null
                )}
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="kitSelection"
                    checked={selectedKit === ''}
                    onChange={() => handleKitChange('')}
                    className={RADIO_CLASSES}
                  />
                  <span>Nenhum kit (equipamentos individuais)</span>
                </label>
              </div>
            </div>

            {/* Equipamentos Individuais */}
            <div role="group" aria-labelledby="manual-booking-equipments-title" className="bg-muted p-4 rounded-md">
              <h4 id="manual-booking-equipments-title" className="font-semibold mb-2">Equipamentos Individuais</h4>
              <Input
                aria-label="Buscar equipamento"
                placeholder="Buscar equipamento..."
                value={equipSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEquipSearch(e.target.value)}
                size="xs"
                className="mb-2 bg-background"
              />
              <div className="max-h-40 overflow-y-auto space-y-2">
                {equipments
                  .filter(eq => eq.name.toLowerCase().includes(equipSearch.toLowerCase()))
                  .map((eq) =>
                  eq.id ? (
                    <Checkbox
                      key={eq.id}
                      id={`manual-booking-eq-${eq.id}`}
                      checked={selectedEquipments.includes(eq.id!)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleEquipmentChange(eq.id!, e.target.checked)
                      }
                      disabled={selectedKit !== ''}
                      label={`${eq.name} - ${formatPrice(eq.pricePerHour ?? 0)}/hora`}
                    />
                  ) : null
                )}
              </div>
            </div>
          </div>

          {errors.kitId && <p role="alert" className="text-sm text-destructive font-medium">{errors.kitId.message}</p>}
          {errors.equipmentIds && <p role="alert" className="text-sm text-destructive font-medium">{errors.equipmentIds.message}</p>}

          <NotifyClientCheckbox checked={notifyClient} onChange={setNotifyClient} />

          {serverError && <Alert variant="error" title="Erro" description={serverError} />}

          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={handleModalClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Salvar Reserva
            </Button>
          </FormActions>
        </form>
    </Modal>
  );
};
