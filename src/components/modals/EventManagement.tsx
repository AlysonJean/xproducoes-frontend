import React, { useState } from 'react';
import type { ICollaborator, EventAssignment, SelectedCollaboratorAssignment } from '../../types/types';
import { ECollaboratorRole } from '../../types/types';

import type { Event } from '../../types/types';

interface EventManagementProps {
  event: Event;
  collaborators: ICollaborator[];
  onSave: (assignments: EventAssignment[]) => void;
  onClose: () => void;
}

export const EventManagement: React.FC<EventManagementProps> = ({
  event,
  collaborators = [],
  onSave,
  onClose,
}) => {
  const [selectedCollaborators, setSelectedCollaborators] = useState<
    Record<string, SelectedCollaboratorAssignment>
  >({});

  const handleAddCollaborator = (collaborator: ICollaborator) => {
    setSelectedCollaborators((prev) => ({
      ...prev,
      [collaborator.id]: {
        collaborator,
        role: ECollaboratorRole.PHOTOGRAPHER,
        hourlyRate: 50,
        estimatedHours: 4,
      },
    }));
  };

  const handleRemoveCollaborator = (collaboratorId: string) => {
    setSelectedCollaborators((prev) => {
      const newState = { ...prev };
      delete newState[collaboratorId];
      return newState;
    });
  };

  const handleSave = () => {
    const newAssignments: EventAssignment[] = Object.values(selectedCollaborators).map((item) => ({
      id: `assignment-${item.collaborator.id}`,
      collaboratorId: item.collaborator.id,
      role: item.role,
      estimatedHours: item.estimatedHours,
    }));
    onSave(newAssignments);
  };

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-primary">
            Gerenciar Colaboradores - {event.title}
          </h2>
          <p className="text-tertiary mt-2">
            {event.startDate ? new Date(event.startDate).toLocaleDateString('pt-BR') : 'Data não definida'} • {event.location}
          </p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de colaboradores disponíveis */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Colaboradores Disponíveis</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {collaborators.map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="flex items-center justify-between p-3 bg-surface-alt rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{collaborator.name}</p>
                      <p className="text-sm text-tertiary">
                        {collaborator.user?.email || 'Email não disponível'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddCollaborator(collaborator)}
                      className="px-3 py-1 bg-accent text-white rounded hover:bg-accent/80"
                    >
                      Adicionar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Colaboradores selecionados */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Colaboradores Selecionados</h3>
              <div className="space-y-2">
                {Object.entries(selectedCollaborators).map(([id, assignment]) => (
                  <div key={id} className="p-3 bg-accent/10 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{assignment.collaborator.name}</p>
                      <button
                        onClick={() => handleRemoveCollaborator(id)}
                        className="text-error hover:text-error/80"
                      >
                        Remover
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="Horas estimadas"
                        title="Horas estimadas"
                        aria-label="Horas estimadas"
                        value={assignment.estimatedHours}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const newValue = parseInt(e.target.value) || 0;
                          setSelectedCollaborators((prev) => ({
                            ...prev,
                            [id]: { ...prev[id], estimatedHours: newValue },
                          }));
                        }}
                        className="px-2 py-1 border rounded"
                      />
                      <input
                        type="number"
                        placeholder="Taxa/hora"
                        title="Taxa/hora"
                        aria-label="Taxa/hora"
                        value={assignment.hourlyRate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const newValue = parseInt(e.target.value) || 0;
                          setSelectedCollaborators((prev) => ({
                            ...prev,
                            [id]: { ...prev[id], hourlyRate: newValue },
                          }));
                        }}
                        className="px-2 py-1 border rounded"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-tertiary hover:text-primary">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-accent text-white rounded hover:bg-accent/80"
          >
            Salvar Mudanças
          </button>
        </div>
      </div>
    </div>
  );
};
