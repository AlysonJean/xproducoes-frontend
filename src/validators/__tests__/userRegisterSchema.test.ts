import { describe, it, expect } from 'vitest';
import { userRegisterSchema } from '../userSchema';

// O formulário de cadastro (RegisterPage, via zodResolver) aceitava qualquer senha com 6+
// caracteres, mas a API exige 8+ com maiúscula, minúscula e número — "abcdef" passava na tela
// e voltava recusada pelo servidor com um erro genérico ("Dados de entrada inválidos").
const base = { name: 'Fulano de Tal', email: 'fulano@teste.com', phone: '31999999999' };

describe('userRegisterSchema — mesmas regras de senha da API', () => {
  it.each(['abcdef', 'abcdefgh', 'ABCDEFG1', 'abcdefg1', 'Abcdefgh'])('recusa "%s"', (password) => {
    expect(userRegisterSchema.safeParse({ ...base, password }).success).toBe(false);
  });

  it('aceita senha com 8+, maiúscula, minúscula e número', () => {
    expect(userRegisterSchema.safeParse({ ...base, password: 'Senha123' }).success).toBe(true);
  });

  it('diz qual regra faltou', () => {
    const result = userRegisterSchema.safeParse({ ...base, password: 'abcdefgh' });
    const messages = result.success ? [] : result.error.issues.map((i) => i.message);
    expect(messages.join(' ')).toMatch(/maiúscula/);
  });
});
