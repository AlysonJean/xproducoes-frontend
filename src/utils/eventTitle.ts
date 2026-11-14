// Teste do aceite de 13/11/2026: a reserva criada sem título grava "Evento", e os textos ao cliente diziam 'a proposta do
// seu evento "Evento"'. Para o cliente, "Evento" é o mesmo que sem título. O servidor faz a mesma conta nos e-mails
// (backend utils/eventTitle.ts).

/** O título do evento para os textos ao cliente; undefined quando falta ou é só o rótulo padrão "Evento". */
export const clientEventTitle = (title?: string | null): string | undefined => {
  const text = title?.trim();
  return text && text.toLocaleLowerCase('pt-BR') !== 'evento' ? text : undefined;
};
