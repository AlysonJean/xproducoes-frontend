// src/contexts/collaboratorContextBase.ts
import { createContext } from 'react';
import type {
  Collaborator,
  EventCollaborator,
  CollaboratorAvailability,
  CollaboratorPayment,
} from '../types/types';

export interface CollaboratorContextType {
  // Estado
  collaborators: Collaborator[];
  eventCollaborators: EventCollaborator[];
  events: EventCollaborator[]; // Para eventos específicos do colaborador logado
  availabilities: CollaboratorAvailability[];
  payments: CollaboratorPayment[];
  currentCollaborator: Collaborator | null;
  isLoading: boolean;
  error: string | null;

  // Login/Auth de Colaboradores
  loginCollaborator: (email: string, password: string) => Promise<boolean>;
  logoutCollaborator: () => void;
  updateCollaboratorProfile: (data: Partial<Collaborator>) => Promise<void>;
  fetchCollaboratorEvents: (collaboratorId: string) => Promise<void>;

  // Ações de Colaboradores
  createCollaborator: (data: Partial<Collaborator>) => Promise<Collaborator>;
  updateCollaborator: (id: string, data: Partial<Collaborator>) => Promise<Collaborator>;
  deleteCollaborator: (id: string) => Promise<void>;
  fetchCollaborators: () => Promise<void>;
  getCollaboratorById?: (id: string) => Promise<Collaborator>;
  getCollaboratorStats: (id: string, period?: { start: string; end: string }) => Promise<unknown>;

  // Disponibilidades
  setAvailability: (data: Partial<CollaboratorAvailability>) => Promise<CollaboratorAvailability>;
  getAvailableCollaborators: (date: string, role?: string) => Promise<Collaborator[]>;

  // Eventos de colaboradores
  assignCollaboratorToEvent: (data: Partial<EventCollaborator>) => Promise<EventCollaborator>;
  updateEventCollaborator: (
    id: string,
    data: Partial<EventCollaborator>
  ) => Promise<EventCollaborator>;
  removeCollaboratorFromEvent: (id: string) => Promise<void>;
  rateCollaborator: (id: string, rating: number, feedback?: string) => Promise<void>;

  // Pagamentos
  createPayment: (data: Partial<CollaboratorPayment>) => Promise<CollaboratorPayment>;
  updatePaymentStatus: (id: string, status: string) => Promise<void>;

  // Filtros e Busca
  searchCollaborators: (query: string) => void;
  filterByRole: (role: string) => void;
  filterByStatus: (status: string) => void;
  resetFilters: () => void;
}

// Criar o contexto e exportá-lo
export const CollaboratorContext = createContext<CollaboratorContextType | undefined>(undefined);
