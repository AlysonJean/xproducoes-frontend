import { describe, it, expect } from 'vitest';
import {
  BRIEFING_TERMS,
  BRIEFING_TERMS_VERSION,
  EMPTY_BRIEFING,
  EVENT_CREW_OPTIONS,
  GUEST_RANGES,
  NEED_BAND,
  NEED_LED,
  NEEDS,
  briefingHref,
  briefingPrefill,
  buildBriefingText,
  type BriefingAnswers,
} from '../briefing';

const ACCEPTED = new Date('2027-01-01T15:30:00Z');
const base: BriefingAnswers = {
  ...EMPTY_BRIEFING,
  eventType: 'Casamento',
  eventDate: '2027-03-20',
  guests: '100 a 200',
  venueKnown: 'no',
  city: 'Contagem',
  needs: ['Som'],
  accepted: true,
};

// Auditoria do orçamento (12/11/2026), E10 e E11: o briefing não tinha estruturas nem telão/LED (sob consulta), "Banda
// ao vivo" parecia que a empresa leva a banda, "Mais de 500" sem dizer que é sob consulta (o maior kit atende até 500)
// e faltava a pergunta montar e buscar × técnico durante o evento.
describe('briefing — opções conferidas com o catálogo (E10, E11)', () => {
  it('estruturas e telão/LED sob consulta; a banda é o som para a banda; sem "Palco" solto', () => {
    expect(NEEDS).toContain('Estruturas (palco, trave, backdrop)');
    expect(NEEDS).toContain('Telão / painel de LED (sob consulta)');
    expect(NEED_LED).toBe('Telão / painel de LED (sob consulta)');
    expect(NEED_BAND).toBe('Vai ter banda ao vivo (som para a banda)');
    expect(NEEDS).toContain(NEED_BAND);
    expect(NEEDS).not.toContain('Palco');
    expect(NEEDS).not.toContain('Banda ao vivo');
  });

  it('acima de 500 pessoas é sob consulta', () => {
    expect(GUEST_RANGES).toContain('Mais de 500 (sob consulta)');
    expect(GUEST_RANGES).not.toContain('Mais de 500');
  });

  it('a pergunta opcional do técnico vai para o texto da reserva só quando respondida', () => {
    expect(EVENT_CREW_OPTIONS).toEqual(['Montar e buscar depois', 'Técnico durante todo o evento', 'Não sei']);
    expect(buildBriefingText({ ...base, eventCrew: 'Técnico durante todo o evento' }, ACCEPTED)).toContain('Durante o evento: Técnico durante todo o evento');
    expect(buildBriefingText(base, ACCEPTED)).not.toContain('Durante o evento');
  });

  it('a pergunta da banda continua valendo com o rótulo novo', () => {
    const text = buildBriefingText({ ...base, needs: ['Som', NEED_BAND], bandSize: '5' }, ACCEPTED);
    expect(text).toContain('Integrantes da banda: 5');
  });
});

// Auditoria do orçamento (12/11/2026), O22 e D10: o texto de ciência dizia "Sinal, hora extra e cancelamento seguem as
// condições da proposta", e nenhuma proposta traz essas condições (a política de reserva ainda não está publicada).
describe('briefing — texto de ciência com o fluxo real (O22)', () => {
  it('pedido não é reserva; proposta pelo link com frete e pedágio; data confirmada com aceite e sinal', () => {
    expect(BRIEFING_TERMS).not.toContain('condições da proposta');
    expect(BRIEFING_TERMS).toContain('Este pedido ainda não é uma reserva');
    expect(BRIEFING_TERMS).toContain('manda a proposta num link, com o frete e o pedágio, quando houver');
    expect(BRIEFING_TERMS).toContain('a data só fica confirmada depois que eu aceitar a proposta e pagar a parcela inicial');
    expect(BRIEFING_TERMS.toLowerCase()).not.toContain(' sinal');
    expect(BRIEFING_TERMS).not.toMatch(/50%|48 h|cancelamento/);
  });

  it('texto novo, versão nova (o registro diz qual texto a pessoa leu)', () => {
    expect(BRIEFING_TERMS_VERSION).toBe('2026-11-13');
    expect(buildBriefingText(base, ACCEPTED)).toContain('(texto 2026-11-13)');
  });
});

// Auditoria do orçamento (12/11/2026), O27: o teste da Home e a página de LED por cidade abrem o briefing já com
// respostas; só vale o que é uma das opções da página.
describe('briefing — respostas no endereço (O27)', () => {
  it('ida e volta: o endereço montado pelo teste da Home volta como as mesmas respostas', () => {
    const href = briefingHref({ eventType: 'Corporativo', guests: 'Mais de 500 (sob consulta)', environment: 'Ao ar livre', needs: [NEED_LED] });
    expect(href.startsWith('/briefing?')).toBe(true);
    expect(briefingPrefill(href.slice('/briefing'.length))).toEqual({
      eventType: 'Corporativo',
      guests: 'Mais de 500 (sob consulta)',
      environment: 'Ao ar livre',
      needs: [NEED_LED],
    });
  });

  it('sem respostas, o endereço é o do briefing', () => {
    expect(briefingHref({})).toBe('/briefing');
    expect(briefingPrefill('')).toEqual({});
  });

  it('o que não é opção da página é ignorado', () => {
    expect(briefingPrefill('?tipo=Hackeado&publico=9999&ambiente=Lua&precisa=Laser&precisa=Som')).toEqual({ needs: ['Som'] });
    expect(briefingPrefill('?publico=Mais%20de%20500')).toEqual({});
  });
});
