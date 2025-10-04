import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Calendar, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X,
  CheckCircle
} from 'lucide-react';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { SimpleCard } from '../../components/ui/Cards';

interface TimeSlot {
  id: string;
  dayOfWeek: number; // 0 = Domingo, 1 = Segunda, ...
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  isBlocked: boolean;
}

interface SpecialDate {
  id: string;
  date: string;
  type: 'available' | 'blocked';
  startTime?: string;
  endTime?: string;
  note?: string;
}

interface AvailabilityData {
  weeklySchedule: TimeSlot[];
  specialDates: SpecialDate[];
  workingHours: {
    totalHours: number;
    averagePerDay: number;
  };
  nextEvents: Array<{
    date: string;
    time: string;
    type: string;
    client: string;
  }>;
}

const DAYS_OF_WEEK = [
  'Domingo',
  'Segunda-feira', 
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

const CollaboratorAvailabilityPage: React.FC = () => {
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(1);

  useEffect(() => {
    // Simular carregamento de dados
    const timer = setTimeout(() => {
      setAvailabilityData({
        weeklySchedule: [
          { id: '1', dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isRecurring: true, isBlocked: false },
          { id: '2', dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isRecurring: true, isBlocked: false },
          { id: '3', dayOfWeek: 3, startTime: '09:00', endTime: '17:00', isRecurring: true, isBlocked: false },
          { id: '4', dayOfWeek: 4, startTime: '09:00', endTime: '17:00', isRecurring: true, isBlocked: false },
          { id: '5', dayOfWeek: 5, startTime: '09:00', endTime: '17:00', isRecurring: true, isBlocked: false },
          { id: '6', dayOfWeek: 6, startTime: '09:00', endTime: '13:00', isRecurring: true, isBlocked: false },
        ],
        specialDates: [
          { id: '1', date: '2024-03-15', type: 'blocked', note: 'Viagem pessoal' },
          { id: '2', date: '2024-03-22', type: 'available', startTime: '14:00', endTime: '18:00', note: 'Horário especial' },
        ],
        workingHours: {
          totalHours: 44,
          averagePerDay: 7.3
        },
        nextEvents: [
          { date: '2024-03-10', time: '10:00', type: 'Casamento', client: 'Maria Silva' },
          { date: '2024-03-12', time: '14:00', type: 'Aniversário', client: 'João Santos' },
          { date: '2024-03-15', time: '16:00', type: 'Formatura', client: 'Ana Costa' },
        ]
      });
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleAddTimeSlot = () => {
    const newSlot: TimeSlot = {
      id: Date.now().toString(),
      dayOfWeek: selectedDay,
      startTime: '09:00',
      endTime: '17:00',
      isRecurring: true,
      isBlocked: false
    };
    
    if (availabilityData) {
      setAvailabilityData({
        ...availabilityData,
        weeklySchedule: [...availabilityData.weeklySchedule, newSlot]
      });
    }
    
    setShowAddForm(false);
  };

  const handleEditSlot = (slot: TimeSlot) => {
    setEditingSlot({ ...slot });
  };

  const handleSaveSlot = () => {
    if (editingSlot && availabilityData) {
      const updatedSchedule = availabilityData.weeklySchedule.map(slot =>
        slot.id === editingSlot.id ? editingSlot : slot
      );
      
      setAvailabilityData({
        ...availabilityData,
        weeklySchedule: updatedSchedule
      });
      
      setEditingSlot(null);
    }
  };

  const handleDeleteSlot = (slotId: string) => {
    if (availabilityData) {
      const updatedSchedule = availabilityData.weeklySchedule.filter(slot => slot.id !== slotId);
      setAvailabilityData({
        ...availabilityData,
        weeklySchedule: updatedSchedule
      });
    }
  };

  const getSlotsByDay = (dayOfWeek: number) => {
    return availabilityData?.weeklySchedule.filter(slot => slot.dayOfWeek === dayOfWeek) || [];
  };

  if (loading) {
    return (
      <CollaboratorLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando horários...</p>
          </div>
        </div>
      </CollaboratorLayout>
    );
  }

  return (
    <CollaboratorLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Disponibilidade</h1>
            <p className="text-muted-foreground">Gerencie seus horários e disponibilidade</p>
          </div>
        </div>

        {/* Resumo da Disponibilidade */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SimpleCard 
            title="Horas Semanais"
            className="text-center"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 bg-muted rounded-lg text-muted-foreground">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {availabilityData?.workingHours.totalHours}h
              </div>
              <div className="text-sm text-muted-foreground">
                Média de {availabilityData?.workingHours.averagePerDay}h por dia
              </div>
            </div>
          </SimpleCard>

          <SimpleCard 
            title="Próximos Eventos"
            className="text-center"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 bg-muted rounded-lg text-muted-foreground">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {availabilityData?.nextEvents.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Agendamentos confirmados
              </div>
            </div>
          </SimpleCard>

          <SimpleCard 
            title="Status"
            className="text-center"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-2">
                <div className="p-2 bg-muted rounded-lg text-muted-foreground">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                Disponível
              </div>
              <div className="text-sm text-muted-foreground">
                Aceitando novos agendamentos
              </div>
            </div>
          </SimpleCard>
        </div>

        {/* Horário Semanal */}
        <SimpleCard title="Horário Semanal">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Configure seus horários de trabalho para cada dia da semana
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar Horário</span>
              </button>
            </div>

            {showAddForm && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <h3 className="font-medium mb-3">Novo Horário</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Dia da Semana</label>
                    <select 
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border rounded-md"
                      aria-label="Dia da semana"
                    >
                      {DAYS_OF_WEEK.map((day, index) => (
                        <option key={index} value={index}>{day}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Início</label>
                    <input 
                      type="time" 
                      defaultValue="09:00"
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fim</label>
                    <input 
                      type="time" 
                      defaultValue="17:00"
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div className="flex items-end space-x-2">
                    <button
                      onClick={handleAddTimeSlot}
                      className="flex items-center space-x-1 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                      <Save className="h-4 w-4" />
                      <span>Salvar</span>
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="flex items-center space-x-1 px-3 py-2 border rounded-md hover:bg-muted"
                      aria-label="Cancelar adição de horário"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {DAYS_OF_WEEK.map((dayName, dayIndex) => {
                const daySlots = getSlotsByDay(dayIndex);
                return (
                  <div key={dayIndex} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{dayName}</h3>
                      {daySlots.length === 0 && (
                        <span className="text-sm text-muted-foreground">Não disponível</span>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {daySlots.map((slot) => (
                        <div key={slot.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                          {editingSlot?.id === slot.id ? (
                            <div className="flex items-center space-x-4 flex-1">
                              <input
                                type="time"
                                value={editingSlot.startTime}
                                onChange={(e) => setEditingSlot({
                                  ...editingSlot,
                                  startTime: e.target.value
                                })}
                                className="px-2 py-1 border rounded text-sm"
                              />
                              <span>até</span>
                              <input
                                type="time"
                                value={editingSlot.endTime}
                                onChange={(e) => setEditingSlot({
                                  ...editingSlot,
                                  endTime: e.target.value
                                })}
                                className="px-2 py-1 border rounded text-sm"
                              />
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={handleSaveSlot}
                                  className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                                  aria-label="Salvar horário"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setEditingSlot(null)}
                                  className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                                  aria-label="Cancelar edição"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center space-x-4">
                                <span className="text-sm font-medium">
                                  {slot.startTime} - {slot.endTime}
                                </span>
                                {slot.isBlocked && (
                                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                    Bloqueado
                                  </span>
                                )}
                                {slot.isRecurring && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                    Recorrente
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleEditSlot(slot)}
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                  aria-label="Editar horário"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                                  aria-label="Excluir horário"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SimpleCard>

        {/* Datas Especiais */}
        <SimpleCard title="Datas Especiais">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure disponibilidade especial ou bloqueios para datas específicas
            </p>
            
            <div className="space-y-3">
              {availabilityData?.specialDates.map((specialDate) => (
                <div key={specialDate.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      specialDate.type === 'available' ? 'bg-emerald-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <div className="font-medium">
                        {new Date(specialDate.date).toLocaleDateString('pt-BR')}
                      </div>
                      {specialDate.startTime && specialDate.endTime && (
                        <div className="text-sm text-muted-foreground">
                          {specialDate.startTime} - {specialDate.endTime}
                        </div>
                      )}
                      {specialDate.note && (
                        <div className="text-sm text-muted-foreground">
                          {specialDate.note}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      specialDate.type === 'available' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {specialDate.type === 'available' ? 'Disponível' : 'Bloqueado'}
                    </span>
                    <button 
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                      aria-label="Editar data especial"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button 
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                      aria-label="Excluir data especial"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button className="flex items-center space-x-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:bg-muted/50 transition-colors w-full justify-center">
              <Plus className="h-4 w-4" />
              <span>Adicionar Data Especial</span>
            </button>
          </div>
        </SimpleCard>

        {/* Próximos Eventos */}
        <SimpleCard title="Próximos Eventos">
          <div className="space-y-3">
            {availabilityData?.nextEvents.map((event, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{event.type}</div>
                    <div className="text-sm text-muted-foreground">
                      {event.client}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-medium">
                    {new Date(event.date).toLocaleDateString('pt-BR')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {event.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SimpleCard>
      </div>
    </CollaboratorLayout>
  );
};

export default CollaboratorAvailabilityPage;