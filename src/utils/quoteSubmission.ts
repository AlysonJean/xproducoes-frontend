// Mensagem de sucesso do envio de orçamento (QuoteRequestPage). No checkout de convidado
// com e-mail que já tem conta, o backend aceita o pedido nessa conta mas não autentica
// ninguém (`existingAccount: true`) — a pessoa precisa entrar para acompanhar o pedido.
export function quoteSuccessMessage(responseData: { existingAccount?: boolean; [key: string]: unknown } | null | undefined): string {
  return responseData?.existingAccount
    ? 'Seu pedido de orçamento foi enviado! Este e-mail já tem cadastro: entre na sua conta para acompanhar o pedido.'
    : 'Seu pedido de orçamento foi enviado com sucesso.';
}
