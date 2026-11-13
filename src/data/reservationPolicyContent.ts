import {
  COMPANY_ADDRESS_LINE,
  COMPANY_CITY_LINE,
  COMPANY_CNPJ,
  COMPANY_POSTAL_CODE,
  COMPANY_REGISTERED_NAME,
  SITE_NAME,
  SUPPORT_EMAIL,
  formatPhoneDisplay,
} from './site';
import { getWhatsAppPhone } from '../utils/whatsapp';
import { freightRulesText, type FreightRules } from '../utils/freightInfo';

// P17 (aprovada em 02/11/2026): o texto da "Política de reserva e cancelamento", nas seções e na ordem do guia
// aprovado (quem somos; como a data é garantida; o que está incluído; sinal e saldo, com PIX só na chave do
// CNPJ; arrependimento; cancelamento por antecedência; remarcação; cancelamento pela empresa; local, energia e
// clima; danos; foro). Os números vêm só das respostas do dono: Q11 (pagamento, cancelamento, remarcação e
// "proposta vale 7 dias"), Q12 (técnico, montagem e frete como itens), Q7 e Q13 (dados da empresa e WhatsApp) e
// as decisões de 06/11 e 07/11 (kit por evento, técnico pelas horas, frete por km, pedágio à parte, cupom que não
// desconta frete nem pedágio). Auditoria do orçamento (12/11/2026), E4: a dona decidiu em 12/11 que o kit de entrega
// inclui a montagem e o frete até 15 km, que serviço que já vem no kit não é cobrado de novo e a regra nova do frete;
// a frase do kit de entrega deixou de ser "a confirmar". As seções e os parágrafos que o dono
// não respondeu trazem pendingConfirmation e aparecem com "Texto proposto, a confirmar"; o texto delas segue o
// que o site já diz no /briefing (BRIEFING_TERMS) e na página Garantia. A chave da publicação e a versão ficam em
// reservationPolicy.ts. Qualquer mudança aqui muda a versão (RESERVATION_POLICY_VERSION).

export type ReservationPolicyBlock =
  // pendingConfirmation num parágrafo: só aquela frase é texto sugerido (a seção inteira usa o campo da seção).
  | { kind: 'paragraph'; text: string; pendingConfirmation?: boolean }
  | { kind: 'list'; ordered: boolean; items: readonly string[] };

export interface ReservationPolicySection {
  id: string;
  title: string;
  blocks: readonly ReservationPolicyBlock[];
  /** O dono ainda não respondeu: texto sugerido, marcado "Texto proposto, a confirmar". */
  pendingConfirmation?: boolean;
}

// Frete por km (decisões do dono de 06/11/2026, item frete-km do lote 13; regra nova de 12/11, E4): a mesma frase do
// pedido de orçamento (freightRulesText) com os valores padrão da conta do servidor (backend
// services/freight/freightPricing.ts, freightConfig). Fixos aqui de propósito: o cliente aceita o texto desta versão.
// Se o dono mudar as chaves FREIGHT_* no Render, este texto muda junto, com versão nova.
const POLICY_FREIGHT: FreightRules = { pricePerKm: 3.5, freeKm: 15, minimum: 50, roundTo: 10, trips: 2 };

const whatsApp = formatPhoneDisplay(getWhatsAppPhone());

const paragraph = (text: string): ReservationPolicyBlock => ({ kind: 'paragraph', text });
const bullets = (...items: string[]): ReservationPolicyBlock => ({ kind: 'list', ordered: false, items });
const steps = (...items: string[]): ReservationPolicyBlock => ({ kind: 'list', ordered: true, items });

export const RESERVATION_POLICY_SECTIONS: readonly ReservationPolicySection[] = [
  {
    id: 'quem-somos',
    title: 'Quem somos',
    blocks: [
      paragraph(
        `Esta política vale para as reservas da ${SITE_NAME}: nome empresarial ${COMPANY_REGISTERED_NAME}, CNPJ ${COMPANY_CNPJ}, ${COMPANY_ADDRESS_LINE}, ${COMPANY_CITY_LINE}, CEP ${COMPANY_POSTAL_CODE}.`
      ),
      paragraph(`Fale com a gente pelo WhatsApp ${whatsApp} ou pelo e-mail ${SUPPORT_EMAIL}.`),
    ],
  },
  {
    id: 'como-a-data-e-garantida',
    title: 'Como a data do seu evento fica garantida',
    blocks: [
      paragraph('A data do seu evento só fica garantida depois destes quatro passos:'),
      steps(
        'Proposta: você recebe a proposta com os itens e o total. Ela vale por 7 dias; depois disso, vence.',
        'Aceite: você aceita a proposta dentro desses 7 dias.',
        'Sinal: você paga o sinal (veja "Sinal, saldo e forma de pagamento").',
        `Confirmação: depois de receber o sinal, a equipe da ${SITE_NAME} confirma a reserva.`
      ),
    ],
  },
  {
    id: 'o-que-esta-incluido',
    title: 'O que está incluído e o que é cobrado à parte',
    blocks: [
      paragraph('A proposta lista cada item com o seu valor e traz um total só: é esse total que você paga.'),
      // Auditoria do orçamento (12/11/2026), E1: os Kits 05–08 já trazem o Técnico de Som; o técnico só é cobrado à parte
      // quando o kit não o inclui.
      paragraph(
        'O frete, a montagem de equipamento avulso e o técnico durante o evento (quando o kit não o inclui) são cobrados à parte e aparecem como itens na proposta.'
      ),
      // Auditoria do orçamento (12/11/2026), E1–E4 (decisões da dona de 12/11): o kit de entrega inclui levar, montar e
      // buscar, com o frete até 15 km (a Logística do kit); serviço que já vem no kit não é cobrado de novo. A primeira
      // frase segue a da página do kit (utils/kitInfo.ts, KIT_FULFILLMENT_SENTENCE), que o teste da política cita.
      paragraph(
        `Kit de entrega e montagem: a equipe da ${SITE_NAME} leva o kit ao local do evento, monta e busca depois, e isso vem no preço do kit, com o frete até ${POLICY_FREIGHT.freeKm} km. Acima disso, só os km a mais entram como frete (veja abaixo). Serviço que já vem dentro do kit, como a montagem ou o técnico de som, não é cobrado de novo; o técnico durante todo o evento, quando o kit não o inclui, é cobrado à parte.`
      ),
      bullets(
        'Kit: o preço é por evento. Quando a página do kit indica horas incluídas, cada hora a mais sai pelo valor da hora extra do kit.',
        // Pedido só com kit de retirada não tem frete (decisão do dono de 06/11; needsFreight no servidor).
        `Kit de retirada: você retira o kit na ${SITE_NAME}, em Belo Horizonte, monta no local e devolve depois do evento. Pedido só com kit de retirada não tem frete.`,
        'Equipamento avulso: cobrado por hora ou por diária, como a página do equipamento indica.',
        // A mesma regra da caixa do técnico no pedido (utils/wholeEventService.ts) e da conta do servidor (serviceLine).
        // E1 (12/11/2026): no kit que já traz o técnico, ele vem no preço do kit (o servidor não cobra de novo).
        'Técnico durante todo o evento: é opcional quando o kit não o inclui. O preço do serviço vale até as horas indicadas nele; cada hora a mais do evento sai proporcional. Nos kits que já trazem o técnico de som, ele vem no preço do kit (e nas horas extras do kit) e não é cobrado de novo.',
        // Auditoria do orçamento (12/11/2026), E4: a regra inteira do frete (avulso, kit de entrega, trechos, mínimo,
        // arredondamento, pedágio, sem frete para só serviços ou só kit de retirada) está em freightRulesText. Saiu a
        // frase "Dentro desse raio, o frete aparece na proposta como item de R$ 0,00".
        freightRulesText(POLICY_FREIGHT),
        'Pedágio: quando houver no caminho, entra na proposta como outro item, com o valor estimado.',
        // Decisão de 07/11/2026 (bookingCrudService.ts): o cupom conta só os itens; frete e pedágio entram depois dele.
        'Cupom de desconto: vale só para os itens; não desconta o frete nem o pedágio.'
      ),
    ],
  },
  {
    id: 'pagamento',
    title: 'Sinal, saldo e forma de pagamento',
    blocks: [
      bullets(
        'Sinal: 50% do total da proposta, pago por PIX para garantir a data.',
        'Saldo: os outros 50%, pagos até 48 horas antes do evento.'
      ),
      paragraph(
        `Todo pagamento por PIX é feito só na chave PIX do CNPJ da ${SITE_NAME} (CNPJ ${COMPANY_CNPJ}). Nunca pague em chave PIX de pessoa física.`
      ),
    ],
  },
  {
    id: 'arrependimento',
    title: 'Desistência em até 7 dias (arrependimento)',
    blocks: [
      paragraph(
        'Você pode desistir em até 7 dias depois de aceitar a proposta e recebe de volta tudo o que pagou (Código de Defesa do Consumidor, art. 49, e Decreto 7.962/2013).'
      ),
      paragraph('Para desistir, basta avisar pelo mesmo canal que você usou para contratar, como o WhatsApp ou o e-mail.'),
    ],
  },
  {
    id: 'cancelamento-pelo-cliente',
    title: 'Cancelamento pelo cliente depois dos 7 dias',
    blocks: [
      paragraph('Passados os 7 dias para desistir, se você cancelar a reserva, vale a antecedência em relação à data do evento:'),
      bullets(
        'Mais de 30 dias antes: devolvemos o sinal, descontados 10% do valor total da reserva.',
        'De 30 a 8 dias antes: o sinal não é devolvido.',
        '7 dias ou menos antes: o sinal não é devolvido, e devolvemos o saldo já pago, descontados os custos comprovados.'
      ),
    ],
  },
  {
    id: 'remarcacao',
    title: 'Remarcação',
    blocks: [
      paragraph(
        'Você pode remarcar a reserva uma vez, sem custo, avisando com pelo menos 15 dias de antecedência, para uma nova data em até 6 meses.'
      ),
    ],
  },
  {
    id: 'cancelamento-pela-empresa',
    title: `Cancelamento pela ${SITE_NAME}`,
    blocks: [
      paragraph(
        `Se a ${SITE_NAME} cancelar a reserva, devolve o sinal em dobro: o valor pago e mais o mesmo valor (Código Civil, art. 418).`
      ),
    ],
  },
  {
    id: 'local-energia-clima',
    title: 'Local, energia e clima',
    pendingConfirmation: true,
    blocks: [
      paragraph('Energia elétrica adequada no local e as licenças do evento (como ECAD e prefeitura) são de responsabilidade de quem contrata.'),
      paragraph('Mudanças no local, no horário, no público ou na energia podem alterar o valor.'),
      paragraph('Em evento ao ar livre, a proteção dos equipamentos contra chuva é combinada antes do evento.'),
    ],
  },
  {
    id: 'danos',
    title: 'Danos aos equipamentos',
    pendingConfirmation: true,
    blocks: [
      paragraph(
        'Danos aos equipamentos causados por mau uso, pelo público ou por convidados são de responsabilidade de quem contrata, que paga o conserto ou a reposição.'
      ),
      paragraph(`Falhas dos equipamentos que não venham de mau uso são de responsabilidade da ${SITE_NAME}.`),
    ],
  },
  {
    id: 'foro',
    title: 'Foro',
    pendingConfirmation: true,
    blocks: [
      paragraph(
        'Fica eleito o foro de Belo Horizonte - MG. Quem contrata como consumidor pode sempre entrar com ação no foro da própria cidade (Código de Defesa do Consumidor, art. 101).'
      ),
    ],
  },
];
