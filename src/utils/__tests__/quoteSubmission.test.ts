import { describe, it, expect } from 'vitest';
import { GUEST_QUOTE_MESSAGE, quoteSuccessMessage } from '../quoteSubmission';

// Checkout de convidado com e-mail que já tem conta: o backend aceita o pedido nessa conta
// mas não autentica ninguém (correção de segurança) — a pessoa precisa saber que deve entrar
// na conta para acompanhar, senão "Minhas Reservas" pede login sem explicação.
describe('quoteSuccessMessage', () => {
  // Onda 4 da auditoria de 19/11 (F8-13, decisão de 24/11): sem login, o mesmo texto com ou sem cadastro (não revela se o e-mail tem conta).
  it('sem login: o mesmo texto para e-mail com cadastro e para acesso criado agora', () => {
    expect(quoteSuccessMessage({ existingAccount: true })).toBe(GUEST_QUOTE_MESSAGE);
    expect(quoteSuccessMessage({ id: 'b1', user: { id: 'u1' } }, true)).toBe(GUEST_QUOTE_MESSAGE);
    expect(GUEST_QUOTE_MESSAGE).not.toMatch(/já tem cadastro|criamos seu acesso com/i);
  });

  it('mantém a mensagem de sempre nos demais casos', () => {
    const padrao = 'Seu pedido de orçamento foi enviado com sucesso.';
    expect(quoteSuccessMessage({ id: 'b1' })).toBe(padrao);
    expect(quoteSuccessMessage(null)).toBe(padrao);
    expect(quoteSuccessMessage(undefined)).toBe(padrao);
  });
});
