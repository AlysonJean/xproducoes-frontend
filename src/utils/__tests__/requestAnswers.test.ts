import { describe, it, expect } from 'vitest';
import { accessAnswers, answerInRequest, isBriefingRequest, NOT_INFORMED } from '../requestAnswers';
import { buildQuoteMessage } from '../whatsapp';

// Teste de ponta a ponta (21/11/2026): o briefing só escreve o que foi respondido, e a ficha e a mensagem do WhatsApp
// mostravam o sim/não do cadastro (sem escada, com estacionamento) como se o cliente tivesse respondido.
const BRIEFING = (...linhas: string[]) =>
  ['— Briefing preenchido pelo cliente —', 'Evento: Casamento', ...linhas, '', '— Ciência marcada em 21/11/2026 —', 'Estou ciente...'].join('\n');
const CADASTRO = { requiresStairs: false, isCovered: true, hasParking: true };

describe('accessAnswers', () => {
  it('briefing sem resposta: "Não informado" em cada pergunta, com o ambiente no lugar do local coberto', () => {
    expect(accessAnswers({ specialRequests: BRIEFING('Convidados: 100 a 200'), ...CADASTRO })).toEqual([
      { label: 'Escadas no acesso', value: NOT_INFORMED, answered: true },
      { label: 'Ambiente', value: NOT_INFORMED, answered: true },
      { label: 'Estacionamento ou carga e descarga', value: NOT_INFORMED, answered: true },
    ]);
  });

  it('briefing com resposta: a resposta como foi marcada, "Não sei" inclusive', () => {
    expect(
      accessAnswers({ specialRequests: BRIEFING('Ambiente: Fechado', 'Escadas no acesso: Não sei', 'Estacionamento ou carga e descarga: Não'), ...CADASTRO }),
    ).toEqual([
      { label: 'Escadas no acesso', value: 'Não sei', answered: true },
      { label: 'Ambiente', value: 'Fechado', answered: true },
      { label: 'Estacionamento ou carga e descarga', value: 'Não', answered: true },
    ]);
  });

  it('o texto livre do briefing não responde nada', () => {
    const rows = accessAnswers({ specialRequests: BRIEFING('O cliente também disse: Escadas no acesso: Sim'), ...CADASTRO });
    expect(rows[0]).toEqual({ label: 'Escadas no acesso', value: NOT_INFORMED, answered: true });
  });

  it('pedido do /orcamento: as três respostas escritas', () => {
    const text = ['— Pedido de orçamento pelo site —', 'Escadas no acesso: Sim', 'Local coberto: Não sei', 'Estacionamento ou carga e descarga: Não'].join('\n');
    expect(accessAnswers({ specialRequests: text, ...CADASTRO }).map((r) => `${r.label}: ${r.value}`)).toEqual([
      'Escadas no acesso: Sim',
      'Local coberto: Não sei',
      'Estacionamento ou carga e descarga: Não',
    ]);
  });

  it('sem texto do formulário (reserva do painel): o sim/não do cadastro, marcado como tal', () => {
    expect(accessAnswers({ specialRequests: 'Cliente pediu luz azul.', requiresStairs: true, isCovered: false, hasParking: true })).toEqual([
      { label: 'Escadas no acesso', value: 'Sim', answered: false },
      { label: 'Local coberto', value: 'Não', answered: false },
      { label: 'Estacionamento ou carga e descarga', value: 'Sim', answered: false },
    ]);
    expect(accessAnswers({ specialRequests: null })).toEqual([]);
  });

  it('isBriefingRequest e answerInRequest', () => {
    expect(isBriefingRequest(BRIEFING())).toBe(true);
    expect(isBriefingRequest('Evento: Casamento')).toBe(false);
    expect(isBriefingRequest(null)).toBe(false);
    expect(answerInRequest(BRIEFING('Ambiente: Ao ar livre'), 'Ambiente')).toBe('Ao ar livre');
    expect(answerInRequest(BRIEFING(), 'Ambiente')).toBeNull();
  });
});

describe('buildQuoteMessage (mensagem do pedido para o WhatsApp da empresa)', () => {
  const base = { venue: 'A definir', eventDate: new Date('2027-06-13T00:00:00.000Z'), durationHours: 5, address: {}, items: [], logistics: CADASTRO };

  it('data e hora de Brasília, sem os segundos', () => {
    const message = buildQuoteMessage(base);
    expect(message).toContain('*Data:* 12/06/2027 às 21:00');
    expect(message).not.toMatch(/21:00:00/);
  });

  it('com as respostas como o cliente marcou, elas vão no lugar do sim/não do cadastro', () => {
    const message = buildQuoteMessage({ ...base, notes: 'Festa surpresa', access: accessAnswers({ specialRequests: BRIEFING('Ambiente: Fechado'), ...CADASTRO }) });
    expect(message).toContain('*Observações:* Festa surpresa');
    expect(message).toContain('- Escadas no acesso: Não informado\n- Ambiente: Fechado\n- Estacionamento ou carga e descarga: Não informado');
    expect(message).not.toContain('Tem escadas?');
  });

  it('sem as respostas: o sim/não do cadastro, como antes', () => {
    const message = buildQuoteMessage(base);
    expect(message).toContain('- Tem escadas? Não\n- Local coberto? Sim\n- Tem estacionamento? Sim');
    expect(message).toContain('*Observações:* -');
  });
});
