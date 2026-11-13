import { describe, it, expect } from 'vitest';
import * as formatters from '../typeSafeFormatters';
import * as api from '../../services/api';
import {
  KIT_FULFILLMENT_SENTENCE,
  kitIncludesWholeEventTechnician,
  kitPageSentence,
} from '../kitInfo';

// Auditoria do orçamento (12/11/2026).
// E1/E4: a frase da página do kit segue a composição (o serviço marcado "Pode acompanhar o evento todo", o Técnico
// de Som dos Kits 05–08), nunca o nome, e diz o frete da decisão de 12/11.
// O41: saem as contas mortas do site (calculateKitTotal, calculateEquipmentTotal, calculatePeriodDiscount: kit vezes
// dias e desconto por período, que o servidor não cobra) e o quoteAPI (o /quotes do servidor simulava gravar).

const servico = (name: string, coversWholeEvent: boolean | null | undefined) => ({
  serviceId: name, service: { name, coversWholeEvent },
});
// Item de equipamento como a API devolve (service: null), com um nome que engana.
const equipamento = { equipmentId: 'eq', service: null, equipment: { name: 'Técnico de Som (nome de equipamento)' } };

describe('kitIncludesWholeEventTechnician — pela composição do kit', () => {
  it('true só com um serviço marcado coversWholeEvent; o nome não conta', () => {
    expect(kitIncludesWholeEventTechnician({ items: [servico('Técnico de Som e Operação Profissional', true)] })).toBe(true);
    expect(kitIncludesWholeEventTechnician({ items: [equipamento, servico('Logística', false), servico('Qualquer nome', true)] })).toBe(true);
    expect(kitIncludesWholeEventTechnician({ items: [servico('Técnico de Som e Operação Profissional', false)] })).toBe(false);
    expect(kitIncludesWholeEventTechnician({ items: [servico('Técnico de Iluminação', null), equipamento] })).toBe(false);
    expect(kitIncludesWholeEventTechnician({ items: [] })).toBe(false);
    expect(kitIncludesWholeEventTechnician({})).toBe(false);
    expect(kitIncludesWholeEventTechnician({ items: null })).toBe(false);
  });
});

describe('kitPageSentence — a frase da página do kit', () => {
  const ENTREGA = 'A equipe da X Produções leva o kit ao local do evento, monta e busca depois.';
  const FRETE = 'O frete até 15 km da X Produções já vem no kit; acima disso, só os km a mais entram como frete.';

  it('entrega sem técnico: frete e a oferta do técnico à parte', () => {
    expect(kitPageSentence({ fulfillment: 'DELIVERY_SETUP', items: [servico('Logística', false)] })).toBe(
      `${ENTREGA} ${FRETE} Se preferir, um técnico fica durante todo o evento, cobrado à parte.`,
    );
  });

  it('entrega com o técnico na composição: técnico incluso, sem oferta à parte', () => {
    const frase = kitPageSentence({ fulfillment: 'DELIVERY_SETUP', items: [servico('Técnico de Som e Operação Profissional', true)] });
    expect(frase).toBe(`${ENTREGA} ${FRETE} O técnico que acompanha todo o evento já vem incluso neste kit.`);
    expect(frase).not.toMatch(/cobrado à parte/);
  });

  it('sem o campo do tipo (resposta antiga): entrega, como o padrão do banco', () => {
    expect(kitPageSentence({ items: [] })).toMatch(new RegExp(`^${ENTREGA.replace(/\./g, '\\.')} ${FRETE.replace(/\./g, '\\.')}`));
  });

  it('retirada: sem entrega, sem frete e sem técnico, mesmo com o técnico na composição', () => {
    const frase = kitPageSentence({ fulfillment: 'CLIENT_PICKUP', items: [servico('Técnico de Som e Operação Profissional', true)] });
    expect(frase).toBe(KIT_FULFILLMENT_SENTENCE.CLIENT_PICKUP);
    expect(frase).not.toMatch(/frete|Entrega|técnico/);
  });

  it('a frase da entrega diz o frete e começa pela frase que a política de reserva cita (ReservationPolicyPage.p17)', () => {
    expect(KIT_FULFILLMENT_SENTENCE.DELIVERY_SETUP).toBe(`${ENTREGA} ${FRETE}`);
    expect(KIT_FULFILLMENT_SENTENCE.DELIVERY_SETUP.split('. ')[0]).toBe('A equipe da X Produções leva o kit ao local do evento, monta e busca depois');
  });
});

describe('código morto do orçamento fora do site (O41)', () => {
  it('typeSafeFormatters sem calculateKitTotal, calculateEquipmentTotal e calculatePeriodDiscount', () => {
    for (const nome of ['calculateKitTotal', 'calculateEquipmentTotal', 'calculatePeriodDiscount']) {
      expect(formatters).not.toHaveProperty(nome);
      expect(formatters.default).not.toHaveProperty(nome);
    }
    // O que fica e é usado (a economia da página do kit).
    expect(formatters.calculateSavingsAmount(400, 300)).toBe(100);
  });

  it('services/api sem o quoteAPI (o pedido vai por /bookings e /bookings/guest)', () => {
    expect(api).not.toHaveProperty('quoteAPI');
    expect(api).toHaveProperty('recommendationAPI');
  });
});
