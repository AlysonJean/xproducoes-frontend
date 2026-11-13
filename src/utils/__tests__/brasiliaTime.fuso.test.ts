import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { brasiliaDateISO, brasiliaDateTime, nextDateISO } from '../brasiliaTime';
import { quoteEventEndNote, quoteEventRange, todayISO } from '../quoteSubmission';
import { EMPTY_BRIEFING, buildBriefingPayload, eventRange, type BriefingAnswers } from '../briefing';

// Auditoria do orçamento (12/11/2026), fuso: o /orcamento e o briefing montavam o início e o término no fuso do aparelho.
// Um cliente em Lisboa que digitava "19:00" pedia o evento às 16:00 de Brasília (e em Tóquio, às 07:00). O evento é em
// Belo Horizonte: o horário digitado é o de Brasília, e o instante gravado é o mesmo em qualquer aparelho. O Node aceita
// trocar process.env.TZ em execução (como em Footer.anoBrasilia.test.tsx), para fazer o papel de cada aparelho.
const ORIGINAL_TZ = process.env.TZ;
afterAll(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

const briefing = (extra: Partial<BriefingAnswers> = {}): BriefingAnswers => ({
  ...EMPTY_BRIEFING,
  eventType: 'Casamento',
  eventDate: '2027-03-20',
  startTime: '19:00',
  endTime: '23:00',
  setupTime: '15:00',
  guests: '100 a 200',
  venueKnown: 'no',
  city: 'Belo Horizonte',
  name: 'Ana Souza',
  phone: '31988887777',
  email: 'ana@cliente.test',
  accepted: true,
  ...extra,
});

describe.each(['America/Sao_Paulo', 'Europe/Lisbon', 'Asia/Tokyo', 'UTC'])('aparelho no fuso %s', (tz) => {
  beforeEach(() => {
    process.env.TZ = tz;
  });

  it('/orcamento: 19:00 às 23:00 de 20/03/2027, montagem às 15:00 — o mesmo instante do aparelho em BH', () => {
    const range = quoteEventRange({ eventDate: '2027-03-20', startTime: '19:00', endTime: '23:00', setupTime: '15:00' });
    expect(range?.start.toISOString()).toBe('2027-03-20T22:00:00.000Z');
    expect(range?.end.toISOString()).toBe('2027-03-21T02:00:00.000Z');
    expect(range?.setup?.toISOString()).toBe('2027-03-20T18:00:00.000Z');
    expect(range?.hours).toBe(4);
    expect(quoteEventEndNote(range!)).toBe('');
  });

  it('/orcamento: 22:00 às 02:00 termina na madrugada seguinte de Brasília, e o texto diz isso', () => {
    const range = quoteEventRange({ eventDate: '2027-03-20', startTime: '22:00', endTime: '02:00' });
    expect(range?.start.toISOString()).toBe('2027-03-21T01:00:00.000Z');
    expect(range?.end.toISOString()).toBe('2027-03-21T05:00:00.000Z');
    expect(quoteEventEndNote(range!)).toBe(' (termina no dia seguinte)');
  });

  it('/orcamento: evento de dois dias, pela data do término', () => {
    const range = quoteEventRange({ eventDate: '2027-03-20', endDate: '2027-03-22', startTime: '10:00', endTime: '10:00' });
    expect(range?.hours).toBe(48);
    expect(quoteEventEndNote(range!)).toBe(' (termina em 22/03)');
  });

  it('briefing: início, término e montagem no horário de Brasília', () => {
    const payload = buildBriefingPayload(briefing(), { loggedIn: false, acceptedAt: new Date('2027-01-01T12:00:00Z') });
    expect(payload).toMatchObject({
      eventDate: '2027-03-20T22:00:00.000Z',
      eventEndDate: '2027-03-21T02:00:00.000Z',
      setupTime: '2027-03-20T18:00:00.000Z',
      eventDuration: 4,
    });
    expect(eventRange(briefing({ startTime: '23:00', endTime: '01:00' })).end.toISOString()).toBe('2027-03-21T04:00:00.000Z');
  });

  it('hoje é o dia de Brasília (22:30 de 20/03 em Brasília é 01:30 de 21/03 em UTC)', () => {
    expect(todayISO(new Date('2027-03-21T01:30:00Z'))).toBe('2027-03-20');
    expect(brasiliaDateISO(new Date('2027-03-21T03:00:00Z'))).toBe('2027-03-21');
  });
});

describe('brasiliaTime — entradas inválidas e virada de mês', () => {
  it('data ou hora inválida: null (e o /orcamento não monta o horário)', () => {
    expect(brasiliaDateTime('2027-02-30', '19:00')).toBeNull();
    expect(brasiliaDateTime('2027-03-20', '25:00')).toBeNull();
    expect(brasiliaDateTime('', '')).toBeNull();
    expect(quoteEventRange({ eventDate: '2027-02-30', startTime: '19:00', endTime: '23:00' })).toBeNull();
  });

  it('o dia seguinte vira o mês e o ano', () => {
    expect(nextDateISO('2027-12-31')).toBe('2028-01-01');
    expect(nextDateISO('2028-02-28')).toBe('2028-02-29');
    expect(quoteEventRange({ eventDate: '2027-12-31', startTime: '22:00', endTime: '03:00' })?.end.toISOString()).toBe('2028-01-01T06:00:00.000Z');
  });
});
