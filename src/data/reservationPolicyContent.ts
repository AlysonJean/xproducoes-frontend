import {
  COMPANY_CNPJ,
  COMPANY_FULL_ADDRESS,
  COMPANY_LEGAL_NAME,
  COMPANY_REGISTERED_NAME,
  SITE_NAME,
  SUPPORT_EMAIL,
  SUPPORT_RESPONSE_LABEL,
  formatPhoneDisplay,
} from './site';
import { getWhatsAppPhone } from '../utils/whatsapp';
import { freightRulesText, type FreightRules } from '../utils/freightInfo';

// P17 (aprovada em 02/11/2026): o texto da "Política de reserva e cancelamento". A chave da publicação e a versão
// ficam em reservationPolicy.ts. Qualquer mudança aqui muda a versão (RESERVATION_POLICY_VERSION).
// Textos legais (13/11/2026): texto reescrito pelas regras que Alyson decidiu em 12 e 13/11 e pela pesquisa jurídica
// de 13/11 (roteiro do orçamento em PDF e do aceite online): "parcela inicial do preço" no lugar de "sinal" (que no
// Código Civil vira arras, com devolução em dobro), prazos da parcela inicial e do saldo, atraso pela taxa legal do
// art. 406 do Código Civil e IPCA, desistência em 7 dias com o botão "Desistir da contratação", as duas tabelas de
// cancelamento (cliente final e revendedor) com a retenção limitada ao valor pago e a multa recíproca, remarcação,
// hora adicional, danos, energia, força maior (chuva comum não é), ECAD e lei do silêncio, foro e aceite eletrônico
// com código no e-mail. As seções que limitam direitos vêm em destaque (Código de Defesa do Consumidor, art. 54,
// § 4º). Nenhuma seção ficou "a confirmar"; a página continua escondida até o advogado aprovar.
// Revisão (13/11/2026): o aceite pelo site e o botão "Desistir da contratação" ficam no condicional, porque o aceite
// online nasce desligado (CONTRACTS_ENABLED=false) e hoje o aceite é por escrito à equipe; o consumidor mantém a
// reparação de outros prejuízos quando a X Produções cancela (CDC, arts. 6º, VI, e 51, I); o desconto das despesas
// com terceiros na força maior também vem em destaque.

export type ReservationPolicyBlock =
  // pendingConfirmation num parágrafo: só aquela frase é texto sugerido (a seção inteira usa o campo da seção).
  // highlight: cláusula que limita direitos, em destaque.
  | { kind: 'paragraph'; text: string; pendingConfirmation?: boolean; highlight?: boolean }
  | { kind: 'list'; ordered: boolean; items: readonly string[] }
  // As tabelas de cancelamento: a página as mostra sempre em destaque, com o título (caption) visível.
  | { kind: 'table'; caption: string; columns: readonly string[]; rows: readonly (readonly string[])[] };

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

/**
 * Textos legais (13/11/2026): retenção sobre o valor total da contratação, pela antecedência do aviso de cancelamento
 * (decisão de Alyson de 13/11/2026). Cliente final: pessoa física, ou empresa que contrata para um evento dela.
 * Revendedor: produtora, agência, cerimonial, buffet ou casa de eventos que revende ou integra o serviço no evento de
 * outra pessoa (sem o prazo de desistência).
 */
export const RESERVATION_CANCELLATION_TABLES = {
  ownEvent: [
    { range: '61 dias ou mais antes do evento', percent: 10 },
    { range: 'De 60 a 31 dias antes', percent: 20 },
    { range: 'De 30 a 15 dias antes', percent: 30 },
    { range: 'De 14 a 8 dias antes', percent: 40 },
    { range: '7 dias ou menos antes, ou não comparecimento', percent: 50 },
  ],
  resale: [
    { range: '61 dias ou mais antes do evento', percent: 20 },
    { range: 'De 60 a 31 dias antes', percent: 30 },
    { range: 'De 30 a 8 dias antes', percent: 50 },
    { range: '7 dias ou menos antes, ou não comparecimento', percent: 70 },
  ],
} as const;

const CANCELLATION_COLUMNS = ['Quando você cancela', 'Fica retido do valor total'] as const;

const cancellationRows = (rules: readonly { range: string; percent: number }[]) =>
  rules.map((rule) => [rule.range, `${rule.percent}%`] as const);

const whatsApp = formatPhoneDisplay(getWhatsAppPhone());

const paragraph = (text: string): ReservationPolicyBlock => ({ kind: 'paragraph', text });
const highlight = (text: string): ReservationPolicyBlock => ({ kind: 'paragraph', text, highlight: true });
const bullets = (...items: string[]): ReservationPolicyBlock => ({ kind: 'list', ordered: false, items });
const steps = (...items: string[]): ReservationPolicyBlock => ({ kind: 'list', ordered: true, items });
const table = (caption: string, rows: readonly (readonly string[])[]): ReservationPolicyBlock => ({
  kind: 'table',
  caption,
  columns: CANCELLATION_COLUMNS,
  rows,
});

export const RESERVATION_POLICY_SECTIONS: readonly ReservationPolicySection[] = [
  {
    id: 'quem-somos',
    title: 'Quem somos',
    blocks: [
      paragraph(
        `Esta política vale para as reservas da ${COMPANY_LEGAL_NAME}: nome empresarial ${COMPANY_REGISTERED_NAME}, CNPJ ${COMPANY_CNPJ}, ${COMPANY_FULL_ADDRESS}.`
      ),
      paragraph(`Fale com a gente pelo WhatsApp ${whatsApp} ou pelo e-mail ${SUPPORT_EMAIL}. ${SUPPORT_RESPONSE_LABEL}.`),
    ],
  },
  {
    id: 'como-a-data-fica-reservada',
    title: 'Como a data do seu evento fica reservada',
    blocks: [
      paragraph('A data do seu evento só fica reservada depois destes quatro passos:'),
      steps(
        'Proposta: você recebe a proposta com os itens e o total. Ela vale por 7 dias; depois disso, vence.',
        'Aceite: você aceita a proposta dentro desses 7 dias, por escrito à equipe (pelo WhatsApp ou pelo e-mail) ou, quando a proposta oferecer, pelo site (veja "Aceite pelo site").',
        'Parcela inicial: você paga a parcela inicial do preço no prazo (veja "Parcela inicial, saldo e forma de pagamento").',
        `Reserva: com a parcela inicial paga, a data fica reservada e a equipe da ${SITE_NAME} confirma a reserva.`
      ),
      paragraph('Enquanto a parcela inicial não é paga, a data não fica reservada e pode ser contratada por outra pessoa.'),
    ],
  },
  {
    id: 'aceite-eletronico',
    title: 'Aceite pelo site',
    blocks: [
      paragraph(
        'Quando a proposta oferecer o aceite pelo site, antes de aceitar você vê o resumo da contratação (o que está sendo contratado, data, local, valor total, parcela inicial e saldo com as datas, frete, cancelamento, danos e foro) e o texto completo do contrato, que pode salvar e imprimir.'
      ),
      paragraph(
        'Para aceitar pelo site, você marca a caixa de concordância (ela vem desmarcada), digita o código de 6 dígitos que enviamos ao seu e-mail e clica em "Aceito".'
      ),
      paragraph(
        'Esse aceite vale como assinatura eletrônica, mesmo sem certificado digital ICP-Brasil (Medida Provisória 2.200-2/2001, art. 10, § 2º; Código Civil, arts. 107 e 425; Código de Processo Civil, art. 411, II).'
      ),
      paragraph(
        'Guardamos o registro do aceite: nome e CPF ou CNPJ (e, se for empresa, nome, CPF e cargo de quem aceita, que declara ter poderes para representá-la), o e-mail que recebeu o código, a data e a hora (horário de Brasília), o endereço IP, o navegador e o aparelho, a versão do contrato e a impressão digital do arquivo (hash SHA-256).'
      ),
      paragraph(
        'O contrato aceito fica guardado sem alteração. Logo depois do aceite, você recebe por e-mail a cópia em PDF e o comprovante do aceite, e o contrato fica disponível para baixar.'
      ),
      paragraph('Mudanças no contrato só valem se forem aceitas da mesma forma ou por outro meio escrito que identifique as partes.'),
    ],
  },
  {
    id: 'o-que-esta-incluido',
    title: 'O que você contrata e o que é cobrado à parte',
    blocks: [
      paragraph(
        'A contratação é a locação de equipamentos de som e iluminação e a prestação dos serviços de montagem, operação técnica e desmontagem que estiverem na proposta.'
      ),
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
        // Textos legais (13/11/2026): equipamento avulso por diária (EQUIPMENT_PRICE_UNIT=day). Era "por hora ou por diária".
        'Equipamento avulso: o preço é por diária, como a página do equipamento indica.',
        // A mesma regra da caixa do técnico no pedido (utils/wholeEventService.ts) e da conta do servidor (serviceLine).
        // E1 (12/11/2026): no kit que já traz o técnico, ele vem no preço do kit (o servidor não cobra de novo).
        'Técnico durante todo o evento: é opcional quando o kit não o inclui. O preço do serviço vale até as horas indicadas nele; cada hora a mais do evento sai proporcional. Nos kits que já trazem o técnico de som, ele vem no preço do kit (e nas horas extras do kit) e não é cobrado de novo.',
        // Auditoria do orçamento (12/11/2026), E4: a regra inteira do frete (avulso, kit de entrega, trechos, mínimo,
        // arredondamento, pedágio, sem frete para só serviços ou só kit de retirada) está em freightRulesText.
        freightRulesText(POLICY_FREIGHT),
        'Pedágio: quando houver no caminho, entra na proposta como outro item, com o valor estimado.',
        // Decisão de 07/11/2026 (bookingCrudService.ts): o cupom conta só os itens; frete e pedágio entram depois dele.
        'Cupom de desconto: vale só para os itens; não desconta o frete nem o pedágio.'
      ),
      paragraph(
        'O que não aparece na proposta não está incluído, como palco e estruturas, gerador ou cobertura dos equipamentos contra chuva, salvo se combinado por escrito.'
      ),
    ],
  },
  {
    id: 'pagamento',
    title: 'Parcela inicial, saldo e forma de pagamento',
    blocks: [
      bullets(
        'Parcela inicial do preço: 50% do total da proposta, por PIX, em até 3 dias corridos depois do aceite (em até 1 dia, se faltarem menos de 5 dias para o evento). A data só fica reservada depois que ela é paga.',
        'Saldo: os outros 50%, pagos até 48 horas antes do evento.'
      ),
      paragraph(
        `Todo pagamento por PIX é feito só na chave PIX do CNPJ da ${SITE_NAME} (CNPJ ${COMPANY_CNPJ}). Nunca pague em chave PIX de pessoa física.`
      ),
      highlight(
        'Atraso no pagamento: multa de 2% sobre o valor em atraso, juros de mora pela taxa legal do Código Civil (art. 406), divulgada pelo Banco Central, e atualização pelo IPCA, do IBGE.'
      ),
    ],
  },
  {
    id: 'arrependimento',
    title: 'Desistência em até 7 dias (arrependimento)',
    blocks: [
      paragraph(
        'Se você contrata para o seu próprio evento (pessoa física, ou empresa que contrata para um evento dela), pode desistir em até 7 dias corridos depois do aceite, sem custo e sem precisar dizer o motivo, mesmo que o evento caia dentro desse prazo. Devolvemos tudo o que você pagou, de imediato (Código de Defesa do Consumidor, art. 49, e Decreto 7.962/2013, art. 5º).'
      ),
      paragraph(
        `Para desistir, avise pelo e-mail ${SUPPORT_EMAIL} ou pelo WhatsApp ${whatsApp}. Se você aceitou pelo site, também pode usar o botão "Desistir da contratação" na página da proposta ou na sua área do cliente. Enviamos a confirmação da desistência logo que a recebemos.`
      ),
      paragraph(
        'Quem contrata para revender ou produzir o evento de outra pessoa não tem esse prazo de desistência: vale a tabela de cancelamento do revendedor.'
      ),
    ],
  },
  {
    id: 'cancelamento-pelo-cliente',
    title: 'Cancelamento pelo cliente',
    blocks: [
      paragraph(
        'Se você cancelar fora do prazo de desistência (para o revendedor, a qualquer momento depois do aceite), fica retida uma parte do valor total da contratação. A parte depende da antecedência do aviso e de quem contrata.'
      ),
      paragraph(
        'Cliente final é quem contrata para o próprio evento (pessoa física, ou empresa que contrata para um evento dela). Revendedor é quem revende ou integra o nosso serviço no evento de outra pessoa (produtora, agência, cerimonial, buffet ou casa de eventos). No aceite, perguntamos: "Você contrata para o seu próprio evento ou para revender/produzir o evento de outra pessoa?"'
      ),
      table('Cancelamento pelo cliente final', cancellationRows(RESERVATION_CANCELLATION_TABLES.ownEvent)),
      table('Cancelamento pelo revendedor', cancellationRows(RESERVATION_CANCELLATION_TABLES.resale)),
      highlight(
        'A retenção fica limitada ao valor que você já pagou, sem outros custos, salvo repasses de terceiros discriminados na proposta.'
      ),
      paragraph(
        'Exemplo (cliente final): total de R$ 2.000,00, com R$ 1.000,00 pagos, cancelado 20 dias antes do evento. Ficam retidos 30% do total (R$ 600,00), e devolvemos R$ 400,00.'
      ),
    ],
  },
  {
    id: 'remarcacao',
    title: 'Remarcação',
    blocks: [
      paragraph(
        'Você pode remarcar a reserva uma vez, sem custo, avisando com pelo menos 15 dias de antecedência, para uma nova data em até 6 meses, conforme a agenda, com os mesmos itens e o mesmo preço.'
      ),
      paragraph('Se não houver data disponível, vale a tabela de cancelamento, contada da data original do evento.'),
      paragraph(`Remarcação por força maior ou a pedido da ${SITE_NAME} não conta como a sua remarcação sem custo.`),
    ],
  },
  {
    id: 'cancelamento-pela-empresa',
    title: `Cancelamento pela ${SITE_NAME}`,
    blocks: [
      paragraph(
        `Se a ${SITE_NAME} cancelar sem justa causa, devolve tudo o que você pagou e paga a você uma multa igual à que você pagaria se cancelasse na mesma data, pela mesma tabela.`
      ),
      paragraph(
        'Se você contrata como consumidor, essa multa não impede que você peça a reparação de outros prejuízos que comprovar (Código de Defesa do Consumidor, art. 6º, VI).'
      ),
      paragraph('Cancelamento por força maior segue a seção "Força maior e chuva".'),
    ],
  },
  {
    id: 'hora-adicional',
    title: 'Horas adicionais',
    blocks: [
      paragraph(
        'O evento só passa do horário combinado se você pedir e autorizar por escrito no dia (pelo WhatsApp ou outro meio escrito) e se a equipe estiver disponível.'
      ),
      paragraph(
        'Cada hora adicional tem preço definido: no kit, o valor da hora extra do kit; nos demais casos, o valor por hora informado na proposta.'
      ),
      paragraph('Sem a sua autorização por escrito, nenhuma hora adicional é cobrada.'),
    ],
  },
  {
    id: 'local-energia-informacoes',
    title: 'Local, energia e informações do evento',
    blocks: [
      paragraph(
        'Quem contrata providencia o ponto de energia no local, como pede a proposta, e passa informações corretas sobre o evento (endereço, acesso, horários, público e estrutura do local).'
      ),
      highlight(
        `A ${SITE_NAME} não responde por falha da rede elétrica ou da instalação do local nem por problema causado por informação errada, salvo se ela forneceu o gerador ou se a falha vier dos equipamentos ou da equipe dela.`
      ),
      paragraph('Mudanças no local, no horário, no público ou na energia podem alterar o valor e só valem depois de combinadas por escrito.'),
    ],
  },
  {
    id: 'danos',
    title: 'Danos aos equipamentos',
    blocks: [
      highlight(
        'Quem contrata responde por dano, perda, furto ou extravio dos equipamentos durante o evento ou enquanto eles estiverem sob a sua guarda, inclusive quando causados por convidados.'
      ),
      bullets(
        `Não entram: o desgaste natural, defeito do equipamento, falha da equipe da ${SITE_NAME} e força maior comprovada.`,
        'A indenização é o valor do conserto comprovado ou, quando não houver conserto, o valor de mercado de um equipamento equivalente.',
        `A ${SITE_NAME} avisa com fotos em até 48 horas depois do fim do evento ou da devolução, e você pode contestar em até 5 dias úteis.`,
        'Quando os equipamentos ficam com você sem a nossa equipe (como no kit de retirada), conferimos juntos uma lista com fotos na entrega e na devolução.'
      ),
    ],
  },
  {
    id: 'forca-maior',
    title: 'Força maior e chuva',
    blocks: [
      paragraph(
        'São força maior, entre outros: ordem de autoridade sem culpa de nenhuma das partes, calamidade, falta de energia generalizada e tempestade que impeça operar com segurança.'
      ),
      highlight(
        'Nesses casos, o evento pode ser remarcado sem custo para uma data em até 12 meses ou, se você preferir, devolvemos o que você pagou, menos as despesas com terceiros já feitas e comprovadas.'
      ),
      highlight(
        `Chuva comum não é força maior. Em evento ao ar livre, a cobertura dos equipamentos é de quem contrata, salvo se a cobertura da ${SITE_NAME} estiver na proposta. Com chuva, a equipe pode desligar e proteger os equipamentos.`
      ),
    ],
  },
  {
    id: 'licencas-e-som',
    title: 'Direitos autorais, licenças e limite de som',
    blocks: [
      paragraph(
        'Quem contrata é o organizador do evento: cuida das licenças e alvarás, paga os direitos autorais das músicas ao ECAD (Lei 9.610/1998, arts. 68 e 110) e cumpre as regras do local e as regras de som do município (em Belo Horizonte, a Lei municipal 9.505/2008).'
      ),
      paragraph(
        `A equipe da ${SITE_NAME} opera o som dentro desses limites. Baixar o volume ou desligar o som por ordem de autoridade não é descumprimento do contrato.`
      ),
      highlight(
        `Se a ${SITE_NAME} for cobrada por uma obrigação que era de quem contrata (como a taxa do ECAD ou uma multa por falta de alvará), ela pode cobrar esse valor de quem contrata.`
      ),
    ],
  },
  {
    id: 'dados',
    title: 'Seus dados',
    blocks: [
      paragraph(
        'Nome ou razão social, CPF ou CNPJ, e-mail, telefone e endereço de quem contrata são necessários para emitir e cumprir o contrato. O contrato e o registro do aceite ficam guardados por 10 anos depois do fim do contrato. Os detalhes estão na Política de Privacidade, na seção "Dados de orçamentos e contratos".'
      ),
    ],
  },
  {
    id: 'foro',
    title: 'Foro',
    blocks: [
      paragraph(
        'Se você contrata como consumidor, as ações sobre o contrato correm no foro da cidade onde você mora (Código de Defesa do Consumidor, art. 101). Nos demais casos, fica eleito o foro de Belo Horizonte - MG.'
      ),
    ],
  },
];
