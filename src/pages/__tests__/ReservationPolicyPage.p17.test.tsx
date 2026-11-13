import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ReservationPolicyPage } from '../ReservationPolicyPage';
import {
  RESERVATION_POLICY_DRAFT_NOTICE,
  RESERVATION_POLICY_PATH,
  RESERVATION_POLICY_PENDING_LABEL,
  RESERVATION_POLICY_PUBLISHED,
  RESERVATION_POLICY_TITLE,
  RESERVATION_POLICY_UPDATED_AT,
  RESERVATION_POLICY_VERSION,
} from '../../data/reservationPolicy';
import { RESERVATION_CANCELLATION_TABLES, RESERVATION_POLICY_SECTIONS } from '../../data/reservationPolicyContent';
import { formatPhoneDisplay } from '../../data/site';
import { getWhatsAppPhone } from '../../utils/whatsapp';
import { freightRulesText } from '../../utils/freightInfo';
import { KIT_FULFILLMENT_SENTENCE } from '../../utils/kitInfo';

// P17 (aprovada em 02/11/2026): a "Política de reserva e cancelamento" fica montada e escondida até o dono e um
// advogado aprovarem o texto. Aqui: o conteúdo segue as decisões do dono sem contradizer o que o site já diz (kit de
// entrega com a montagem no preço, frete por km, cupom fora do frete), a página mostra todas as seções do arquivo de
// dados e, enquanto não publicada, tem o aviso de rascunho e o noindex.
// Auditoria do orçamento (12/11/2026), E1–E4: o kit de entrega inclui montagem e frete até 15 km, serviço que já vem no
// kit não é cobrado de novo e a regra nova do frete. A política continua citando a primeira frase da página do kit.
// Textos legais (13/11/2026): texto reescrito pelas regras de 12 e 13/11 e pela pesquisa jurídica de 13/11. Saíram o
// "sinal" (arras no Código Civil, com devolução em dobro, art. 418) e a tabela antiga de cancelamento; entraram a
// parcela inicial com prazos, o atraso pela taxa legal (art. 406) e IPCA, a desistência com o botão "Desistir da
// contratação", as duas tabelas (cliente final e revendedor) com a retenção limitada ao valor pago e a multa recíproca,
// remarcação, hora adicional, danos, energia, força maior, ECAD e lei do silêncio, foro e o aceite com código no
// e-mail. As cláusulas que limitam direitos vêm em destaque.

expect.extend(toHaveNoViolations);

// formatPrice usa espaço não separável ("R$ 3,50"); o Testing Library normaliza o texto da página do mesmo jeito.
const norm = (text: string) => text.replace(/\s+/g, ' ').trim();

type Section = (typeof RESERVATION_POLICY_SECTIONS)[number];
const blockTexts = (section: Section) =>
  section.blocks.flatMap((block) =>
    block.kind === 'paragraph'
      ? [block.text]
      : block.kind === 'list'
        ? [...block.items]
        : [block.caption, ...block.columns, ...block.rows.flat()]
  );

const allText = norm(RESERVATION_POLICY_SECTIONS.flatMap((section) => [section.title, ...blockTexts(section)]).join(' '));
const sectionText = (id: string) => {
  const section = RESERVATION_POLICY_SECTIONS.find((item) => item.id === id);
  expect(section, id).toBeDefined();
  return norm([section?.title ?? '', ...(section ? blockTexts(section) : [])].join(' '));
};

// O que o dono ainda não respondeu: seções inteiras e parágrafos soltos (desde 13/11, nenhum).
const pendingSectionIds = RESERVATION_POLICY_SECTIONS.filter((section) => section.pendingConfirmation).map((section) => section.id);
const pendingParagraphs = RESERVATION_POLICY_SECTIONS.flatMap((section) =>
  section.blocks.flatMap((block) => (block.kind === 'paragraph' && block.pendingConfirmation ? [{ sectionId: section.id, text: block.text }] : []))
);
const highlighted = RESERVATION_POLICY_SECTIONS.flatMap((section) =>
  section.blocks.flatMap((block) => (block.kind === 'paragraph' && block.highlight ? [{ sectionId: section.id, text: block.text }] : []))
);

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[RESERVATION_POLICY_PATH]}>
        <ReservationPolicyPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('meta[name="robots"]').forEach((el) => el.remove());
});

describe('P17 — o texto da política (src/data/reservationPolicy*.ts)', () => {
  it('versão 2026-11-13 (a do modelo do contrato), endereço /politica-de-reserva e ainda não publicada', () => {
    expect(RESERVATION_POLICY_VERSION).toBe('2026-11-13');
    expect(RESERVATION_POLICY_UPDATED_AT).toBe('13/11/2026');
    expect(RESERVATION_POLICY_PATH).toBe('/politica-de-reserva');
    expect(RESERVATION_POLICY_PUBLISHED).toBe(false);
  });

  it('as seções seguem a ordem do contrato: partes, reserva, aceite, objeto, pagamento, desistência, cancelamento e o resto', () => {
    expect(RESERVATION_POLICY_SECTIONS.map((section) => section.id)).toEqual([
      'quem-somos',
      'como-a-data-fica-reservada',
      'aceite-eletronico',
      'o-que-esta-incluido',
      'pagamento',
      'arrependimento',
      'cancelamento-pelo-cliente',
      'remarcacao',
      'cancelamento-pela-empresa',
      'hora-adicional',
      'local-energia-informacoes',
      'danos',
      'forca-maior',
      'licencas-e-som',
      'dados',
      'foro',
    ]);
  });

  it('nada está "a confirmar": as regras foram decididas em 12 e 13/11', () => {
    expect(pendingSectionIds).toEqual([]);
    expect(pendingParagraphs).toEqual([]);
  });

  it('a política não pode ser publicada com seção ou frase ainda a confirmar', () => {
    expect(RESERVATION_POLICY_PUBLISHED && pendingSectionIds.length + pendingParagraphs.length > 0).toBe(false);
  });

  it('sem "sinal", sem arras, sem devolução em dobro e sem "1% ao mês"', () => {
    expect(allText).not.toMatch(/\bsinal\b/i);
    expect(allText).not.toMatch(/\barras\b/i);
    expect(allText).not.toContain('em dobro');
    expect(allText).not.toContain('art. 418');
    expect(allText).not.toContain('1% ao mês');
  });

  it('parcela inicial, saldo, PIX só na chave do CNPJ e atraso pela taxa legal (art. 406) e IPCA', () => {
    const text = sectionText('pagamento');
    for (const fragment of [
      'Parcela inicial, saldo e forma de pagamento',
      'Parcela inicial do preço: 50% do total da proposta, por PIX, em até 3 dias corridos depois do aceite (em até 1 dia, se faltarem menos de 5 dias para o evento). A data só fica reservada depois que ela é paga.',
      'Saldo: os outros 50%, pagos até 48 horas antes do evento.',
      'Todo pagamento por PIX é feito só na chave PIX do CNPJ da X Produções (CNPJ 55.343.824/0001-56).',
      'Nunca pague em chave PIX de pessoa física.',
      'Atraso no pagamento: multa de 2% sobre o valor em atraso, juros de mora pela taxa legal do Código Civil (art. 406), divulgada pelo Banco Central, e atualização pelo IPCA, do IBGE.',
    ]) {
      expect(text).toContain(norm(fragment));
    }
    expect(sectionText('como-a-data-fica-reservada')).toContain('Ela vale por 7 dias');
    expect(sectionText('como-a-data-fica-reservada')).toContain(
      'Enquanto a parcela inicial não é paga, a data não fica reservada e pode ser contratada por outra pessoa.'
    );
  });

  it('desistência em 7 dias corridos para o cliente final, com devolução integral, o botão "Desistir da contratação", e-mail e WhatsApp', () => {
    const text = sectionText('arrependimento');
    for (const fragment of [
      'pode desistir em até 7 dias corridos depois do aceite, sem custo e sem precisar dizer o motivo, mesmo que o evento caia dentro desse prazo.',
      'Devolvemos tudo o que você pagou, de imediato (Código de Defesa do Consumidor, art. 49, e Decreto 7.962/2013, art. 5º).',
      `Para desistir, avise pelo e-mail suporte@xproducoeseeventos.com.br ou pelo WhatsApp ${formatPhoneDisplay(getWhatsAppPhone())}.`,
      // O botão só existe quando o aceite foi pelo site (o aceite online nasce desligado).
      'Se você aceitou pelo site, também pode usar o botão "Desistir da contratação" na página da proposta ou na sua área do cliente.',
      'Enviamos a confirmação da desistência logo que a recebemos.',
      'Quem contrata para revender ou produzir o evento de outra pessoa não tem esse prazo de desistência',
    ]) {
      expect(text).toContain(norm(fragment));
    }
  });

  it('as duas tabelas de cancelamento, com os números decididos em 13/11', () => {
    expect(RESERVATION_CANCELLATION_TABLES.ownEvent.map((rule) => [rule.range, rule.percent])).toEqual([
      ['61 dias ou mais antes do evento', 10],
      ['De 60 a 31 dias antes', 20],
      ['De 30 a 15 dias antes', 30],
      ['De 14 a 8 dias antes', 40],
      ['7 dias ou menos antes, ou não comparecimento', 50],
    ]);
    expect(RESERVATION_CANCELLATION_TABLES.resale.map((rule) => [rule.range, rule.percent])).toEqual([
      ['61 dias ou mais antes do evento', 20],
      ['De 60 a 31 dias antes', 30],
      ['De 30 a 8 dias antes', 50],
      ['7 dias ou menos antes, ou não comparecimento', 70],
    ]);
    const section = RESERVATION_POLICY_SECTIONS.find((item) => item.id === 'cancelamento-pelo-cliente');
    const tables = section?.blocks.filter((block) => block.kind === 'table') ?? [];
    expect(tables.map((block) => (block.kind === 'table' ? [block.caption, block.columns, block.rows] : null))).toEqual([
      [
        'Cancelamento pelo cliente final',
        ['Quando você cancela', 'Fica retido do valor total'],
        [
          ['61 dias ou mais antes do evento', '10%'],
          ['De 60 a 31 dias antes', '20%'],
          ['De 30 a 15 dias antes', '30%'],
          ['De 14 a 8 dias antes', '40%'],
          ['7 dias ou menos antes, ou não comparecimento', '50%'],
        ],
      ],
      [
        'Cancelamento pelo revendedor',
        ['Quando você cancela', 'Fica retido do valor total'],
        [
          ['61 dias ou mais antes do evento', '20%'],
          ['De 60 a 31 dias antes', '30%'],
          ['De 30 a 8 dias antes', '50%'],
          ['7 dias ou menos antes, ou não comparecimento', '70%'],
        ],
      ],
    ]);
  });

  it('cancelamento: quem é cliente final e quem é revendedor, a retenção limitada ao valor pago e a multa recíproca', () => {
    const text = sectionText('cancelamento-pelo-cliente');
    // Revisão: o revendedor não tem prazo de desistência, então o título não fala em "depois dos 7 dias".
    expect(text).toContain('Cancelamento pelo cliente');
    expect(text).not.toContain('depois dos 7 dias');
    for (const fragment of [
      'Se você cancelar fora do prazo de desistência (para o revendedor, a qualquer momento depois do aceite), fica retida uma parte do valor total da contratação.',
      'Cliente final é quem contrata para o próprio evento (pessoa física, ou empresa que contrata para um evento dela).',
      'Revendedor é quem revende ou integra o nosso serviço no evento de outra pessoa (produtora, agência, cerimonial, buffet ou casa de eventos).',
      '"Você contrata para o seu próprio evento ou para revender/produzir o evento de outra pessoa?"',
      'A retenção fica limitada ao valor que você já pagou, sem outros custos, salvo repasses de terceiros discriminados na proposta.',
      'Ficam retidos 30% do total (R$ 600,00), e devolvemos R$ 400,00.',
    ]) {
      expect(text).toContain(norm(fragment));
    }
    // O exemplo (20 dias antes) usa a linha "De 30 a 15 dias antes" da tabela do cliente final.
    expect(RESERVATION_CANCELLATION_TABLES.ownEvent[2]).toEqual({ range: 'De 30 a 15 dias antes', percent: 30 });
    expect(sectionText('cancelamento-pela-empresa')).toContain(
      'Se a X Produções cancelar sem justa causa, devolve tudo o que você pagou e paga a você uma multa igual à que você pagaria se cancelasse na mesma data, pela mesma tabela.'
    );
    // Revisão: a multa não limita a reparação do consumidor (CDC, arts. 6º, VI, e 51, I).
    expect(sectionText('cancelamento-pela-empresa')).toContain(
      'Se você contrata como consumidor, essa multa não impede que você peça a reparação de outros prejuízos que comprovar (Código de Defesa do Consumidor, art. 6º, VI).'
    );
  });

  it('remarcação e hora adicional', () => {
    const remarcacao = sectionText('remarcacao');
    expect(remarcacao).toContain(
      'remarcar a reserva uma vez, sem custo, avisando com pelo menos 15 dias de antecedência, para uma nova data em até 6 meses, conforme a agenda, com os mesmos itens e o mesmo preço'
    );
    expect(remarcacao).toContain('Se não houver data disponível, vale a tabela de cancelamento, contada da data original do evento.');
    expect(remarcacao).toContain('Remarcação por força maior ou a pedido da X Produções não conta como a sua remarcação sem custo.');

    const hora = sectionText('hora-adicional');
    expect(hora).toContain('só passa do horário combinado se você pedir e autorizar por escrito no dia');
    expect(hora).toContain('e se a equipe estiver disponível');
    expect(hora).toContain('no kit, o valor da hora extra do kit; nos demais casos, o valor por hora informado na proposta');
    expect(hora).toContain('Sem a sua autorização por escrito, nenhuma hora adicional é cobrada.');
  });

  it('energia, danos, força maior (chuva comum não é), ECAD e lei do silêncio de Belo Horizonte, dados e foro', () => {
    expect(sectionText('local-energia-informacoes')).toContain(
      'salvo se ela forneceu o gerador ou se a falha vier dos equipamentos ou da equipe dela'
    );
    const danos = sectionText('danos');
    for (const fragment of [
      'dano, perda, furto ou extravio dos equipamentos durante o evento ou enquanto eles estiverem sob a sua guarda, inclusive quando causados por convidados',
      'Não entram: o desgaste natural, defeito do equipamento, falha da equipe da X Produções e força maior comprovada.',
      'valor do conserto comprovado ou, quando não houver conserto, o valor de mercado de um equipamento equivalente',
      'avisa com fotos em até 48 horas',
      'você pode contestar em até 5 dias úteis',
      'conferimos juntos uma lista com fotos na entrega e na devolução',
    ]) {
      expect(danos).toContain(fragment);
    }
    const forcaMaior = sectionText('forca-maior');
    expect(forcaMaior).toContain('remarcado sem custo para uma data em até 12 meses');
    expect(forcaMaior).toContain('menos as despesas com terceiros já feitas e comprovadas');
    expect(forcaMaior).toContain('Chuva comum não é força maior.');
    const licencas = sectionText('licencas-e-som');
    expect(licencas).toContain('ECAD (Lei 9.610/1998, arts. 68 e 110)');
    expect(licencas).toContain('Lei municipal 9.505/2008');
    expect(licencas).toContain('Baixar o volume ou desligar o som por ordem de autoridade não é descumprimento do contrato.');
    expect(licencas).toContain('ela pode cobrar esse valor de quem contrata');
    expect(sectionText('dados')).toContain('ficam guardados por 10 anos depois do fim do contrato');
    const foro = sectionText('foro');
    expect(foro).toContain('Se você contrata como consumidor, as ações sobre o contrato correm no foro da cidade onde você mora');
    expect(foro).toContain('Nos demais casos, fica eleito o foro de Belo Horizonte - MG.');
  });

  it('aceite pelo site: resumo e contrato antes, caixa desmarcada, código de 6 dígitos no e-mail, registro e cópia em PDF', () => {
    const text = sectionText('aceite-eletronico');
    // Revisão: o aceite online nasce desligado, então o texto vale "quando a proposta oferecer" e o aceite de hoje
    // (por escrito à equipe) continua previsto.
    expect(text).toContain('Quando a proposta oferecer o aceite pelo site, antes de aceitar você vê o resumo da contratação');
    expect(text).toContain('Para aceitar pelo site, você marca a caixa de concordância');
    expect(sectionText('como-a-data-fica-reservada')).toContain(
      'Aceite: você aceita a proposta dentro desses 7 dias, por escrito à equipe (pelo WhatsApp ou pelo e-mail) ou, quando a proposta oferecer, pelo site (veja "Aceite pelo site").'
    );
    for (const fragment of [
      'o texto completo do contrato, que pode salvar e imprimir',
      'você marca a caixa de concordância (ela vem desmarcada), digita o código de 6 dígitos que enviamos ao seu e-mail e clica em "Aceito"',
      'Medida Provisória 2.200-2/2001, art. 10, § 2º; Código Civil, arts. 107 e 425; Código de Processo Civil, art. 411, II',
      'o e-mail que recebeu o código, a data e a hora (horário de Brasília), o endereço IP, o navegador e o aparelho, a versão do contrato e a impressão digital do arquivo (hash SHA-256)',
      'você recebe por e-mail a cópia em PDF e o comprovante do aceite',
    ]) {
      expect(text).toContain(fragment);
    }
  });

  it('as cláusulas que limitam direitos vêm em destaque', () => {
    expect(highlighted.map((item) => [item.sectionId, item.text.split(' ').slice(0, 4).join(' ')])).toEqual([
      ['pagamento', 'Atraso no pagamento: multa'],
      ['cancelamento-pelo-cliente', 'A retenção fica limitada'],
      ['local-energia-informacoes', 'A X Produções não'],
      ['danos', 'Quem contrata responde por'],
      ['forca-maior', 'Nesses casos, o evento'],
      ['forca-maior', 'Chuva comum não é'],
      ['licencas-e-som', 'Se a X Produções'],
    ]);
  });

  it('o que está incluído (decisões de 12/11): o kit de entrega traz levar, montar, buscar e o frete até 15 km; serviço do kit não é cobrado de novo; o de retirada não tem frete', () => {
    expect(allText).toContain(
      'A contratação é a locação de equipamentos de som e iluminação e a prestação dos serviços de montagem, operação técnica e desmontagem que estiverem na proposta.'
    );
    expect(allText).toContain(
      'O frete, a montagem de equipamento avulso e o técnico durante o evento (quando o kit não o inclui) são cobrados à parte e aparecem como itens na proposta.'
    );
    // A política não pode dizer que toda montagem é cobrada à parte (só a do equipamento avulso), nem que o técnico é
    // sempre cobrado à parte (os Kits 05–08 já o trazem).
    expect(allText).not.toContain('Técnico, montagem e frete são cobrados à parte');
    expect(allText).not.toContain('O técnico durante o evento, o frete e a montagem de equipamento avulso são cobrados à parte');
    expect(allText).toContain(
      norm(
        'Kit de entrega e montagem: a equipe da X Produções leva o kit ao local do evento, monta e busca depois, e isso vem no preço do kit, com o frete até 15 km. ' +
          'Acima disso, só os km a mais entram como frete (veja abaixo). Serviço que já vem dentro do kit, como a montagem ou o técnico de som, não é cobrado de novo; ' +
          'o técnico durante todo o evento, quando o kit não o inclui, é cobrado à parte.'
      )
    );
    // A primeira frase da página do kit de entrega e a do kit de retirada (utils/kitInfo.ts) estão na política.
    const [deliverySentence] = KIT_FULFILLMENT_SENTENCE.DELIVERY_SETUP.split('. ');
    expect(allText.toLowerCase()).toContain(deliverySentence.toLowerCase());
    expect(allText.toLowerCase()).toContain(norm(KIT_FULFILLMENT_SENTENCE.CLIENT_PICKUP).toLowerCase());
    expect(allText).toContain('Pedido só com kit de retirada não tem frete.');
    expect(allText).toContain('Equipamento avulso: o preço é por diária, como a página do equipamento indica.');
    expect(allText).toContain(
      norm(
        'Técnico durante todo o evento: é opcional quando o kit não o inclui. O preço do serviço vale até as horas indicadas nele; cada hora a mais do evento sai proporcional. ' +
          'Nos kits que já trazem o técnico de som, ele vem no preço do kit (e nas horas extras do kit) e não é cobrado de novo.'
      )
    );
    expect(allText).toContain(
      'O que não aparece na proposta não está incluído, como palco e estruturas, gerador ou cobertura dos equipamentos contra chuva, salvo se combinado por escrito.'
    );
  });

  it('frete e pedágio pela regra nova (12/11): avulso R$ 50 até 15 km, kit de entrega com 15 km inclusos, 4 trechos, mínimo e arredondamento; cupom não desconta', () => {
    for (const fragment of [
      freightRulesText({ pricePerKm: 3.5, freeKm: 15, minimum: 50, roundTo: 10, trips: 2 }),
      'Frete pela distância até o local do evento (a do trajeto de ida, em km inteiros, arredondada para o mais próximo; a volta conta igual).',
      'Equipamento avulso, sem kit de entrega: frete de R$ 50,00 até 15 km da X Produções; acima disso, R$ 3,50 por km além dos 15 km em cada trecho (4 trechos: 2 viagens de ida e volta), arredondado para cima em múltiplos de R$ 10,00, com mínimo de R$ 50,00.',
      'Pedido com kit de entrega, com ou sem equipamento avulso: até 15 km, o frete já vem no kit; acima disso, só os km além dos 15 km, pela mesma conta e sem mínimo.',
      'Pedido só de serviços ou só com kit de retirada não tem frete.',
      'Pedágio: quando houver no caminho, entra na proposta como outro item, com o valor estimado.',
      'Cupom de desconto: vale só para os itens; não desconta o frete nem o pedágio.',
    ]) {
      expect(allText).toContain(norm(fragment));
    }
    // Acabou o "dentro de BH = R$ 0" e o "grátis até 15 km".
    expect(allText).not.toContain('item de R$ 0,00');
    expect(allText).not.toMatch(/km grátis|grátis até/);
  });

  it('quem somos: nome empresarial completo, CNPJ, endereço com CEP, WhatsApp do site, e-mail e prazo de resposta', () => {
    const text = sectionText('quem-somos');
    for (const fragment of [
      'Esta política vale para as reservas da X Produções e Eventos: nome empresarial 55.343.824 ERNANE MOURA DA SILVA, CNPJ 55.343.824/0001-56',
      "Rua Flor d'Água, 407, Jardim Alvorada, Belo Horizonte - MG, CEP 30810-310",
      'suporte@xproducoeseeventos.com.br',
      `WhatsApp ${formatPhoneDisplay(getWhatsAppPhone())}`,
      'Atendimento: respondemos em até 5 dias.',
    ]) {
      expect(text).toContain(norm(fragment));
    }
    expect(allText).not.toContain('ERNANE M. S.');
  });
});

describe('P17 — página /politica-de-reserva', () => {
  it('mostra todas as seções do arquivo de dados, na ordem, com cada parágrafo, cada item e cada tabela', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: RESERVATION_POLICY_TITLE })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => norm(h.textContent ?? ''))).toEqual(
      RESERVATION_POLICY_SECTIONS.map((section, index) => `${index + 1}. ${section.title}`)
    );

    for (const section of RESERVATION_POLICY_SECTIONS) {
      const element = document.getElementById(section.id);
      expect(element, section.id).not.toBeNull();
      const shown = norm(element?.textContent ?? '');
      for (const text of blockTexts(section)) {
        expect(shown, section.id).toContain(norm(text));
      }
      for (const block of section.blocks) {
        if (block.kind !== 'list') continue;
        const lists = Array.from(element?.querySelectorAll(block.ordered ? 'ol' : 'ul') ?? []);
        expect(
          lists.some((list) => JSON.stringify(Array.from(list.querySelectorAll('li')).map((li) => norm(li.textContent ?? ''))) === JSON.stringify(block.items.map(norm))),
          section.id
        ).toBe(true);
      }
    }
  });

  it('as duas tabelas de cancelamento aparecem como tabelas, com título visível e em destaque', () => {
    renderPage();

    const section = within(document.getElementById('cancelamento-pelo-cliente') as HTMLElement);
    for (const [name, rows] of [
      ['Cancelamento pelo cliente final', RESERVATION_CANCELLATION_TABLES.ownEvent],
      ['Cancelamento pelo revendedor', RESERVATION_CANCELLATION_TABLES.resale],
    ] as const) {
      const table = section.getByRole('table', { name });
      const shownRows = within(table)
        .getAllByRole('row')
        .slice(1)
        .map((row) => Array.from(row.querySelectorAll('th, td')).map((cell) => norm(cell.textContent ?? '')));
      expect(shownRows).toEqual(rows.map((rule) => [rule.range, `${rule.percent}%`]));
      const box = table.parentElement as HTMLElement;
      expect(section.getByRole('heading', { level: 3, name })).toBeInTheDocument();
      expect(box.className).toContain('border-primary/40');
    }
  });

  it('as frases em destaque aparecem destacadas (negrito e borda)', () => {
    renderPage();

    for (const item of highlighted) {
      const element = screen.getByText(item.text);
      expect(element.tagName, item.text).toBe('P');
      expect(element.className, item.text).toContain('font-semibold');
      expect(element.className, item.text).toContain('border-primary/40');
    }
  });

  it('rascunho: aviso no topo, antes da primeira seção, e noindex, nofollow', async () => {
    renderPage();

    const notice = screen.getByRole('alert');
    expect(notice).toHaveTextContent(RESERVATION_POLICY_DRAFT_NOTICE);
    expect(RESERVATION_POLICY_DRAFT_NOTICE).toBe('Rascunho em revisão: este texto ainda não vale como política da X Produções.');
    const firstSection = screen.getAllByRole('heading', { level: 2 })[0];
    expect(notice.compareDocumentPosition(firstSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await waitFor(() => {
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
    });
    await waitFor(() => {
      expect(document.title).toBe('Política de reserva e cancelamento | X Produções');
    });
  });

  it('sem partes a confirmar, nenhuma marca "Texto proposto, a confirmar" aparece', () => {
    renderPage();

    expect(screen.queryAllByText(RESERVATION_POLICY_PENDING_LABEL)).toEqual([]);
  });

  it('a página não tem link para ela mesma (a trilha mostra o título sem link)', () => {
    renderPage();

    expect(document.querySelector(`a[href="${RESERVATION_POLICY_PATH}"]`)).toBeNull();
    expect(screen.getByText(RESERVATION_POLICY_TITLE, { selector: '[aria-current="page"]' })).toBeInTheDocument();
  });

  it('não tem violações de acessibilidade (tabelas com legenda e cabeçalhos, títulos em ordem)', async () => {
    const { container } = renderPage();
    expect(await axe(container)).toHaveNoViolations();
  });
});
