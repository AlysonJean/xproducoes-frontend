import { describe, it, expect } from 'vitest';
import { parseHistoryRows, parseSheetDate, parseSheetMoney, parseSheetTime } from '../historyImport';

// Conversão da aba "Eventos" (planilha de revisão das agendas 2022–2026) nas linhas da
// importação. Regras combinadas com o usuário: sem horário → 20h–23h; só início → +3h; sem
// valor → sugestão marcada como estimada; Pago/Parcial/Pendente → situação do pagamento.
const base = {
  Importar: 'Sim', 'Código': 'HIST-20250308-01', Data: '08/03/2025', 'Início': '', 'Término': '', Montagem: '',
  Cliente: 'Resenha do Morro', Evento: 'Yago Resenha do Morro', Local: '', Detalhes: '',
  'Valor (R$)': 500, 'Valor sugerido (R$)': '', Pagamento: 'Pago', Equipe: 'Alyson', Revisar: '',
  'Motivo da revisão': '', 'Observações': '', 'Texto original': '🤑 Yago Resenha do Morro 500,00', Origem: 'x produçoes 2025.txt',
};

describe('parseHistoryRows', () => {
  it('sem horário → 20:00–23:00 em Brasília, com nota; pagamento "Pago"', () => {
    const { rows } = parseHistoryRows([base]);
    expect(rows[0].errors).toEqual([]);
    expect(rows[0].row).toMatchObject({
      key: 'HIST-20250308-01',
      eventDate: '2025-03-08T23:00:00.000Z',
      eventEndDate: '2025-03-09T02:00:00.000Z',
      clientName: 'Resenha do Morro',
      eventTitle: 'Yago Resenha do Morro',
      totalPrice: 500,
      paymentStatus: 'PAID',
    });
    expect(rows[0].row?.internalNotes).toContain('Horário não informado na agenda — registrado 20:00–23:00.');
    expect(rows[0].row?.internalNotes).toContain('Equipe: Alyson');
    expect(rows[0].row?.internalNotes).toContain('Texto original da agenda:\n🤑 Yago Resenha do Morro 500,00');
  });

  it('só início → término 3h depois; término antes do início passa para o dia seguinte; montagem antes', () => {
    const { rows } = parseHistoryRows([
      { ...base, 'Início': '22:00' },
      { ...base, 'Código': 'HIST-20250308-02', 'Início': '23:00', 'Término': '03:00', Montagem: '18:00' },
    ]);
    expect(rows[0].row).toMatchObject({ eventDate: '2025-03-09T01:00:00.000Z', eventEndDate: '2025-03-09T04:00:00.000Z' });
    expect(rows[0].row?.internalNotes).toContain('estimado 3h após o início');
    expect(rows[1].row).toMatchObject({
      eventDate: '2025-03-09T02:00:00.000Z',
      eventEndDate: '2025-03-09T06:00:00.000Z',
      setupTime: '2025-03-08T21:00:00.000Z',
    });
  });

  it('sem valor → usa a sugestão e anota "Valor estimado"; sem os dois → R$ 0 com nota', () => {
    const { rows } = parseHistoryRows([
      { ...base, 'Valor (R$)': '', 'Valor sugerido (R$)': 450 },
      { ...base, 'Código': 'HIST-20250308-02', 'Valor (R$)': '', 'Valor sugerido (R$)': '' },
    ]);
    expect(rows[0].row?.totalPrice).toBe(450);
    expect(rows[0].row?.internalNotes).toMatch(/Valor estimado: R\$\s450,00 .*Confirmar\./);
    expect(rows[1].row?.totalPrice).toBe(0);
    expect(rows[1].row?.internalNotes).toContain('Valor não anotado na agenda.');
  });

  it('Dúvida / Não marcado não viram situação de pagamento — ficam na nota', () => {
    const { rows } = parseHistoryRows([{ ...base, Pagamento: 'Dúvida' }, { ...base, 'Código': 'HIST-20250308-02', Pagamento: 'Parcial' }]);
    expect(rows[0].row?.paymentStatus).toBeNull();
    expect(rows[0].row?.internalNotes).toContain('Pagamento na agenda: Dúvida.');
    expect(rows[1].row?.paymentStatus).toBe('PARTIAL');
  });

  it('"Importar = Não" é ignorada; data, hora e valor inválidos viram erro da linha', () => {
    const { rows, skipped } = parseHistoryRows([
      { ...base, Importar: 'Não' },
      { ...base, Data: '31/09/2025', 'Início': '25:00', 'Valor (R$)': 'quinhentos', Cliente: '' },
    ]);
    expect(skipped).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].line).toBe(3);
    expect(rows[0].row).toBeUndefined();
    expect(rows[0].errors).toEqual([
      'Cliente vazio',
      'Data inválida ("31/09/2025") — use dd/mm/aaaa',
      'Início inválido ("25:00")',
      'Valor inválido ("quinhentos")',
    ]);
  });
});

describe('leitura de células redigitadas no Excel', () => {
  it('data como número de série e hora como fração do dia', () => {
    expect(parseSheetDate(45724)).toBe('2025-03-08');
    expect(parseSheetDate('8/3/2025')).toBe('2025-03-08');
    expect(parseSheetTime(20 / 24)).toBe(1200);
    expect(parseSheetTime('20h30')).toBe(1230);
    expect(parseSheetTime('19:00:00')).toBe(1140);
  });

  it('valores em formato brasileiro', () => {
    expect(parseSheetMoney('1.150,00')).toBe(1150);
    expect(parseSheetMoney('R$ 400,50')).toBe(400.5);
    expect(parseSheetMoney('600')).toBe(600);
    expect(parseSheetMoney('')).toBeNull();
  });
});
