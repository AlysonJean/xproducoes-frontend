import { z } from "zod";

// Mesmas regras do passwordSchema da API (backend/src/schemas/auth.schema.ts): senha que
// passa aqui não volta recusada pelo servidor com um erro genérico.
export const strongPasswordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .max(100, "Senha muito longa")
  .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
  .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
  .regex(/[0-9]/, "A senha deve conter pelo menos um número");

export const userRegisterSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: strongPasswordSchema,
  phone: z.string().min(1, "O telefone é obrigatório"),
});
