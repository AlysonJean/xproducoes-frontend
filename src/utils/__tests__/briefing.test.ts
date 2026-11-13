import { describe, it, expect } from 'vitest';
import { EMPTY_BRIEFING, buildBriefingPayload, buildBriefingText, eventRange, formatCep, stepErrors, type BriefingAnswers } from '../briefing';

const NOW = new Date('2027-01-01T12:00:00');
const ACCEPTED = new Date('2027-01-01T15:30:00Z');
const base: BriefingAnswers = {
  ...EMPTY_BRIEFING,
  eventType: 'Casamento',
  eventDate: '2027-03-20',
  guests: '100 a 200',
  venueKnown: 'yes',
  venue: 'Espaço Lago',
  zipCode: '30110-000',
  street: 'Av. Brasil',
  addressNumber: '123',
  neighborhood: 'Centro',
  city: 'Belo Horizonte',
  state: 'mg',
  environment: 'Ao ar livre',
  stairs: 'Não sei',
  parking: 'Não',
  // Auditoria do orçamento (12/11/2026), E11: o rótulo da banda mudou.
  needs: ['Som', 'Vai ter banda ao vivo (som para a banda)'],
  bandSize: '5',
  rainCover: 'Não',
  name: ' Ana Souza ',
  phone: '(31) 98888-7777',
  email: ' ana@cliente.test ',
  accepted: true,
};
const loggedOut = { loggedIn: false, now: NOW };

describe('eventRange', () => {
  // Auditoria do orçamento (12/11/2026), fuso: as horas são as de Brasília em qualquer aparelho (20/03/2027, -03:00).
  it('término menor que o início é a madrugada do dia seguinte', () => {
    const { start, end, hours } = eventRange({ ...base, startTime: '20:00', endTime: '02:00' });
    expect(start.toISOString()).toBe('2027-03-20T23:00:00.000Z');
    expect(end.toISOString()).toBe('2027-03-21T05:00:00.000Z');
    expect(hours).toBe(6);
  });

  it('sem horário definido, usa a faixa padrão só para a data existir', () => {
    const { start, hours } = eventRange({ ...base, timeUnknown: true, startTime: '', endTime: '' });
    expect(start.toISOString()).toBe('2027-03-20T22:00:00.000Z');
    expect(hours).toBe(4);
  });
});

describe('stepErrors', () => {
  it('passo 1 pede tipo, data e convidados', () => {
    expect(Object.keys(stepErrors(0, EMPTY_BRIEFING, loggedOut)).sort()).toEqual(['eventDate', 'eventType', 'guests']);
  });

  it('data no passado é recusada; horário desconhecido não trava', () => {
    expect(stepErrors(0, { ...base, eventDate: '2026-12-31' }, loggedOut).eventDate).toMatch(/futuro/);
    expect(stepErrors(0, { ...base, timeUnknown: true, startTime: '', endTime: '' }, loggedOut)).toEqual({});
  });

  it('local não definido pede só a cidade e o estado', () => {
    const answers = { ...EMPTY_BRIEFING, venueKnown: 'no' as const };
    expect(Object.keys(stepErrors(1, answers, loggedOut))).toEqual(['city']);
    expect(stepErrors(1, { ...answers, city: 'Contagem' }, loggedOut)).toEqual({});
  });

  it('local definido pede o endereço; o nome e o CEP são opcionais', () => {
    expect(Object.keys(stepErrors(1, { ...EMPTY_BRIEFING, venueKnown: 'yes', city: 'BH' }, loggedOut)).sort()).toEqual(['addressNumber', 'neighborhood', 'street']);
    expect(stepErrors(1, { ...base, venue: '', zipCode: '' }, loggedOut)).toEqual({});
  });

  it('o passo de detalhes nunca trava', () => {
    expect(stepErrors(3, EMPTY_BRIEFING, loggedOut)).toEqual({});
  });

  it('último passo: nome, WhatsApp com DDD, e-mail e ciência; logado não precisa de e-mail', () => {
    expect(Object.keys(stepErrors(4, EMPTY_BRIEFING, loggedOut)).sort()).toEqual(['accepted', 'email', 'name', 'phone']);
    expect(stepErrors(4, { ...base, phone: '98888-7777' }, loggedOut).phone).toBeTruthy();
    expect(stepErrors(4, { ...base, email: '' }, { loggedIn: true })).toEqual({});
  });
});

describe('buildBriefingPayload', () => {
  it('monta o pedido do briefing com os campos que o servidor exige, sem preço nem itens', () => {
    const payload = buildBriefingPayload(base, { loggedIn: false, acceptedAt: ACCEPTED });
    expect(payload).toMatchObject({
      source: 'briefing',
      status: 'PENDING',
      eventTitle: 'Casamento',
      eventDuration: 4,
      location: 'Espaço Lago',
      state: 'MG',
      requiresStairs: false,
      isCovered: false,
      hasParking: false,
      clientName: 'Ana Souza',
      clientEmail: 'ana@cliente.test',
    });
    expect(payload).not.toHaveProperty('totalPrice');
    expect(payload).not.toHaveProperty('setupTime');
  });

  it('local não definido: preenche o endereço com "A definir" e mantém a cidade', () => {
    const payload = buildBriefingPayload({ ...base, venueKnown: 'no', city: 'Contagem' }, { loggedIn: false, acceptedAt: ACCEPTED });
    expect(payload).toMatchObject({ location: 'A definir', street: 'A definir', neighborhood: 'A definir', zipCode: 'A definir', addressNumber: 'S/N', city: 'Contagem' });
    expect(payload.specialRequests).toContain('Local: Ainda não definido (Contagem/MG)');
  });

  it('logado não manda e-mail: a conta já existe', () => {
    expect(buildBriefingPayload(base, { loggedIn: true, acceptedAt: ACCEPTED })).not.toHaveProperty('clientEmail');
  });
});

describe('buildBriefingText', () => {
  it('registra as respostas, as dúvidas e a ciência no horário de Brasília', () => {
    const text = buildBriefingText(base, ACCEPTED);
    expect(text).toContain('Evento: Casamento');
    expect(text).toContain('Data: 20/03/2027');
    expect(text).toContain('Escadas no acesso: Não sei');
    expect(text).toContain('Precisa de: Som, Vai ter banda ao vivo (som para a banda)');
    expect(text).toContain('Integrantes da banda: 5');
    expect(text).toContain('Tem proteção em caso de chuva: Não');
    expect(text).toContain('01/01/2027, 12:30:00');
    expect(text).toContain('Estou ciente de que');
  });

  it('não registra pergunta sem resposta nem resposta de pergunta que deixou de valer', () => {
    const text = buildBriefingText({ ...base, needs: ['Som'], environment: 'Fechado', stairs: '' }, ACCEPTED);
    expect(text).not.toContain('Escadas');
    expect(text).not.toContain('Integrantes');
    expect(text).not.toContain('chuva');
  });

  it('fica bem abaixo do limite do servidor mesmo com o texto livre cheio', () => {
    expect(buildBriefingText({ ...base, moreInfo: 'a'.repeat(1500) }, ACCEPTED).length).toBeLessThan(5000);
  });
});

describe('formatCep', () => {
  it('põe o traço e corta o excesso', () => {
    expect(formatCep('30110000999')).toBe('30110-000');
    expect(formatCep('301')).toBe('301');
  });
});
