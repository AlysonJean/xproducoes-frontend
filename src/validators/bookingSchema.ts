// Caminho: backend/src/schemas/bookingSchema.ts

import { z } from "zod";
// Enums manuais para validação Zod
const bookingStatusEnum = [
  "DRAFT",
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
] as const;
const deliveryStatusEnum = [
  "PENDING",
  "PREPARING",
  "ON_THE_WAY",
  "ARRIVED",
  "SETUP_COMPLETE",
  "PICKUP_PENDING",
  "COMPLETED",
] as const;

export const bookingCreateSchema = z
  .object({
    userId: z.string().uuid().optional(),
    clientName: z.string().optional(),
    clientContact: z.string().optional(),

    kitId: z.string().uuid("ID do kit inválido").optional(),
    equipmentIds: z
      .array(z.string().uuid())
      .min(1, "Selecione pelo menos um equipamento")
      .optional(),

    eventDate: z.string().datetime({ message: "A data do evento é inválida." }),
    eventEndDate: z
      .string()
      .datetime({ message: "A data final do evento é inválida." }),

    // ... outros campos do formulário
    location: z.string(),
    street: z.string(),
    neighborhood: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    addressNumber: z.string(),
    addressComplement: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(bookingStatusEnum).optional(),
    deliveryStatus: z.enum(deliveryStatusEnum).optional(),
  })
  .refine(
    (data) => {
      // Garante que ou um utilizador registado ou um nome de cliente manual seja fornecido
      return !!data.userId || !!data.clientName;
    },
    {
      message:
        "É necessário associar a reserva a um cliente (registado ou manual).",
      path: ["clientName"],
    },
  )
  .refine(
    (data) => {
      return (
        !!data.kitId ||
        (Array.isArray(data.equipmentIds) && data.equipmentIds.length > 0)
      );
    },
    {
      message: "É necessário fornecer um kit ou uma lista de equipamentos.",
      path: ["kitId"],
    },
  );
