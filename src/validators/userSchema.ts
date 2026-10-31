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

export const profileUpdateSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres").optional(),
  email: z.string().email("E-mail inválido").optional(),
  password: z
    .string()
    .min(6, "A senha deve ter pelo menos 6 caracteres")
    .optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url("URL do avatar inválida").optional(),
  role: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  socialLinks: z.any().optional(),
  verified: z.boolean().optional(),
  profileSettings: z.any().optional(),
});

export const userRegisterSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  phone: z.string().min(1, "O telefone é obrigatório"),
});

export const userLoginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});
