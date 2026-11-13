import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ReservationPolicyPage } from '../ReservationPolicyPage';
import {
  RESERVATION_POLICY_DRAFT_NOTICE,
  RESERVATION_POLICY_PATH,
  RESERVATION_POLICY_PENDING_LABEL,
  RESERVATION_POLICY_PUBLISHED,
  RESERVATION_POLICY_TITLE,
  RESERVATION_POLICY_VERSION,
} from '../../data/reservationPolicy';
import { RESERVATION_POLICY_SECTIONS } from '../../data/reservationPolicyContent';
import { formatPhoneDisplay } from '../../data/site';
import { getWhatsAppPhone } from '../../utils/whatsapp';
import { freightRulesText } from '../../utils/freightInfo';
import { KIT_FULFILLMENT_SENTENCE } from '../../utils/kitInfo';

// P17 (aprovada em 02/11/2026): a "Política de reserva e cancelamento" fica montada e escondida até o dono e um
// advogado aprovarem o texto. Aqui: o conteúdo segue as respostas do dono (Q11, Q12, Q7, Q13) sem contradizer o
// que o site já diz (kit de entrega com a montagem no preço, frete por km, cupom fora do frete), a página mostra
// todas as seções do arquivo de dados e, enquanto não publicada, tem o aviso de rascunho e o noindex.
// Auditoria do orçamento (12/11/2026), E1–E4: a dona decidiu em 12/11 que o kit de entrega inclui montagem e frete
// até 15 km, que serviço que já vem no kit não é cobrado de novo e a regra nova do frete. A frase do kit de entrega
// deixou de ser "a confirmar", e saiu "Dentro desse raio, o frete aparece na proposta como item de R$ 0,00". O técnico
// durante o evento é cobrado à parte só quando o kit não o inclui (os Kits 05–08 já trazem o Técnico de Som). A
// política continua citando a primeira frase da página do kit (KIT_FULFILLMENT_SENTENCE).

// formatPrice usa espaço não separável ("R$ 3,50"); o Testing Library normaliza o texto da página do mesmo jeito.
const norm = (text: string) => text.replace(/\s+/g, ' ').trim();

const blockTexts = (section: (typeof RESERVATION_POLICY_SECTIONS)[number]) =>
  section.blocks.flatMap((block) => (block.kind === 'paragraph' ? [block.text] : [...block.items]));

const allText = norm(RESERVATION_POLICY_SECTIONS.flatMap((section) => [section.title, ...blockTexts(section)]).join(' '));

// O que o dono ainda não respondeu: seções inteiras e parágrafos soltos (hoje nenhum parágrafo solto).
const pendingSectionIds = RESERVATION_POLICY_SECTIONS.filter((section) => section.pendingConfirmation).map((section) => section.id);
const pendingParagraphs = RESERVATION_POLICY_SECTIONS.flatMap((section) =>
  section.blocks.flatMap((block) => (block.kind === 'paragraph' && block.pendingConfirmation ? [{ sectionId: section.id, text: block.text }] : []))
);
// As seções que mostram a marca, na ordem da página (uma marca por seção pendente e uma por parágrafo pendente).
const markedSectionIds = RESERVATION_POLICY_SECTIONS.flatMap((section) => [
  ...(section.pendingConfirmation ? [section.id] : []),
  ...section.blocks.filter((block) => block.kind === 'paragraph' && block.pendingConfirmation).map(() => section.id),
]);

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
  it('versão 2026-11, endereço /politica-de-reserva e ainda não publicada', () => {
    expect(RESERVATION_POLICY_VERSION).toBe('2026-11');
    expect(RESERVATION_POLICY_PATH).toBe('/politica-de-reserva');
    expect(RESERVATION_POLICY_PUBLISHED).toBe(false);
  });

  it('as seções seguem a ordem do guia aprovado', () => {
    expect(RESERVATION_POLICY_SECTIONS.map((section) => section.id)).toEqual([
      'quem-somos',
      'como-a-data-e-garantida',
      'o-que-esta-incluido',
      'pagamento',
      'arrependimento',
      'cancelamento-pelo-cliente',
      'remarcacao',
      'cancelamento-pela-empresa',
      'local-energia-clima',
      'danos',
      'foro',
    ]);
  });

  it('só local/energia/clima, danos e foro (o que o dono não respondeu) estão "a confirmar"; a frase do kit de entrega foi decidida em 12/11', () => {
    expect(pendingSectionIds).toEqual(['local-energia-clima', 'danos', 'foro']);
    expect(pendingParagraphs).toEqual([]);
  });

  it('a política não pode ser publicada com seção ou frase ainda a confirmar', () => {
    expect(RESERVATION_POLICY_PUBLISHED && pendingSectionIds.length + pendingParagraphs.length > 0).toBe(false);
  });

  it('traz as regras do Q11 e do Q12 com os números do dono', () => {
    for (const fragment of [
      'Ela vale por 7 dias',
      'Sinal: 50% do total da proposta, pago por PIX',
      'Saldo: os outros 50%, pagos até 48 horas antes do evento.',
      'Todo pagamento por PIX é feito só na chave PIX do CNPJ da X Produções',
      'Nunca pague em chave PIX de pessoa física.',
      'Você pode desistir em até 7 dias depois de aceitar a proposta e recebe de volta tudo o que pagou',
      'Código de Defesa do Consumidor, art. 49, e Decreto 7.962/2013',
      'pelo mesmo canal que você usou para contratar',
      'Mais de 30 dias antes: devolvemos o sinal, descontados 10% do valor total da reserva.',
      'De 30 a 8 dias antes: o sinal não é devolvido.',
      '7 dias ou menos antes: o sinal não é devolvido, e devolvemos o saldo já pago, descontados os custos comprovados.',
      'remarcar a reserva uma vez, sem custo, avisando com pelo menos 15 dias de antecedência, para uma nova data em até 6 meses',
      'devolve o sinal em dobro',
      'Código Civil, art. 418',
      'O frete, a montagem de equipamento avulso e o técnico durante o evento (quando o kit não o inclui) são cobrados à parte e aparecem como itens na proposta.',
    ]) {
      expect(allText).toContain(norm(fragment));
    }
  });

  it('o que está incluído (decisões de 12/11): o kit de entrega traz levar, montar, buscar e o frete até 15 km; serviço do kit não é cobrado de novo; o de retirada não tem frete', () => {
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
    expect(allText).toContain(
      norm(
        'Técnico durante todo o evento: é opcional quando o kit não o inclui. O preço do serviço vale até as horas indicadas nele; cada hora a mais do evento sai proporcional. ' +
          'Nos kits que já trazem o técnico de som, ele vem no preço do kit (e nas horas extras do kit) e não é cobrado de novo.'
      )
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

  it('quem somos: dados do Q7 e o WhatsApp do site (Q13)', () => {
    for (const fragment of [
      'nome empresarial 55.343.824 ERNANE M. S.',
      'CNPJ 55.343.824/0001-56',
      "Rua Flor d'Água, 407, Jardim Alvorada, Belo Horizonte - MG, CEP 30810-310",
      'suporte@xproducoeseeventos.com.br',
      `WhatsApp ${formatPhoneDisplay(getWhatsAppPhone())}`,
    ]) {
      expect(allText).toContain(norm(fragment));
    }
  });
});

describe('P17 — página /politica-de-reserva', () => {
  it('mostra todas as seções do arquivo de dados, na ordem, com cada parágrafo e cada item', () => {
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

  it('as partes a confirmar, e só elas, levam a marca "Texto proposto, a confirmar" (o que está incluído já não leva)', () => {
    renderPage();

    const marks = screen.getAllByText(RESERVATION_POLICY_PENDING_LABEL);
    expect(marks.map((mark) => mark.closest('section')?.id)).toEqual(markedSectionIds);
    expect(markedSectionIds).toEqual(['local-energia-clima', 'danos', 'foro']);
  });

  it('a página não tem link para ela mesma (a trilha mostra o título sem link)', () => {
    renderPage();

    expect(document.querySelector(`a[href="${RESERVATION_POLICY_PATH}"]`)).toBeNull();
    expect(screen.getByText(RESERVATION_POLICY_TITLE, { selector: '[aria-current="page"]' })).toBeInTheDocument();
  });
});
