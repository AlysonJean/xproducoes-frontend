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
import { KIT_FULFILLMENT_SENTENCE } from '../../utils/kitInfo';

// P17 (aprovada em 02/11/2026): a "Política de reserva e cancelamento" fica montada e escondida até o dono e um
// advogado aprovarem o texto. Aqui: o conteúdo segue as respostas do dono (Q11, Q12, Q7, Q13) sem contradizer o
// que o site já diz (kit de entrega com a montagem no preço, frete por km, cupom fora do frete), a página mostra
// todas as seções do arquivo de dados e, enquanto não publicada, tem o aviso de rascunho e o noindex.

// formatPrice usa espaço não separável ("R$ 3,50"); o Testing Library normaliza o texto da página do mesmo jeito.
const norm = (text: string) => text.replace(/\s+/g, ' ').trim();

const blockTexts = (section: (typeof RESERVATION_POLICY_SECTIONS)[number]) =>
  section.blocks.flatMap((block) => (block.kind === 'paragraph' ? [block.text] : [...block.items]));

const allText = norm(RESERVATION_POLICY_SECTIONS.flatMap((section) => [section.title, ...blockTexts(section)]).join(' '));

// O que o dono ainda não respondeu: seções inteiras e parágrafos soltos (a frase da montagem do kit de entrega).
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

  it('só local/energia/clima, danos, foro e a frase da montagem do kit de entrega (o que o dono não respondeu) estão "a confirmar"', () => {
    expect(pendingSectionIds).toEqual(['local-energia-clima', 'danos', 'foro']);
    expect(pendingParagraphs.map((paragraph) => paragraph.sectionId)).toEqual(['o-que-esta-incluido']);
    expect(pendingParagraphs[0].text).toContain('e isso vem no preço do kit');
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
      'O técnico durante o evento, o frete e a montagem de equipamento avulso são cobrados à parte e aparecem como itens na proposta.',
    ]) {
      expect(allText).toContain(norm(fragment));
    }
  });

  it('o que está incluído não contradiz o site: o kit de entrega traz levar, montar e buscar no preço; o de retirada não tem frete', () => {
    // Q12 diz "montagem cobrada à parte", mas a página do kit diz que a equipe leva, monta e busca (premissa de
    // 06/11, utils/kitInfo.ts). A política não pode dizer que toda montagem é cobrada à parte.
    expect(allText).not.toContain('Técnico, montagem e frete são cobrados à parte');
    const [deliverySentence] = KIT_FULFILLMENT_SENTENCE.DELIVERY_SETUP.split('. ');
    expect(pendingParagraphs[0].text.toLowerCase()).toContain(deliverySentence.toLowerCase());
    expect(pendingParagraphs[0].text).toContain(
      'e isso vem no preço do kit. O frete pela distância (veja abaixo) e o técnico durante todo o evento, se você quiser, são cobrados à parte.'
    );
    expect(allText.toLowerCase()).toContain(norm(KIT_FULFILLMENT_SENTENCE.CLIENT_PICKUP).toLowerCase());
    expect(allText).toContain('Pedido só com kit de retirada não tem frete.');
    expect(allText).toContain(
      'Técnico durante todo o evento: é opcional. O preço do serviço vale até as horas indicadas nele; cada hora a mais do evento sai proporcional.'
    );
  });

  it('frete e pedágio pela regra do servidor (frete-km): 15 km grátis por trecho, R$ 3,50 por km, mínimo R$ 50, arredondado em R$ 10; cupom não desconta', () => {
    for (const fragment of [
      'Frete calculado pela distância: grátis até 15 km da X Produções; acima disso, R$ 3,50 por km rodado. O valor aparece na proposta.',
      'Os 15 km grátis e o preço do km valem para cada trecho: entrega e retirada são 2 viagens de ida e volta, ou seja, 4 trechos.',
      'Dentro desse raio, o frete aparece na proposta como item de R$ 0,00.',
      'Quando há km cobrado, o frete total tem no mínimo R$ 50,00 e é arredondado para cima em múltiplos de R$ 10,00.',
      'Pedágio: quando houver no caminho, entra na proposta como outro item, com o valor estimado.',
      'Cupom de desconto: vale só para os itens; não desconta o frete nem o pedágio.',
    ]) {
      expect(allText).toContain(norm(fragment));
    }
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

  it('as partes a confirmar, e só elas, levam a marca "Texto proposto, a confirmar" (a do kit fica junto da frase, não da seção)', () => {
    renderPage();

    const marks = screen.getAllByText(RESERVATION_POLICY_PENDING_LABEL);
    expect(marks.map((mark) => mark.closest('section')?.id)).toEqual(markedSectionIds);
    expect(markedSectionIds).toEqual(['o-que-esta-incluido', 'local-energia-clima', 'danos', 'foro']);
    // A marca do parágrafo fica num bloco só com a frase da montagem do kit de entrega.
    expect(norm(marks[0].parentElement?.textContent ?? '')).toBe(norm(`${RESERVATION_POLICY_PENDING_LABEL}${pendingParagraphs[0].text}`));
  });

  it('a página não tem link para ela mesma (a trilha mostra o título sem link)', () => {
    renderPage();

    expect(document.querySelector(`a[href="${RESERVATION_POLICY_PATH}"]`)).toBeNull();
    expect(screen.getByText(RESERVATION_POLICY_TITLE, { selector: '[aria-current="page"]' })).toBeInTheDocument();
  });
});
