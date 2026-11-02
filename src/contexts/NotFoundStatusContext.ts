import { createContext, useContext } from 'react';

// Achado (auditoria ponta a ponta): o app inteiro é uma única página do Vike (pages/all, rota "/*"),
// então quem descobre que um endereço não existe é o React Router, já durante a renderização — e o
// SSR respondia 200 para qualquer endereço errado. Este contexto leva essa informação de volta ao
// SSR: só renderer/+onRenderHtml.tsx fornece um valor (uma função por requisição; se ela for
// chamada, a resposta sai 404). No navegador (e em testes que não passam pelo onRenderHtml) o valor
// é null e o hook não faz nada.
export const NotFoundStatusContext = createContext<(() => void) | null>(null);

// Chamado por NotFoundPage: qualquer rota que mostre a página 404 responde 404 no SSR.
export function useNotFoundStatus(): void {
  const markNotFound = useContext(NotFoundStatusContext);
  markNotFound?.();
}
