import { z } from "zod";
import { isWhatsAppWithAreaCode, quoteEndDateKind, quoteEventRange, todayISO } from "../utils/quoteSubmission";

// Auditoria do orçamento (12/11/2026), O25: sem resposta pré-marcada; "Não sei" é uma resposta.
const logisticsAnswer = z.enum(["yes", "no", "unknown"], { error: "Escolha Sim, Não ou Não sei." });

const quoteRequestShape = z.object({
  venue: z.string().min(1, "O local do evento é obrigatório"),
  eventDate: z.string().min(1, "A data do evento é obrigatória"),
  // O6: início e término do evento (como no briefing); a montagem é outro campo, opcional.
  startTime: z.string().min(1, "Informe a hora de início do evento"),
  endTime: z.string().min(1, "Informe a hora de término do evento"),
  // Evento (ou aluguel por diária) de mais de um dia: a data do término, opcional.
  endDate: z.string().optional(),
  setupTime: z.string().optional(),
  zipCode: z.string().min(1, "O CEP é obrigatório"),
  street: z.string().min(1, "A rua é obrigatória"),
  addressNumber: z.string().min(1, "O número é obrigatório"),
  addressComplement: z.string().optional(),
  neighborhood: z.string().min(1, "O bairro é obrigatório"),
  city: z.string().min(1, "A cidade é obrigatória"),
  state: z.string().min(1, "O estado é obrigatório"),
  requiresStairs: logisticsAnswer,
  isCovered: logisticsAnswer,
  hasParking: logisticsAnswer,
  notes: z.string().optional(),
  name: z.string().optional(),
  // O26: WhatsApp obrigatório, com DDD, como no briefing (sem ele o e-mail ia parar no telefone do cliente).
  phone: z.string().refine(isWhatsAppWithAreaCode, "Informe o WhatsApp com DDD."),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
});

/**
 * O formulário do /orcamento. `guest`: quem pede sem conta informa nome e e-mail (antes o nome em branco só voltava
 * do servidor, com um erro genérico). As regras de data rodam mesmo com outros campos em branco (`when`), para o
 * erro aparecer junto com os outros.
 */
export function buildQuoteRequestSchema({ guest, now }: { guest: boolean; now?: () => Date }) {
  return quoteRequestShape.superRefine(
    (data, ctx) => {
      const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
      if (guest) {
        if (text(data.name).length < 2) ctx.addIssue({ code: "custom", path: ["name"], message: "Informe seu nome." });
        if (!text(data.email)) ctx.addIssue({ code: "custom", path: ["email"], message: "Informe seu e-mail. É por ele que você acompanha o pedido." });
      }
      // O26: data passada era aceita no site e recusada no servidor.
      const current = now ? now() : new Date();
      const date = text(data.eventDate);
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date < todayISO(current)) {
        ctx.addIssue({ code: "custom", path: ["eventDate"], message: "Essa data já passou. Escolha a data do evento." });
        return;
      }
      const endDateKind = quoteEndDateKind(data);
      if (endDateKind === "before") {
        ctx.addIssue({ code: "custom", path: ["endDate"], message: "A data do término não pode ser antes da data do evento." });
        return;
      }
      if (endDateKind === "none" && text(data.startTime) && text(data.startTime) === text(data.endTime)) {
        ctx.addIssue({ code: "custom", path: ["endTime"], message: "O término precisa ser depois do início." });
        return;
      }
      const range = quoteEventRange(data);
      if (!range) return;
      if (range.start <= current) {
        ctx.addIssue({ code: "custom", path: ["startTime"], message: "Esse horário de hoje já passou." });
      }
      if (range.setup && range.setup >= range.start) {
        ctx.addIssue({ code: "custom", path: ["setupTime"], message: "A montagem precisa começar antes do início do evento." });
      }
    },
    { when: () => true },
  );
}

/** O formulário de quem já entrou na conta (o tipo dos campos é o mesmo para os dois casos). */
export const quoteRequestSchema = buildQuoteRequestSchema({ guest: false });
