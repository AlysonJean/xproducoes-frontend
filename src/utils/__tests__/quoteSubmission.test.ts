import { describe, it, expect } from 'vitest';
import { quoteSuccessMessage } from '../quoteSubmission';

// Checkout de convidado com e-mail que já tem conta: o backend aceita o pedido nessa conta
// mas não autentica ninguém (correção de segurança) — a pessoa precisa saber que deve entrar
// na conta para acompanhar, senão "Minhas Reservas" pede login sem explicação.
describe('quoteSuccessMessage', () => {
  it('orienta a entrar na conta quando o e-mail já tem cadastro', () => {
    expect(quoteSuccessMessage({ existingAccount: true })).toMatch(/já tem cadastro.*entre na sua conta/i);
  });

  it('mantém a mensagem de sempre nos demais casos', () => {
    const padrao = 'Seu pedido de orçamento foi enviado com sucesso.';
    expect(quoteSuccessMessage({ id: 'b1' })).toBe(padrao);
    expect(quoteSuccessMessage(null)).toBe(padrao);
    expect(quoteSuccessMessage(undefined)).toBe(padrao);
  });
});
