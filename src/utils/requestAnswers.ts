// Respostas de acesso ao local (escada, local coberto ou ambiente, estacionamento) como o cliente marcou no /orcamento e
// no /briefing. Auditoria do orçamento (12/11/2026), O25: as duas páginas escrevem as respostas no texto do pedido
// (specialRequests), com "Não sei" como a pessoa marcou, e gravam no cadastro um sim/não com o caso comum (sem escada,
// coberto, com estacionamento), que é o que a equipe vê na escala. Quem mostra a resposta ao cliente ou à equipe lê o
// texto; sem ele, o sim/não do cadastro (reserva criada no painel, onde o próprio admin marcou).
//
// Teste de ponta a ponta (21/11/2026): o briefing só escreve o que foi respondido, e a ficha e a mensagem do WhatsApp
// mostravam "Escadas no acesso: Não" e "Estacionamento: Sim" (o caso comum do cadastro) para quem não respondeu. No
// pedido do briefing, a pergunta sem resposta agora é "Não informado".

export const BRIEFING_MARK = '— Briefing preenchido pelo cliente —';
export const NOT_INFORMED = 'Não informado';

// O texto livre do briefing ("O cliente também disse", sempre a última resposta) não conta: uma linha "Escadas no
// acesso: ..." digitada ali não passa pela resposta marcada.
const FREE_TEXT = /^O cliente também disse:/m;

/** A resposta escrita no texto do pedido ("Escadas no acesso: Não sei" → "Não sei"); null quando não está lá. */
export const answerInRequest = (text: string | null | undefined, label: string): string | null => {
  if (!text) return null;
  const answers = text.split(FREE_TEXT)[0];
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = answers.match(new RegExp(`^${escaped}:[ \\t]*(.+)$`, 'm'));
  return match ? match[1].trim() || null : null;
};

/** O texto do pedido veio do /briefing (que só escreve o que foi respondido). */
export const isBriefingRequest = (text: string | null | undefined): boolean =>
  Boolean(text?.split('\n').some((line) => line.trim() === BRIEFING_MARK));

export interface AccessAnswer {
  label: string;
  value: string;
  /** Veio do formulário do cliente (a resposta escrita, ou "Não informado" no briefing), e não do sim/não do cadastro. */
  answered: boolean;
}

const yesNo = (value: boolean | null | undefined): string | null => (value === true ? 'Sim' : value === false ? 'Não' : null);

/** Escada, local coberto (ou o ambiente, que é o que o briefing pergunta) e estacionamento, na ordem da ficha. */
export function accessAnswers(b: {
  specialRequests?: string | null;
  requiresStairs?: boolean | null;
  isCovered?: boolean | null;
  hasParking?: boolean | null;
}): AccessAnswer[] {
  const text = b.specialRequests;
  const briefing = isBriefingRequest(text);
  const row = (label: string, written: string | null, recorded: boolean | null | undefined): AccessAnswer | null => {
    if (written) return { label, value: written, answered: true };
    if (briefing) return { label, value: NOT_INFORMED, answered: true };
    const value = yesNo(recorded);
    return value ? { label, value, answered: false } : null;
  };
  const covered = answerInRequest(text, 'Local coberto');
  // O briefing pergunta o ambiente (fechado, ao ar livre...), não "local coberto": mostra a resposta dele.
  const environment = covered ? null : answerInRequest(text, 'Ambiente');
  return [
    row('Escadas no acesso', answerInRequest(text, 'Escadas no acesso'), b.requiresStairs),
    environment || (briefing && !covered)
      ? { label: 'Ambiente', value: environment || NOT_INFORMED, answered: true }
      : row('Local coberto', covered, b.isCovered),
    row('Estacionamento ou carga e descarga', answerInRequest(text, 'Estacionamento ou carga e descarga'), b.hasParking),
  ].filter((r): r is AccessAnswer => r !== null);
}
