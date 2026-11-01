// Funções de colaborador — espelha o enum CollaboratorRole do backend (prisma/schema.prisma).
// Achado (auditoria do design system): havia 4 listas diferentes no admin ("Fotógrafo",
// "Fotógrafo Líder", "Líder Fotógrafo"…), com valores que o backend não conhece (PRODUCER, EDITOR).
export const COLLABORATOR_ROLE_LABELS: Record<string, string> = {
  PHOTOGRAPHER: 'Fotógrafo',
  VIDEOGRAPHER: 'Cinegrafista',
  SOUND_TECHNICIAN: 'Técnico de som',
  LIGHTING_TECHNICIAN: 'Técnico de iluminação',
  DJ: 'DJ',
  PRESENTER: 'Apresentador',
  COORDINATOR: 'Coordenador',
  ASSISTANT: 'Assistente',
  SECURITY: 'Segurança',
  TRANSPORT: 'Transporte',
  OTHER: 'Outro',
};

export const COLLABORATOR_ROLE_OPTIONS = Object.entries(COLLABORATOR_ROLE_LABELS).map(
  ([value, label]) => ({ value, label })
);

export const collaboratorRoleLabel = (role?: string | null) =>
  (role && COLLABORATOR_ROLE_LABELS[role]) || role || '—';
