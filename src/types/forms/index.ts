// ================================
// INTERFACES PARA MENSAGENS E WHATSAPP
// ================================

export type QuoteMessageParams = {
  bookingId?: string;
  user?: { name?: string; phone?: string } | null;
  venue: string;
  eventDate: Date;
  durationHours: number;
  address: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    complement?: string;
  };
  items: Array<{ name?: string } | { equipment?: { name?: string } }>;
  notes?: string;
  logistics: {
    requiresStairs?: boolean;
    isCovered?: boolean;
    hasParking?: boolean;
  };
  /** As respostas de acesso como o cliente marcou (utils/requestAnswers); quando vêm, valem no lugar de logistics. */
  access?: Array<{ label: string; value: string }>;
  locale?: string;
};
