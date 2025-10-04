import React, { useState, useMemo } from 'react';
import type { ICollaborator, EventAssignment, SelectedCollaboratorAssignment } from '../../types/types';
import { ECollaboratorRole } from '../../types/types';
import type { Event } from '../../types/domains/dashboard';

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
  const [draggedCollaborator, setDraggedCollaborator] = useState<ICollaborator | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteProofModal, setShowDeleteProofModal] = useState(false);
  const [proofToDelete, setProofToDelete] = useState<string | null>(null);

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
    const totalCost = assignments.reduce((sum, item) => sum + (item.hourlyRate * item.estimatedHours), 0);
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
    }));
    onSave(newAssignments);
  };

  const updateAssignment = (collaboratorId: string, field: keyof SelectedCollaboratorAssignment, value: any) => {
    setSelectedCollaborators((prev) => ({
      ...prev,
      [collaboratorId]: { ...prev[collaboratorId], [field]: value },
    }));
  };

  const handleDeleteProof = (proofId: string) => {
    setProofToDelete(proofId);
    setShowDeleteProofModal(true);
  };

  const confirmDeleteProof = () => {
    if (proofToDelete) {
      // Aqui seria chamada a API para excluir o comprovante
      console.log('Excluindo comprovante:', proofToDelete);
      // Por enquanto, apenas fecha o modal
      setShowDeleteProofModal(false);
      setProofToDelete(null);
    }
  };

  const cancelDeleteProof = () => {
    setShowDeleteProofModal(false);
    setProofToDelete(null);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-border">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Gerenciar Colaboradores</h2>
              <p className="text-primary-foreground/80 mt-1">{event.title}</p>
            </div>
            <button
              onClick={onClose}
              className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full p-2 transition-colors"
              aria-label="Fechar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm text-primary-foreground/70">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {event.startDate ? new Date(event.startDate).toLocaleDateString('pt-BR') : 'Data não definida'}
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {event.location || 'Local não definido'}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar colaboradores por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-input bg-background rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
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
                className="space-y-3 max-h-96 overflow-y-auto p-4 border-2 border-dashed border-muted rounded-xl bg-muted/30 hover:border-primary/40 transition-colors"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {availableCollaborators.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <svg className="w-12 h-12 mx-auto mb-4 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p>Nenhum colaborador encontrado</p>
                  </div>
                ) : (
                  availableCollaborators.map((collaborator) => (
                    <div
                      key={collaborator.id}
                      draggable
                      onDragStart={() => handleDragStart(collaborator)}
                      className="flex items-center justify-between p-4 bg-card rounded-lg shadow-sm border border-border hover:shadow-md transition-all cursor-move group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                          {collaborator.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{collaborator.name}</p>
                          <p className="text-sm text-muted-foreground">{collaborator.user?.email || 'Email não disponível'}</p>
                          {collaborator.hourlyRate && (
                            <p className="text-xs text-success font-medium">R$ {collaborator.hourlyRate}/h</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddCollaborator(collaborator)}
                        className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-all"
                      >
                        Adicionar
                      </button>
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
                {Object.keys(selectedCollaborators).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-muted rounded-xl bg-muted/30">
                    <svg className="w-12 h-12 mx-auto mb-4 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <p>Arraste colaboradores aqui ou clique em "Adicionar"</p>
                  </div>
                ) : (
                  Object.entries(selectedCollaborators).map(([id, assignment]) => (
                    <div key={id} className="bg-card rounded-lg shadow-sm border border-border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-success to-success/80 rounded-full flex items-center justify-center text-success-foreground font-semibold text-sm">
                            {assignment.collaborator.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{assignment.collaborator.name}</p>
                            <p className="text-sm text-muted-foreground">{assignment.collaborator.user?.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveCollaborator(id)}
                          className="text-destructive hover:text-destructive/80 p-1"
                          aria-label="Remover colaborador"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">Função</label>
                          <select
                            value={assignment.role}
                            onChange={(e) => updateAssignment(id, 'role', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-input bg-background rounded focus:ring-1 focus:ring-primary focus:border-transparent"
                            aria-label={`Função para ${assignment.collaborator.name}`}
                          >
                            <option value={ECollaboratorRole.PHOTOGRAPHER}>Fotógrafo</option>
                            <option value={ECollaboratorRole.ASSISTANT}>Assistente</option>
                            <option value={ECollaboratorRole.PRODUCER}>Produtor</option>
                            <option value={ECollaboratorRole.OTHER}>Outro</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">Horas</label>
                          <input
                            type="number"
                            min="1"
                            max="24"
                            value={assignment.estimatedHours}
                            onChange={(e) => updateAssignment(id, 'estimatedHours', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border border-input bg-background rounded focus:ring-1 focus:ring-primary focus:border-transparent"
                            aria-label={`Horas estimadas para ${assignment.collaborator.name}`}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">Valor/hora</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={assignment.hourlyRate}
                            onChange={(e) => updateAssignment(id, 'hourlyRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border border-input bg-background rounded focus:ring-1 focus:ring-primary focus:border-transparent"
                            aria-label={`Valor por hora para ${assignment.collaborator.name}`}
                          />
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Total estimado:</span>
                          <span className="font-semibold text-success">
                            R$ {(assignment.hourlyRate * assignment.estimatedHours).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Seção de Comprovantes */}
          {Object.keys(selectedCollaborators).length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Comprovantes de Pagamento</h3>
                <button className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-colors">
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Adicionar Comprovante
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Exemplo de comprovante - seria substituído por dados reais */}
                <div className="bg-card rounded-lg shadow-sm border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-info to-info/80 rounded-full flex items-center justify-center text-info-foreground">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">Comprovante_001.pdf</p>
                        <p className="text-xs text-muted-foreground">João Silva - Fotógrafo</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteProof('proof-001')}
                      className="text-destructive hover:text-destructive/80 p-1"
                      aria-label="Excluir comprovante"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="font-medium text-success">R$ 1.250,00</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Data:</span>
                      <span className="font-medium">15/09/2025</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium text-success">Aprovado</span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 px-3 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90 transition-colors">
                      Visualizar
                    </button>
                    <button className="flex-1 px-3 py-1 bg-secondary text-secondary-foreground text-xs rounded hover:bg-secondary/80 transition-colors">
                      Baixar
                    </button>
                  </div>
                </div>

                {/* Segundo comprovante de exemplo */}
                <div className="bg-card rounded-lg shadow-sm border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-warning to-warning/80 rounded-full flex items-center justify-center text-warning-foreground">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">Recibo_002.pdf</p>
                        <p className="text-xs text-muted-foreground">Maria Santos - Assistente</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteProof('proof-002')}
                      className="text-destructive hover:text-destructive/80 p-1"
                      aria-label="Excluir comprovante"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="font-medium text-success">R$ 800,00</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Data:</span>
                      <span className="font-medium">12/09/2025</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium text-warning">Pendente</span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 px-3 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90 transition-colors">
                      Visualizar
                    </button>
                    <button className="flex-1 px-3 py-1 bg-secondary text-secondary-foreground text-xs rounded hover:bg-secondary/80 transition-colors">
                      Baixar
                    </button>
                  </div>
                </div>

                {/* Estado vazio para quando não há comprovantes */}
                <div className="bg-card rounded-lg shadow-sm border-2 border-dashed border-muted p-4 flex items-center justify-center min-h-[140px]">
                  <div className="text-center text-muted-foreground">
                    <svg className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm">Nenhum comprovante</p>
                    <p className="text-xs">adicione um comprovante</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Resumo */}
          {Object.keys(selectedCollaborators).length > 0 && (
            <div className="mt-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-4 border border-primary/20">
              <h4 className="font-semibold text-foreground mb-3">Resumo da Equipe</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{totals.totalCollaborators}</div>
                  <div className="text-sm text-muted-foreground">Colaboradores</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary">{totals.totalHours}h</div>
                  <div className="text-sm text-muted-foreground">Horas Totais</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">R$ {totals.totalCost.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Custo Total</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-muted/50 px-6 py-4 border-t border-border flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={Object.keys(selectedCollaborators).length === 0}
            className="px-6 py-2 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-lg font-medium hover:from-primary/90 hover:to-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Salvar Equipe ({Object.keys(selectedCollaborators).length})
          </button>
        </div>
      </div>

      {/* Modal de Confirmação para Excluir Comprovante */}
      {showDeleteProofModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Excluir Comprovante</h3>
                  <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita</p>
                </div>
              </div>

              <p className="text-foreground mb-6">
                Tem certeza que deseja excluir este comprovante? Todos os dados associados serão perdidos permanentemente.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={cancelDeleteProof}
                  className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteProof}
                  className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
