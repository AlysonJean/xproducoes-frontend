import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Clock,
} from 'lucide-react';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { SimpleCard } from '../../components/ui/Cards';
import { collaboratorProfileAPI } from '../../services/api';

interface Availability {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'BUSY' | 'OFF_DUTY';
  notes?: string;
}

const CollaboratorAvailabilityPage: React.FC = () => {
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAvailability, setNewAvailability] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    status: 'AVAILABLE' as const,
    notes: ''
  });

  const loadAvailabilities = async () => {
    try {
      setLoading(true);
      const response = await collaboratorProfileAPI.getAvailability();
      const data = response.data?.data ?? response.data;
      if (Array.isArray(data)) {
        setAvailabilities(data);
      }
    } catch (error) {
      console.error('Erro ao carregar disponibilidades:', error);
      alert('Erro ao carregar disponibilidades.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailabilities();
  }, []);

  const handleAddAvailability = async () => {
    try {
      if (!newAvailability.date || !newAvailability.startTime || !newAvailability.endTime) {
        alert('Preencha todos os campos obrigatórios.');
        return;
      }

      await collaboratorProfileAPI.updateAvailability({
        startDate: newAvailability.date, // O controller espera startDate ou date
        startTime: newAvailability.startTime,
        endTime: newAvailability.endTime,
        status: newAvailability.status,
        notes: newAvailability.notes
      });
      
      alert('Disponibilidade adicionada!');
      setShowAddForm(false);
      loadAvailabilities();
    } catch (error) {
      console.error('Erro ao adicionar:', error);
      alert('Erro ao adicionar disponibilidade.');
    }
  };

  const statusColors: Record<string, string> = {
    AVAILABLE: 'text-green-600 bg-green-100',
    BUSY: 'text-red-600 bg-red-100',
    OFF_DUTY: 'text-gray-600 bg-gray-100'
  };

  const statusLabels: Record<string, string> = {
    AVAILABLE: 'Disponível',
    BUSY: 'Ocupado',
    OFF_DUTY: 'Folga'
  };

  return (
    <CollaboratorLayout
      title="Disponibilidade"
      breadcrumbs={[
        { name: 'Colaborador', href: '/collaborator' },
        { name: 'Disponibilidade' }
      ]}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Gerenciar Disponibilidade</h2>
            <button 
                onClick={() => setShowAddForm(true)}
                className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
            >
                <Plus className="w-4 h-4" />
                <span>Nova Data</span>
            </button>
        </div>

        {showAddForm && (
            <SimpleCard title="Adicionar Disponibilidade">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Data</label>
                        <input 
                            type="date"
                            aria-label="Data da disponibilidade"
                            value={newAvailability.date}
                            onChange={(e) => setNewAvailability({...newAvailability, date: e.target.value})}
                            className="w-full border rounded-md px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Status</label>
                        <select
                            aria-label="Status da disponibilidade"
                            value={newAvailability.status}
                            onChange={(e) => setNewAvailability({...newAvailability, status: e.target.value as any})}
                            className="w-full border rounded-md px-3 py-2"
                        >
                            <option value="AVAILABLE">Disponível</option>
                            <option value="BUSY">Ocupado</option>
                            <option value="OFF_DUTY">Folga</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Início</label>
                        <input
                            type="time"
                            aria-label="Hora de início"
                            value={newAvailability.startTime}
                            onChange={(e) => setNewAvailability({...newAvailability, startTime: e.target.value})}
                            className="w-full border rounded-md px-3 py-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Fim</label>
                        <input
                            type="time"
                            aria-label="Hora de fim"
                            value={newAvailability.endTime}
                            onChange={(e) => setNewAvailability({...newAvailability, endTime: e.target.value})}
                            className="w-full border rounded-md px-3 py-2"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Notas</label>
                        <input 
                            type="text"
                            value={newAvailability.notes}
                            onChange={(e) => setNewAvailability({...newAvailability, notes: e.target.value})}
                            className="w-full border rounded-md px-3 py-2"
                            placeholder="Ex: Disponível apenas tarde"
                        />
                    </div>
                </div>
                <div className="mt-4 flex space-x-2">
                    <button 
                        onClick={handleAddAvailability}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
                    >
                        Salvar
                    </button>
                    <button 
                        onClick={() => setShowAddForm(false)}
                        className="bg-muted text-muted-foreground px-4 py-2 rounded-md hover:bg-muted/80"
                    >
                        Cancelar
                    </button>
                </div>
            </SimpleCard>
        )}

        <SimpleCard title="Próximas Disponibilidades">
            {loading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : availabilities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhuma disponibilidade cadastrada.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                                <th className="py-3 px-4">Data</th>
                                <th className="py-3 px-4">Horário</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Notas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {availabilities.map((item) => (
                                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center space-x-2">
                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                            <span>{new Date(item.date).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center space-x-2 text-sm">
                                            <Clock className="w-4 h-4 text-muted-foreground" />
                                            <span>{item.startTime} - {item.endTime}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.status]}`}>
                                            {statusLabels[item.status]}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-muted-foreground">{item.notes || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </SimpleCard>
      </div>
    </CollaboratorLayout>
  );
};

export default CollaboratorAvailabilityPage;
