import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiFetch, collaboratorsAPI } from '../../services/api';
import { useNotifications } from '@/contexts/NotificationContext';
import {
  Button,
  Modal,
  Form,
  Input,
  FormActions
} from '../ui/StandardComponents';
import { User, Plus, Trash2, Clock, Euro } from 'lucide-react';
import { formatPrice } from '../../utils/typeSafeFormatters';

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
  const fetchCollaborators = async () => {
    try {
      const data = await apiFetch<EventCollaborator[]>(`/collaborators/events/${bookingId}/collaborators`);
      setCollaborators(data);
    } catch (error) {
      console.error('Erro ao buscar colaboradores da reserva:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableOptions = async () => {
    try {
      // Busca todos os colaboradores para listagem
      const allCollaboratorsPromise = apiFetch('/collaborators/search?limit=100'); 
      
      // Se tiver data, busca disponibilidade
      let availableIds: Set<string> | null = null;
      if (eventDate) {
          try {
             const availableResponse = await collaboratorsAPI.getAvailable(eventDate);
             const availableList: any[] = availableResponse.data.data; // Ajuste conforme resposta da API
             // A resposta do controller é { success: true, data: [...] }
             // apiFetch retorna direto o json? apiFetch retorna `response.json()`
             // Se collaboratorsAPI.getAvailable usa api.get, retorna AxiosResponse.
             // Ops, bookingAPI e collaboratorsAPI em api.ts retornam `api.get(...)` que retorna Promise<AxiosResponse>.
             // Mas `apiFetch` retorna `Promise<T>`.
             // Vou usar `collaboratorsAPI.getAvailable` que retorna Axios response.
             if (availableList && Array.isArray(availableList)) {
                 availableIds = new Set(availableList.map((c: any) => c.id));
             }
          } catch (err) {
              console.error("Erro ao checar disponibilidade", err);
          }
      }

      const response = await allCollaboratorsPromise as any;
      const allOptions: CollaboratorOption[] = response.data || response || [];
      
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
       console.error('Erro ao buscar opções de colaboradores:', error);
    }
  };

  useEffect(() => {
    fetchCollaborators();
  }, [bookingId]);

  useEffect(() => {
    if (isModalOpen) {
      fetchAvailableOptions();
    }
  }, [isModalOpen, eventDate]);

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
    try {
      if (busyCollaboratorIds.has(data.collaboratorId)) {
          if (!confirm("ATENÇÃO: Este colaborador consta como indisponível ou ocupado nesta data. Deseja prosseguir mesmo assim?")) {
              return;
          }
      }

      setIsSubmitting(true);
      await apiFetch('/collaborators/event-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: bookingId,
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
    } catch (error) {
      console.error(error);
      addNotification({
        type: 'error',
        title: 'Erro',
        message: 'Não foi possível atribuir o colaborador.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
      if(!confirm("Tem certeza que deseja remover este colaborador?")) return;
      
      try {
        await apiFetch(`/collaborators/event-assignments/${assignmentId}`, { method: 'DELETE' });
        addNotification({ type: 'success', title: 'Removido', message: 'Colaborador removido.' });
        fetchCollaborators();
      } catch {
          addNotification({ type: 'error', title: 'Erro', message: 'Erro ao remover.' });
      }
  };

  if (isLoading) return <div className="p-4 text-center">Carregando equipe...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Equipe / Staff
        </h3>
        <Button size="sm" onClick={handleOpenModal} leftIcon={<Plus className="w-4 h-4" />}>
          Adicionar
        </Button>
      </div>

      {/* Required Services Badge */}
      {requiredServices.length > 0 && (
         <div className="flex flex-wrap gap-2 mb-2">
           <span className="text-xs text-muted-foreground">Sugerido pelo Kit:</span>
           {requiredServices.map(s => (
             <span key={s} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
               {s}
             </span>
           ))}
         </div>
      )}

      {collaborators.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/20">
          <User className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p>Nenhum colaborador atribuído a este evento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {collaborators.map((item) => (
            <div key={item.id} className="p-3 bg-card border rounded-lg shadow-sm flex items-start justify-between group hover:border-primary/50 transition-colors">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
                  {item.collaborator.user.avatarUrl ? (
                      <img src={item.collaborator.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                      item.collaborator.user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">{item.collaborator.user.name}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold text-primary/80">{item.role}</p>
                  
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.startTime} - {item.endTime}
                      </span>
                      {item.fixedRate && (
                          <span className="flex items-center gap-1 text-green-600 font-medium">
                              <Euro className="w-3 h-3" />
                              {formatPrice(item.fixedRate)}
                          </span>
                      )}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => handleRemove(item.id)}
                className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                title="Remover"
              >
                <Trash2 className="w-4 h-4" />
              </button>
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
            <div className="space-y-2">
                <label className="text-sm font-medium">Colaborador</label>
                <select 
                    {...register('collaboratorId')}
                    className="w-full p-2 rounded-md border bg-background"
                >
                    <option value="">Selecione...</option>
                    {sortedOptions.map(c => {
                       const isSuggested = requiredServices.some(s => 
                          c.collaboratorRole.toLowerCase().includes(s.toLowerCase()) || 
                          c.specialties?.some(sp => sp.toLowerCase().includes(s.toLowerCase()))
                       );
                       const isBusy = busyCollaboratorIds.has(c.id);
                       
                       return (
                        <option key={c.id} value={c.id} disabled={false} className={isBusy ? 'text-red-500' : ''}>
                            {isBusy ? '⚠️ [Indisponível] ' : (isSuggested ? '⭐ ' : '')}
                            {c.user.name} ({c.collaboratorRole})
                        </option>
                       );
                    })}
                </select>
                {errors.collaboratorId && <p className="text-sm text-destructive">{errors.collaboratorId.message}</p>}
                {requiredServices.length > 0 && <p className="text-xs text-muted-foreground">⭐ = Recomendado baseados no Kit</p>}
            </div>

            <Input 
                label="Função no Evento"
                placeholder="Ex: DJ Principal"
                {...register('role')}
                error={errors.role?.message}
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
    </div>
  );
};
