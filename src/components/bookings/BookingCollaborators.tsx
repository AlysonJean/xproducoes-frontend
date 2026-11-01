import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { logger } from '@/utils/logger';
import { apiFetch, collaboratorsAPI } from '../../services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  Button,
  Modal,
  Form,
  Input,
  Select,
  Badge,
  Skeleton,
  ConfirmModal,
  FormActions
} from '../ui/StandardComponents';
import { User, Plus, Trash2, Clock, Banknote } from 'lucide-react';
import { formatPrice } from '../../utils/typeSafeFormatters';
import { COLLABORATOR_ROLE_OPTIONS, collaboratorRoleLabel } from '../../utils/collaboratorRoles';

// --- Types ---
interface EventCollaborator {
  id: string;
  role: string;
  status: string;
  collaborator: {
    id: string;
    user: {
      name: string;
      email: string;
      avatarUrl?: string;
    };
    collaboratorRole: string;
  };
  startTime: string;
  endTime: string;
  fixedRate?: number;
}

interface CollaboratorOption {
  id: string;
  user: {
    name: string;
  };
  collaboratorRole: string;
  specialties: string[];
}

interface BookingCollaboratorsProps {
  bookingId: string;
  eventDate: string; // ISO string
  eventDuration?: number; // minutes
  requiredServices?: string[]; // List of service names required (e.g., "DJ", "Fotógrafo")
}

// --- Schema ---
const assignmentSchema = z.object({
  collaboratorId: z.string().min(1, 'Selecione um colaborador'),
  role: z.string().min(1, 'Selecione uma função'),
  startTime: z.string().min(1, 'Horário de início obrigatório'),
  endTime: z.string().min(1, 'Horário de fim obrigatório'),
  fixedRate: z.number().optional(),
});

type AssignmentFormData = z.infer<typeof assignmentSchema>;

export const BookingCollaborators: React.FC<BookingCollaboratorsProps> = ({ 
  bookingId, 
  eventDate, // Descomentado
  // eventDuration = 240,
  requiredServices = []
}) => {
  const { addNotification } = useNotifications();
  const [collaborators, setCollaborators] = useState<EventCollaborator[]>([]);
  const [availableCollaborators, setAvailableCollaborators] = useState<CollaboratorOption[]>([]);
  const [busyCollaboratorIds, setBusyCollaboratorIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // confirm() nativo → ConfirmModal: atribuição pendente (colaborador ocupado) e remoção pendente.
  const [pendingAssignment, setPendingAssignment] = useState<AssignmentFormData | null>(null);
  const [assignmentToRemove, setAssignmentToRemove] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Initialize form
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      startTime: '19:00',
      endTime: '23:00'
    }
  });

  // Watch collaborator selection to auto-fill role
  const selectedCollaboratorId = watch('collaboratorId');

  useEffect(() => {
    if (selectedCollaboratorId) {
      const selected = availableCollaborators.find(c => c.id === selectedCollaboratorId);
      if (selected) {
        setValue('role', selected.collaboratorRole);
        
        // Alerta extra se selecionar alguém ocupado
        if (busyCollaboratorIds.has(selectedCollaboratorId)) {
             addNotification({
                type: 'warning',
                title: 'Atenção',
                message: 'Este colaborador já possui agendamento ou restrição nesta data.',
                duration: 5000
             });
        }
      }
    }
  }, [selectedCollaboratorId, availableCollaborators, setValue, busyCollaboratorIds, addNotification]);

  // Fetch data
  const fetchCollaborators = useCallback(async () => {
    try {
      const data = await apiFetch<EventCollaborator[]>(`/collaborators/events/${bookingId}/collaborators`);
      setCollaborators(Array.isArray(data) ? data : []);
    } catch (error) {
      logger.error('Erro ao buscar colaboradores da reserva', 'BookingCollaborators', error);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId]);

  const fetchAvailableOptions = useCallback(async () => {
    try {
      // Busca todos os colaboradores para listagem
      const allCollaboratorsPromise = apiFetch('/collaborators/search?limit=100'); 
      
      // Se tiver data, busca disponibilidade
      let availableIds: Set<string> | null = null;
      if (eventDate) {
          try {
                          const availableResponse = await collaboratorsAPI.getAvailable(eventDate);
             const availableList = availableResponse.data;
             
             if (availableList && Array.isArray(availableList)) {
                 availableIds = new Set(availableList.map((c: { id: string }) => c.id));
             }
          } catch (err) {
              logger.error('Erro ao checar disponibilidade', 'BookingCollaborators', err);
          }
      }

      const response = await allCollaboratorsPromise as { data?: CollaboratorOption[] } | CollaboratorOption[];
      const allOptions: CollaboratorOption[] = (response as { data?: CollaboratorOption[] }).data || (response as CollaboratorOption[]) || [];
      
      setAvailableCollaborators(allOptions);

      // Calcular ocupados: Quem está em 'all' e NÃO em 'availableIds'
      if (availableIds) {
          const busy = new Set<string>();
          allOptions.forEach(opt => {
              if (!availableIds?.has(opt.id)) {
                  busy.add(opt.id);
              }
          });
          setBusyCollaboratorIds(busy);
      } else {
          setBusyCollaboratorIds(new Set());
      }

    } catch (error) {
       logger.error('Erro ao buscar opções de colaboradores', 'BookingCollaborators', error);
    }
  }, [eventDate]);

  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  useEffect(() => {
    if (isModalOpen) {
      fetchAvailableOptions();
    }
  }, [isModalOpen, fetchAvailableOptions]);

  // Sort collaborators: Suggested ones first
  const sortedOptions = useMemo(() => {
    if (!availableCollaborators.length) return [];
    
    return [...availableCollaborators].sort((a, b) => {
      // Prioridade: Disponíveis > Sugeridos > Ocupados
      const aBusy = busyCollaboratorIds.has(a.id);
      const bBusy = busyCollaboratorIds.has(b.id);
      
      if (aBusy && !bBusy) return 1; // Ocupados pro fim
      if (!aBusy && bBusy) return -1;

      // Check if matches any required service
      const aMatches = requiredServices.some(s => 
        a.collaboratorRole.toLowerCase().includes(s.toLowerCase()) || 
        a.specialties?.some(sp => sp.toLowerCase().includes(s.toLowerCase()))
      );
      const bMatches = requiredServices.some(s => 
        b.collaboratorRole.toLowerCase().includes(s.toLowerCase()) || 
        b.specialties?.some(sp => sp.toLowerCase().includes(s.toLowerCase()))
      );

      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return 0;
    });
  }, [availableCollaborators, requiredServices, busyCollaboratorIds]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    reset({
        startTime: '14:00', // Default placeholder
        endTime: '18:00'
    });
  };

  const onSubmit = async (data: AssignmentFormData) => {
    if (busyCollaboratorIds.has(data.collaboratorId)) {
      setPendingAssignment(data);
      return;
    }
    await saveAssignment(data);
  };

  const saveAssignment = async (data: AssignmentFormData) => {
    try {
      setIsSubmitting(true);
      await apiFetch('/collaborators/event-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          ...data
        })
      });

      addNotification({
        type: 'success',
        title: 'Sucesso',
        message: 'Colaborador atribuído com sucesso!',
      });
      
      setIsModalOpen(false);
      fetchCollaborators();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; message?: string } }; message?: string };
      logger.error('Erro ao atribuir colaborador', 'BookingCollaborators', err);
      addNotification({
        type: 'error',
        title: 'Atenção',
        message: err.response?.data?.message || err.response?.data?.error || err.message || 'Não foi possível atribuir o colaborador. Tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
      setPendingAssignment(null);
    }
  };

  const handleRemove = async () => {
      if (!assignmentToRemove) return;
      try {
        setIsRemoving(true);
        await apiFetch(`/collaborators/event-assignments/${assignmentToRemove}`, { method: 'DELETE' });
        addNotification({ type: 'success', title: 'Removido', message: 'Colaborador removido.' });
        fetchCollaborators();
      } catch {
          addNotification({ type: 'error', title: 'Erro', message: 'Erro ao remover.' });
      } finally {
        setIsRemoving(false);
        setAssignmentToRemove(null);
      }
  };

  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label="Carregando equipe">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Colaboradores atribuídos
        </h4>
        <Button size="sm" onClick={handleOpenModal} leftIcon={<Plus className="w-4 h-4" />}>
          Adicionar
        </Button>
      </div>

      {/* Required Services Badge */}
      {requiredServices.length > 0 && (
         <div className="flex flex-wrap items-center gap-2 mb-2">
           <span className="text-sm text-muted-foreground">Serviços da reserva:</span>
           {requiredServices.map(s => (
             <Badge key={s} variant="primary" size="sm">
               {s}
             </Badge>
           ))}
         </div>
      )}

      {collaborators.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/20">
          <User className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm">Nenhum colaborador atribuído a este evento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {collaborators.map((item) => (
            <div key={item.id} className="p-3 bg-card border rounded-lg shadow-sm flex items-start justify-between gap-2 group hover:border-primary/50 transition-colors">
              <div className="flex gap-3 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
                  {item.collaborator.user.avatarUrl ? (
                      <img src={item.collaborator.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                      item.collaborator.user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{item.collaborator.user.name}</p>
                  <p className="text-xs uppercase tracking-wide font-semibold text-primary">{collaboratorRoleLabel(item.role)}</p>

                  <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.startTime} - {item.endTime}
                      </span>
                      {item.fixedRate && (
                          <span className="flex items-center gap-1 text-success font-medium">
                              <Banknote className="w-3 h-3" />
                              {formatPrice(item.fixedRate)}
                          </span>
                      )}
                  </div>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAssignmentToRemove(item.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
                title="Remover"
                aria-label={`Remover ${item.collaborator.user.name} da equipe`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Adição */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Atribuir Colaborador"
      >
        <Form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Select
                label="Colaborador"
                {...register('collaboratorId')}
                error={errors.collaboratorId?.message}
                description={requiredServices.length > 0 ? '★ = sugerido pelos serviços da reserva' : undefined}
                options={[
                  { value: '', label: 'Selecione...' },
                  ...sortedOptions.map(c => {
                    const isSuggested = requiredServices.some(s =>
                      c.collaboratorRole.toLowerCase().includes(s.toLowerCase()) ||
                      c.specialties?.some(sp => sp.toLowerCase().includes(s.toLowerCase()))
                    );
                    const isBusy = busyCollaboratorIds.has(c.id);
                    const prefix = isBusy ? '(indisponível) ' : (isSuggested ? '★ ' : '');
                    return { value: c.id, label: `${prefix}${c.user.name} — ${collaboratorRoleLabel(c.collaboratorRole)}` };
                  }),
                ]}
            />

            {/* Era texto livre ("Ex: DJ Principal"), mas o campo no banco é o enum CollaboratorRole. */}
            <Select
                label="Função no evento"
                {...register('role')}
                error={errors.role?.message}
                options={[{ value: '', label: 'Selecione...' }, ...COLLABORATOR_ROLE_OPTIONS]}
            />

            <div className="grid grid-cols-2 gap-4">
                <Input 
                    type="time" 
                    label="Início" 
                    {...register('startTime')}
                    error={errors.startTime?.message}
                />
                <Input 
                    type="time" 
                    label="Fim" 
                    {...register('endTime')}
                    error={errors.endTime?.message}
                />
            </div>

             <Input 
                type="number" 
                label="Cachê Fixo (Opcional)" 
                placeholder="0.00"
                step="0.01"
                {...register('fixedRate', { valueAsNumber: true })}
                error={errors.fixedRate?.message}
            />

            <FormActions>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" isLoading={isSubmitting}>Confirmar</Button>
            </FormActions>
        </Form>
      </Modal>

      <ConfirmModal
        isOpen={!!pendingAssignment}
        onClose={() => setPendingAssignment(null)}
        onConfirm={() => { if (pendingAssignment) void saveAssignment(pendingAssignment); }}
        title="Colaborador indisponível"
        message="Este colaborador consta como indisponível ou ocupado nesta data. Deseja atribuir mesmo assim?"
        variant="warning"
        isLoading={isSubmitting}
        confirmText="Atribuir mesmo assim"
        cancelText="Voltar"
      />

      <ConfirmModal
        isOpen={!!assignmentToRemove}
        onClose={() => setAssignmentToRemove(null)}
        onConfirm={handleRemove}
        title="Remover colaborador?"
        message="O colaborador deixará de fazer parte da equipe deste evento."
        variant="danger"
        isLoading={isRemoving}
        confirmText="Remover"
        cancelText="Cancelar"
      />
    </div>
  );
};
