import { z } from "zod";

export const quoteRequestSchema = z.object({
  venue: z.string().min(1, "O local do evento é obrigatório"),
  eventDate: z.string().min(1, "A data do evento é obrigatória"),
  startTime: z.string().min(1, "A hora de início é obrigatória"),
  duration: z.coerce.number().min(0.5, "A duração deve ser de pelo menos 30 minutos"),
  zipCode: z.string().min(1, "O CEP é obrigatório"),
  street: z.string().min(1, "A rua é obrigatória"),
  addressNumber: z.string().min(1, "O número é obrigatório"),
  addressComplement: z.string().optional(),
  neighborhood: z.string().min(1, "O bairro é obrigatório"),
  city: z.string().min(1, "A cidade é obrigatória"),
  state: z.string().min(1, "O estado é obrigatório"),
  requiresStairs: z.enum(["yes", "no"]),
  isCovered: z.enum(["yes", "no"]),
  hasParking: z.enum(["yes", "no"]),
  notes: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
});
