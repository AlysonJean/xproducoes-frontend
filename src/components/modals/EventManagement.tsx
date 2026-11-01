import React, { useState, useMemo } from 'react';
import type { ICollaborator, EventAssignment, SelectedCollaboratorAssignment } from '../../types/types';
import { ECollaboratorRole } from '../../types/types';
import type { Event } from '../../types/domains/dashboard';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Search, X, Calendar, MapPin, Inbox, Plus, Trash2 } from 'lucide-react';
import { formatPrice, toNumber } from '../../utils/typeSafeFormatters';
import { COLLABORATOR_ROLE_OPTIONS } from '../../utils/collaboratorRoles';

interface EventManagementProps {
  event: Event;
  collaborators: ICollaborator[];
  onSave: (assignments: EventAssignment[]) => void;
  onClose: () => void;
}

// Achado (auditoria do design system):
// - Havia uma seção "Comprovantes de Pagamento" com dados fictícios fixos (João Silva R$ 1.250,00,
//   Maria Santos R$ 800,00, datas de 2025) e botões "Adicionar Comprovante"/"Visualizar"/"Baixar" sem
//   ação, numa tela real do admin. Removida — não há comprovantes por colaborador no backend.
// - A lista de funções tinha "Produtor", que o backend não conhece (o salvamento falhava); agora usa
//   o enum real (utils/collaboratorRoles).
// - "Adicionar" só aparecia no hover (sumia no toque e no teclado); campos crus viraram Input/Select.
export const EventManagement: React.FC<EventManagementProps> = ({
  event,
  collaborators = [],
  onSave,
  onClose,
}) => {
  const [selectedCollaborators, setSelectedCollaborators] = useState<
    Record<string, SelectedCollaboratorAssignment>
  >({});
  const [draggedCollaborator, setDraggedCollaborator] = useState<ICollaborator | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar colaboradores disponíveis baseado na busca
  const availableCollaborators = useMemo(() => {
    return collaborators.filter(collaborator =>
      collaborator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (collaborator.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [collaborators, searchTerm]);

  // Calcular totais
  const totals = useMemo(() => {
    const assignments = Object.values(selectedCollaborators);
    const totalHours = assignments.reduce((sum, item) => sum + item.estimatedHours, 0);
    const totalCost = assignments.reduce((sum, item) => sum + (toNumber(item.hourlyRate) * item.estimatedHours), 0);
    const totalCollaborators = assignments.length;
    return { totalHours, totalCost, totalCollaborators };
  }, [selectedCollaborators]);

  const handleAddCollaborator = (collaborator: ICollaborator) => {
    setSelectedCollaborators((prev) => ({
      ...prev,
      [collaborator.id]: {
        collaborator,
        role: ECollaboratorRole.PHOTOGRAPHER,
        hourlyRate: collaborator.hourlyRate || 50,
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

  const handleDragStart = (collaborator: ICollaborator) => {
    setDraggedCollaborator(collaborator);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedCollaborator) {
      handleAddCollaborator(draggedCollaborator);
      setDraggedCollaborator(null);
    }
  };

  const handleSave = () => {
    const newAssignments: EventAssignment[] = Object.values(selectedCollaborators).map((item) => ({
      id: `assignment-${item.collaborator.id}`,
      collaboratorId: item.collaborator.id,
      role: item.role,
      estimatedHours: item.estimatedHours,
      hourlyRate: item.hourlyRate,
    }));
    onSave(newAssignments);
  };

  const updateAssignment = <K extends keyof SelectedCollaboratorAssignment>(
    collaboratorId: string,
    field: K,
    value: SelectedCollaboratorAssignment[K],
  ) => {
    setSelectedCollaborators((prev) => ({
      ...prev,
      [collaboratorId]: { ...prev[collaboratorId], [field]: value },
    }));
  };

  const selectedCount = Object.keys(selectedCollaborators).length;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      showCloseButton={false} // Cabeçalho próprio tem o botão de fechar
      ariaLabel={`Gerenciar colaboradores — ${event.title}`}
      className="max-w-6xl overflow-hidden flex flex-col h-[90vh]"
      bodyClassName="p-0 flex flex-col flex-1 min-h-0"
    >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Gerenciar Colaboradores</h2>
              <p className="text-primary-foreground/80 mt-1">{event.title}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground"
              aria-label="Fechar"
            >
              <X className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-primary-foreground/80">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              {event.startDate ? new Date(event.startDate).toLocaleDateString('pt-BR') : 'Data não definida'}
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" aria-hidden="true" />
              {event.location || 'Local não definido'}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-background">
          {/* Search */}
          <div className="mb-6">
            <Input
              type="search"
              aria-label="Buscar colaboradores por nome ou e-mail"
              placeholder="Buscar colaboradores por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-5 h-5" aria-hidden="true" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de colaboradores disponíveis */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Colaboradores Disponíveis</h3>
                <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {availableCollaborators.length}
                </span>
              </div>

              <div
                className="space-y-3 max-h-96 overflow-y-auto p-4 border-2 border-dashed border-border rounded-xl bg-muted/30 hover:border-primary/40 transition-colors"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {availableCollaborators.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Inbox className="w-12 h-12 mx-auto mb-4 text-muted-foreground/60" aria-hidden="true" />
                    <p>Nenhum colaborador encontrado</p>
                  </div>
                ) : (
                  availableCollaborators.map((collaborator) => (
                    <div
                      key={collaborator.id}
                      draggable
                      onDragStart={() => handleDragStart(collaborator)}
                      className="flex items-center justify-between gap-3 p-4 bg-card rounded-lg shadow-sm border border-border hover:shadow-md transition-all cursor-move group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-primary-foreground font-semibold" aria-hidden="true">
                          {collaborator.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{collaborator.name}</p>
                          <p className="text-sm text-muted-foreground truncate">{collaborator.user?.email || 'E-mail não disponível'}</p>
                          {collaborator.hourlyRate && (
                            <p className="text-xs text-success font-medium">{formatPrice(collaborator.hourlyRate)}/h</p>
                          )}
                        </div>
                      </div>
                      {/* Visível sempre no toque/celular; no desktop aparece no hover ou no foco do teclado. */}
                      <Button
                        type="button"
                        size="xs"
                        onClick={() => handleAddCollaborator(collaborator)}
                        leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}
                        aria-label={`Adicionar ${collaborator.name} à equipe`}
                        className="shrink-0 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        Adicionar
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Colaboradores selecionados */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Equipe Selecionada</h3>
                <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {totals.totalCollaborators}
                </span>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {selectedCount === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl bg-muted/30">
                    <Plus className="w-12 h-12 mx-auto mb-4 text-muted-foreground/60" aria-hidden="true" />
                    <p>Arraste colaboradores aqui ou clique em "Adicionar"</p>
                  </div>
                ) : (
                  Object.entries(selectedCollaborators).map(([id, assignment]) => (
                    <div key={id} className="bg-card rounded-lg shadow-sm border border-border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 shrink-0 bg-gradient-to-br from-success to-success/80 rounded-full flex items-center justify-center text-success-foreground font-semibold text-sm" aria-hidden="true">
                            {assignment.collaborator.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{assignment.collaborator.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{assignment.collaborator.user?.email}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCollaborator(id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          aria-label={`Remover ${assignment.collaborator.name} da equipe`}
                        >
                          <Trash2 className="w-5 h-5" aria-hidden="true" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Select
                          label="Função"
                          size="xs"
                          value={assignment.role}
                          onChange={(e) => updateAssignment(id, 'role', e.target.value as ECollaboratorRole)}
                          aria-label={`Função de ${assignment.collaborator.name}`}
                          options={COLLABORATOR_ROLE_OPTIONS}
                        />
                        <Input
                          label="Horas"
                          size="xs"
                          type="number"
                          min="1"
                          max="24"
                          value={assignment.estimatedHours}
                          onChange={(e) => updateAssignment(id, 'estimatedHours', parseInt(e.target.value) || 0)}
                          aria-label={`Horas estimadas de ${assignment.collaborator.name}`}
                        />
                        <Input
                          label="Valor/hora (R$)"
                          size="xs"
                          type="number"
                          min="0"
                          step="0.01"
                          value={assignment.hourlyRate}
                          onChange={(e) => updateAssignment(id, 'hourlyRate', parseFloat(e.target.value) || 0)}
                          aria-label={`Valor/hora (R$) de ${assignment.collaborator.name}`}
                        />
                      </div>

                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Total estimado:</span>
                          <span className="font-semibold text-success">
                            {formatPrice(toNumber(assignment.hourlyRate) * assignment.estimatedHours)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Resumo */}
          {selectedCount > 0 && (
            <div className="mt-6 bg-primary/5 rounded-xl p-4 border border-primary/20">
              <h4 className="font-semibold text-foreground mb-3">Resumo da Equipe</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{totals.totalCollaborators}</div>
                  <div className="text-sm text-muted-foreground">Colaboradores</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{totals.totalHours}h</div>
                  <div className="text-sm text-muted-foreground">Horas Totais</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">{formatPrice(totals.totalCost)}</div>
                  <div className="text-sm text-muted-foreground">Custo Total</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-muted/50 px-6 py-4 border-t border-border flex flex-wrap justify-between items-center gap-3 shrink-0">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={selectedCount === 0}
          >
            Salvar Equipe ({selectedCount})
          </Button>
        </div>
    </Modal>
  );
};
