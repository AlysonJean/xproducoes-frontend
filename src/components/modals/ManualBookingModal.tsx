// Caminho: frontend/src/components/admin/ManualBookingModal.tsx

import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// Zod já está corretamente importado
import { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api';
import type { Equipment, Kit } from '../../types/types';
import { Button, Input, Textarea, FormActions, Alert, Select } from '../ui/StandardComponents'; // Added Select
import { formatPrice } from '../../utils/typeSafeFormatters';
import { BaseModal } from './BaseModal';

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
    notes: z.string().optional(),
  })
  .refine(
    (data: any) => {
      // Garante que ou um kit ou pelo menos um equipamento seja selecionado
      return !!data.kitId || (Array.isArray(data.equipmentIds) && data.equipmentIds.length > 0);
    },
    {
      message: 'É necessário selecionar um kit ou pelo menos um equipamento.',
      path: ['kitId'],
    }
  );
type ManualBookingFormData = z.infer<typeof manualBookingSchema>;

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
    if (isOpen) {
      const loadData = async () => {
        try {
          const [equipData, kitData, clientsRes] = await Promise.all([
            apiFetch('/equipments'),
            apiFetch('/kits'),
            apiFetch<any>('/admin/clients').catch(() => ({ data: [] })),
          ]);
          setEquipments(equipData as Equipment[]);
          setKits(kitData as Kit[]);
          
          const list = Array.isArray(clientsRes?.data) ? clientsRes.data : (Array.isArray(clientsRes) ? clientsRes : []);
          const mappedClients = list.map((c: any) => ({
            id: c.id || c.user?.id,
            name: c.user?.name || c.name || 'Cliente',
            email: c.user?.email || c.email,
            phone: c.phone || '',
          })).sort((a: any, b: any) => a.name.localeCompare(b.name));
          setClients(mappedClients);
        } catch {
          setServerError('Falha ao carregar dados.');
        }
      };
      loadData();
    } else {
      // Limpar seleções quando o modal fechar
      setSelectedEquipments([]);
      setSelectedKit('');
      setValue('equipmentIds', []);
      setValue('kitId', '');
    }
  }, [isOpen, setValue]);

  const onSubmit: SubmitHandler<ManualBookingFormData> = async (data) => {
    setServerError(null);
    try {
      // Converter as datas para formato ISO datetime
      const payload = {
        ...data,
        eventDate: new Date(data.eventDate).toISOString(),
        eventEndDate: new Date(data.eventEndDate).toISOString(),
        status: 'CONFIRMED' as const,
        kitId: selectedKit || undefined,
        equipmentIds: selectedEquipments.length > 0 ? selectedEquipments : undefined,
      };
  await apiFetch('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Ocorreu um erro ao criar a reserva.');
    }
  };

  if (!isOpen) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Adicionar Reserva Manual"
      className="max-w-4xl"
    >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          <div className="bg-muted/50 p-4 rounded-lg mb-4">
            <h4 className="text-sm font-semibold mb-2">Buscar Cliente Cadastrado (Opcional)</h4>
            <Select
              placeholder="Selecione para preencher automaticamente..."
              options={clients.map(c => ({ 
                value: c.id, 
                label: `${c.name} ${c.phone ? `(${c.phone})` : ''}` 
              }))}
              onChange={(e: any) => {
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
            placeholder="Nome do Cliente"
            className="w-full"
            error={errors.clientName?.message}
          />

          <Input
            {...register('clientContact')}
            placeholder="Contato (Telefone/Email)"
            className="w-full"
            error={errors.clientContact?.message}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Início do Evento</label>
              <Input
                type="datetime-local"
                {...register('eventDate')}
                className="w-full"
                error={errors.eventDate?.message}
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Fim do Evento</label>
              <Input
                type="datetime-local"
                {...register('eventEndDate')}
                className="w-full"
                error={errors.eventEndDate?.message}
              />
            </div>
          </div>

          {/* Campos de Endereço */}
          <Input
            {...register('location')}
            placeholder="Local do Evento"
            className="w-full"
            error={errors.location?.message}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                {...register('street')}
                placeholder="Rua"
                className="w-full"
                error={errors.street?.message}
              />
            </div>
            <div>
              <Input
                {...register('addressNumber')}
                placeholder="Número"
                className="w-full"
                error={errors.addressNumber?.message}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                {...register('neighborhood')}
                placeholder="Bairro"
                className="w-full"
                error={errors.neighborhood?.message}
              />
            </div>
            <div>
              <Input
                {...register('zipCode')}
                placeholder="CEP"
                className="w-full"
                error={errors.zipCode?.message}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                {...register('city')}
                placeholder="Cidade"
                className="w-full"
                error={errors.city?.message}
              />
            </div>
            <div>
              <Input
                {...register('state')}
                placeholder="Estado"
                className="w-full"
                error={errors.state?.message}
              />
            </div>
          </div>

          <Input
            {...register('addressComplement')}
            placeholder="Complemento (Opcional)"
            className="w-full"
          />

          <Textarea
            {...register('notes')}
            placeholder="Observações (Opcional)"
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
            <div className="bg-muted p-4 rounded-md">
              <h4 className="font-semibold mb-2">Kits Disponíveis</h4>
              <Input
                placeholder="Buscar kit..."
                value={kitSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKitSearch(e.target.value)}
                className="mb-2 h-8 bg-background"
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
                        className="rounded"
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
                    className="rounded"
                  />
                  <span>Nenhum kit (equipamentos individuais)</span>
                </label>
              </div>
            </div>

            {/* Equipamentos Individuais */}
            <div className="bg-muted p-4 rounded-md">
              <h4 className="font-semibold mb-2">Equipamentos Individuais</h4>
              <Input
                placeholder="Buscar equipamento..."
                value={equipSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEquipSearch(e.target.value)}
                className="mb-2 h-8 bg-background"
              />
              <div className="max-h-40 overflow-y-auto space-y-2">
                {equipments
                  .filter(eq => eq.name.toLowerCase().includes(equipSearch.toLowerCase()))
                  .map((eq) =>
                  eq.id ? (
                    <label key={eq.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedEquipments.includes(eq.id!)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleEquipmentChange(eq.id!, e.target.checked)
                        }
                        disabled={selectedKit !== ''}
                        className="rounded"
                      />
                      <span className={selectedKit !== '' ? 'text-muted-foreground' : ''}>
                        {eq.name} - {formatPrice(eq.pricePerHour ?? 0)}/hora
                      </span>
                    </label>
                  ) : null
                )}
              </div>
            </div>
          </div>

          {errors.kitId && <p className="text-red-400 font-medium">{errors.kitId.message}</p>}
          {errors.equipmentIds && <p className="text-red-400 font-medium">{errors.equipmentIds.message}</p>}

          {serverError && <Alert variant="error" title="Erro" description={serverError} />}

          <FormActions>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
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
    </BaseModal>
  );
};
