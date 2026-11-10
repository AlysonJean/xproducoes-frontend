import {
  COMPANY_ADDRESS_LINE,
  COMPANY_CITY_LINE,
  COMPANY_CNPJ,
  COMPANY_LEGAL_NAME,
  COMPANY_POSTAL_CODE,
  SUPPORT_EMAIL,
} from './site';
import { GOOGLE_ANALYTICS_TRANSFER_NOTICE, INSTAGRAM_PLAYER_NOTICE } from './cookiePolicy';

// D8c (aprovada em 02/11/2026), parte 4: "política de privacidade nova, escrita a partir do que o sistema faz (empresa,
// canal, tabela 'dado, finalidade, base legal, prazo', serviços usados e transferência para fora do país, cookies,
// direitos, fotos do mural, backups)". O texto anterior citava um provedor de pagamento e a finalidade "personalizar a
// experiência", que não existem. O inventário foi conferido no código dos dois repositórios em 09/11/2026; cada
// serviço da tabela tem um uso no código ou na configuração (detalhes no plano do lote 15, item politica).
// Os prazos são os do Q8 (respostas do dono de 02/11/2026). A exclusão da conta é a do item d8c-excluir do lote 15,
// publicado junto com esta versão. Mudou o texto, mude PRIVACY_POLICY_UPDATED_AT.
// Pedido do dono de 09/11/2026 (Instagram): entram a linha "Meta (Instagram)" e a frase do player dos vídeos, no mesmo
// dia da versão acima (a data continua 09/11/2026).

/** Data da última revisão do texto (como LAST_UPDATED dos Termos). */
export const PRIVACY_POLICY_UPDATED_AT = '09/11/2026';

export const PRIVACY_POLICY_TITLE = 'Política de Privacidade';

export const PRIVACY_POLICY_DESCRIPTION = `Como a ${COMPANY_LEGAL_NAME} trata seus dados: o que guarda, para quê, com quem e por quanto tempo. Atualizada em ${PRIVACY_POLICY_UPDATED_AT}.`;

/**
 * Q7: o nome empresarial do Cartão CNPJ (src/data/site.ts, COMPANY_REGISTERED_NAME) ainda está "a conferir". Enquanto
 * for null, a política mostra só o nome fantasia. Depois que o dono conferir, troque null por COMPANY_REGISTERED_NAME
 * (importado de './site') e ajuste o teste src/pages/__tests__/privacidade.d8c.test.tsx: este é o único lugar a mudar.
 */
export const PRIVACY_CONTROLLER_REGISTERED_NAME: string | null = null;

export interface PrivacyPolicyLink {
  label: string;
  href: string;
}

export type PrivacyPolicyBlock =
  // link: vai no fim do parágrafo (interno com "/", e-mail com "mailto:"). highlight: frase em destaque (art. 33, VIII).
  | { kind: 'paragraph'; text: string; link?: PrivacyPolicyLink; highlight?: boolean }
  | { kind: 'list'; items: readonly string[] }
  | { kind: 'table'; caption: string; columns: readonly string[]; rows: readonly (readonly string[])[] };

export interface PrivacyPolicySection {
  id: string;
  title: string;
  blocks: readonly PrivacyPolicyBlock[];
}

const supportEmailLink: PrivacyPolicyLink = { label: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` };
const lgpdPageLink: PrivacyPolicyLink = { label: 'LGPD', href: '/lgpd' };

const paragraph = (text: string, link?: PrivacyPolicyLink): PrivacyPolicyBlock => ({ kind: 'paragraph', text, link });
const highlight = (text: string): PrivacyPolicyBlock => ({ kind: 'paragraph', text, highlight: true });
const bullets = (...items: string[]): PrivacyPolicyBlock => ({ kind: 'list', items });

const controllerName = PRIVACY_CONTROLLER_REGISTERED_NAME
  ? `${COMPANY_LEGAL_NAME} (nome empresarial ${PRIVACY_CONTROLLER_REGISTERED_NAME})`
  : COMPANY_LEGAL_NAME;

const SAME_AS_BOOKING = 'O mesmo da reserva: 5 anos se ela foi contratada ou paga; 12 meses se não foi.';
const ACCOUNTING_TERM = '5 anos contados de 1º de janeiro do ano seguinte ao evento';

export const PRIVACY_POLICY_SECTIONS: readonly PrivacyPolicySection[] = [
  {
    id: 'quem-cuida',
    title: 'Quem cuida dos seus dados',
    blocks: [
      paragraph(
        `A ${COMPANY_LEGAL_NAME} é a controladora dos dados tratados neste site: é ela quem decide como e para quê eles são usados.`
      ),
      bullets(
        `Nome: ${controllerName}`,
        `CNPJ: ${COMPANY_CNPJ}`,
        `Endereço: ${COMPANY_ADDRESS_LINE}, ${COMPANY_CITY_LINE}, CEP ${COMPANY_POSTAL_CODE}`,
        `E-mail: ${SUPPORT_EMAIL}`
      ),
      paragraph(
        'Esta política vale para o site e para tudo o que ele oferece: pedidos de orçamento, área do cliente, área do colaborador, painel da equipe e mural de fotos dos eventos.'
      ),
    ],
  },
  {
    id: 'canal',
    title: 'Fale com a gente sobre seus dados',
    blocks: [
      paragraph('Para qualquer pedido ou dúvida sobre seus dados pessoais, escreva para', supportEmailLink),
      paragraph(`Quem lê e responde é a própria ${COMPANY_LEGAL_NAME}, por esse mesmo e-mail.`),
      paragraph(
        `A ${COMPANY_LEGAL_NAME} é um agente de tratamento de pequeno porte. Pela Resolução CD/ANPD nº 2/2022, ela não precisa indicar um encarregado de dados, mas mantém este canal para atender você.`
      ),
    ],
  },
  {
    id: 'dados',
    title: 'Quais dados tratamos, para quê e por quanto tempo',
    blocks: [
      paragraph('A tabela mostra cada tipo de dado, para que ele serve, a base legal da LGPD (art. 7º) e o prazo de guarda.'),
      {
        kind: 'table',
        caption: 'Dados tratados, finalidade, base legal e prazo',
        columns: ['Dado', 'Para quê', 'Base legal (LGPD, art. 7º)', 'Por quanto tempo'],
        rows: [
          [
            'Conta e perfil: nome, e-mail, senha (guardada de forma embaralhada, que ninguém consegue ler), telefone, foto, empresa, cargo, endereço e outros dados do perfil que você preencher, preferências, favoritos, carrinho e notificações. No login com Google: nome, e-mail e foto do Google.',
            'Criar e manter sua conta, deixar você entrar e acompanhar seus pedidos e reservas.',
            'Execução de contrato e dos passos antes dele, a seu pedido (inciso V).',
            'Enquanto a conta existir. Na exclusão, veja "Exclusão da conta" abaixo.',
          ],
          [
            'Pedidos de orçamento e reservas: data e horário, endereço e informações do local do evento, contato no local, seu nome, e-mail e telefone, itens, valores, frete, cupom, observações, respostas do briefing e arquivos enviados.',
            'Fazer a proposta, calcular o frete, montar a equipe, realizar o evento, cobrar e cumprir o contrato.',
            'Execução de contrato e dos passos antes dele (inciso V). Depois do evento, cumprimento de obrigação legal, como guardar os documentos da contabilidade (inciso II), e defesa de direitos (inciso VI).',
            `Pedidos que não viraram contrato: 12 meses depois do pedido. Reservas contratadas ou pagas: ${ACCOUNTING_TERM}.`,
          ],
          [
            'Comprovantes de pagamento e outros arquivos da reserva.',
            `Confirmar o pagamento e guardar o registro da contabilidade. O arquivo é privado: só você e a administração da ${COMPANY_LEGAL_NAME} abrem, por um link que vale 5 minutos.`,
            'Execução de contrato (inciso V) e cumprimento de obrigação legal (inciso II).',
            SAME_AS_BOOKING,
          ],
          [
            'Formulário de contato: nome, e-mail, telefone, assunto, tipo e data do evento, faixa de orçamento e mensagem.',
            'Responder você. A mensagem também chega por e-mail à equipe.',
            'Passos antes de um contrato, a seu pedido (inciso V), ou legítimo interesse em responder quem nos procura (inciso IX).',
            '12 meses depois do envio.',
          ],
          [
            'Chat da reserva: mensagens e arquivos trocados sobre o evento. Hoje ele é usado pela equipe; você fala com a equipe pelo WhatsApp ou pelo e-mail.',
            'Combinar e realizar o evento.',
            'Execução de contrato (inciso V).',
            SAME_AS_BOOKING,
          ],
          [
            'Avaliações: nota, comentário, fotos e notas por critério.',
            'Mostrar a opinião dos clientes no site. A avaliação aparece com o seu nome e a foto do seu perfil.',
            'Consentimento (inciso I): você escolhe avaliar e pode pedir para tirar.',
            'Enquanto a conta existir ou até você pedir para tirar. Na exclusão da conta, fica só a nota, sem o comentário e as fotos.',
          ],
          [
            'Fotos do mural enviadas pelo QR Code do evento, com o nome ou @ e a legenda que você escrever.',
            'Mostrar no telão do evento.',
            'Consentimento (inciso I): você escolhe enviar.',
            'Apagadas 90 dias depois do evento. Se você pedir, a foto sai do telão antes.',
          ],
          [
            'Dados de colaboradores: nome, e-mail, telefone, foto, função, especialidades, experiência, portfólio, certificações, idiomas, equipamentos, raio de atendimento, disponibilidade, escalas, horas, valores, chave PIX e dados bancários, pagamentos e despesas com recibo.',
            'Montar a equipe de cada evento, pagar e prestar contas.',
            'Execução de contrato (inciso V) e cumprimento de obrigação legal (inciso II).',
            `Enquanto a pessoa fizer parte da equipe. Os pagamentos de reservas contratadas seguem o prazo da contabilidade: ${ACCOUNTING_TERM}.`,
          ],
          [
            'Registros de acesso e segurança: endereço IP, data e hora, página pedida e navegador de cada acesso ao servidor; contagem de tentativas de login e de envios; relatórios de erro do site, sem o seu IP.',
            'Proteger as contas e o site contra abuso e fraude e corrigir falhas.',
            'Legítimo interesse (inciso IX).',
            'Os registros de acesso ficam na hospedagem do servidor (Render), que os apaga sozinha no prazo dela. As contagens de tentativas somem em minutos ou horas. Os relatórios de erro somem em até 90 dias.',
          ],
          [
            'Cookies e medição de visitas: cookies necessários de login e segurança; com o seu aceite, cookies do Google Analytics (páginas vistas, origem da visita, aparelho e região aproximada); contagem de visitas do Vercel Analytics, sem cookies.',
            'Manter você conectado e proteger os formulários. Com o seu aceite, entender como o site é usado.',
            'Cookies necessários: execução de contrato (inciso V) e legítimo interesse (inciso IX). Google Analytics: consentimento (inciso I). Vercel Analytics: legítimo interesse (inciso IX).',
            'Cookies de login: até 7 dias. Cookies do Google Analytics: até 2 anos depois da última visita, ou até você apagar os cookies do navegador. Detalhes na Política de Cookies.',
          ],
        ],
      },
      paragraph(
        'Se você pede orçamento sem estar conectado, criamos uma conta com o nome, o e-mail e o telefone do pedido, para você acompanhar o pedido. O e-mail do pedido traz um link para você criar a senha.'
      ),
      paragraph('Não vendemos dados pessoais.'),
    ],
  },
  {
    id: 'servicos',
    title: 'Serviços que tratam dados para nós e transferência para fora do Brasil',
    blocks: [
      paragraph('Para o site funcionar, usamos os serviços abaixo. Ao lado de cada um, o que ele faz e onde fica.'),
      {
        kind: 'table',
        caption: 'Serviços usados pelo site e onde ficam',
        columns: ['Serviço', 'O que faz', 'Onde fica'],
        rows: [
          [
            'Vercel',
            'Hospeda o site, repassa as requisições do site ao servidor e conta as visitas sem cookies (Vercel Analytics).',
            'Estados Unidos e outros países (as páginas são montadas em São Paulo)',
          ],
          ['Render', 'Servidor que processa contas, pedidos e reservas e guarda os registros de acesso.', 'Estados Unidos (Oregon)'],
          ['Neon', 'Banco de dados com as contas, os pedidos e as reservas.', 'Estados Unidos (Virgínia)'],
          [
            'Redis Cloud',
            'Armazenamento temporário do servidor: fila de e-mails, contagem de tentativas, sessões encerradas e respostas guardadas por pouco tempo.',
            'Brasil (São Paulo)',
          ],
          [
            'Cloudinary',
            'Guarda fotos e arquivos: fotos de perfil, das avaliações e do mural, imagens do catálogo e, em modo privado, os comprovantes e anexos das reservas.',
            'Estados Unidos e outros países',
          ],
          ['Sentry', 'Recebe os relatórios de erro do site, sem o seu endereço IP.', 'Estados Unidos'],
          [
            'Google',
            'Google Analytics, só com o seu aceite. Login com Google. Google Fonts, as fontes de letra do site, que recebe o endereço IP de quem abre as páginas. Routes API, que calcula o frete e recebe o endereço do evento. Google Agenda da administração, quando conectada: recebe o nome do cliente, o título, o local, a data e o valor das reservas confirmadas.',
            'Estados Unidos e outros países',
          ],
          ['GitHub', 'Guarda a cópia de segurança diária do banco de dados, cifrada, por 90 dias.', 'Estados Unidos'],
          ['Resend', 'Envia os e-mails do site.', 'Estados Unidos (os e-mails saem pela região de São Paulo)'],
          [
            'Cloudflare',
            'Cuida do endereço do site na internet (DNS) e recebe os e-mails enviados para o domínio da empresa e os repassa para a caixa de e-mail da equipe.',
            'Estados Unidos e outros países',
          ],
          ['ViaCEP', 'No formulário de orçamento, recebe o CEP digitado para preencher o endereço.', 'Brasil'],
          [
            'Meta (WhatsApp)',
            'Quando você clica para conversar pelo WhatsApp e quando a equipe manda mensagens sobre o seu pedido ou a sua reserva pelo WhatsApp (vão o seu número e o texto da mensagem). O que é escrito lá segue as regras do WhatsApp.',
            'Estados Unidos',
          ],
          // Pedido do dono de 09/11/2026 (Instagram): importação das publicações da empresa e player dos vídeos.
          [
            'Meta (Instagram)',
            'Traz para o site as fotos e os vídeos que a empresa publica no próprio perfil do Instagram; essa importação não usa dados de quem visita o site. Os vídeos tocam no player do Instagram, que só carrega se você clicar para assistir: aí o Instagram recebe o seu endereço IP e os dados do seu navegador e pode gravar cookies da Meta.',
            'Estados Unidos',
          ],
        ],
      },
      paragraph(
        'Algumas imagens vêm direto de outros serviços, que recebem o endereço IP de quem abre a página: as fotos de capa dos guias (Unsplash) e as imagens provisórias de itens ainda sem foto (placehold.co).'
      ),
      paragraph(
        'Vários desses serviços ficam fora do Brasil, principalmente nos Estados Unidos. Quando os dados vão para eles porque são necessários para o orçamento que você pediu, para o contrato com você, para cumprir uma obrigação legal ou para defender direitos num processo, a transferência se apoia na lei (LGPD, art. 33, IX).'
      ),
      highlight(
        `${GOOGLE_ANALYTICS_TRANSFER_NOTICE} Por isso o Google Analytics só funciona com o seu consentimento específico e em destaque, dado no aviso de cookies (LGPD, art. 33, VIII).`
      ),
    ],
  },
  {
    id: 'cookies',
    title: 'Cookies',
    blocks: [
      paragraph(
        'Usamos cookies necessários para o login e a segurança. Os cookies do Google Analytics só são gravados se você aceitar no aviso de cookies, e você pode mudar a escolha a qualquer momento. A lista completa, com nomes e prazos, está na',
        { label: 'Política de Cookies', href: '/cookies' }
      ),
      paragraph(INSTAGRAM_PLAYER_NOTICE),
    ],
  },
  {
    id: 'direitos',
    title: 'Seus direitos',
    blocks: [
      paragraph('Pela LGPD (art. 18), você pode pedir:'),
      bullets(
        'Confirmação de que tratamos seus dados e acesso a eles.',
        'Correção de dados incompletos, errados ou desatualizados.',
        'Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desacordo com a LGPD.',
        'Portabilidade dos dados para outro fornecedor.',
        'Eliminação dos dados tratados com o seu consentimento.',
        'Informação sobre com quem compartilhamos seus dados.',
        'Informação sobre a possibilidade de não dar o consentimento e o que acontece se você não der.',
        'Revogação do consentimento.',
        'Oposição a um tratamento feito sem consentimento, se ele não seguir a LGPD.'
      ),
      paragraph('Com a conta conectada, você baixa uma cópia dos seus dados e exclui a conta na página', lgpdPageLink),
      paragraph(
        'Nome, telefone e outros dados do perfil você corrige na sua conta. Para trocar o e-mail da conta ou fazer os outros pedidos, escreva para',
        supportEmailLink
      ),
      paragraph(
        'Respondemos em até 15 dias (LGPD, art. 19). Se a resposta não resolver, você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).'
      ),
    ],
  },
  {
    id: 'mural',
    title: 'Fotos do mural dos eventos',
    blocks: [
      paragraph(
        'Em alguns eventos, os convidados enviam fotos para o mural pelo QR Code. A foto aparece no telão do evento, com o nome ou @ e a legenda que a pessoa escrever. Quando o mural tem moderação, a foto só aparece depois de aprovada.'
      ),
      paragraph(
        'As fotos são apagadas 90 dias depois do evento. Se você pedir, a sua foto sai do telão antes. Para pedir, escreva para',
        supportEmailLink
      ),
    ],
  },
  {
    id: 'prazos',
    title: 'Por quanto tempo guardamos',
    blocks: [
      bullets(
        'Conta: enquanto ela existir.',
        'Pedidos que não viraram contrato, com os anexos e as mensagens: 12 meses depois do pedido.',
        `Reservas contratadas ou pagas, com o comprovante e o chat: ${ACCOUNTING_TERM}. Exemplo: um evento de 2027 fica guardado até o fim de 2032.`,
        'Mensagens do formulário de contato: 12 meses depois do envio.',
        'Fotos do mural: 90 dias depois do evento.',
        'Cópias de segurança do banco de dados: somem em até 90 dias.'
      ),
      paragraph('Quando o prazo acaba, os dados são apagados ou anonimizados.'),
    ],
  },
  {
    id: 'exclusao',
    title: 'Exclusão da conta',
    blocks: [
      bullets(
        'Com a conta conectada, use "Excluir minha conta" na página LGPD. O site pede a senha da conta.',
        'Se você entra com o Google e não sabe a senha, peça um link de confirmação por e-mail. O link vale por 1 hora e funciona uma vez só.',
        `Contas da equipe (administrador, gerente e operador) não se excluem pelo site: escreva para ${SUPPORT_EMAIL}.`,
        'Se você tem uma reserva confirmada cujo evento ainda não terminou, uma reserva contratada com pagamento pendente ou um comprovante de pagamento que a equipe ainda não conferiu, a exclusão fica adiada até o fim do evento ou até o pagamento ser acertado. Até lá, a conta continua funcionando, e você pode cancelar o pedido de exclusão na página LGPD.',
        'Para colaboradores, a exclusão fica adiada enquanto houver escala ativa num evento futuro ou pagamento pendente.',
        'Conta de cliente sem nenhuma reserva: é apagada por completo.',
        'Nos outros casos, a conta é anonimizada: saem nome, e-mail, telefone, endereço, foto, preferências, notificações, favoritos, carrinho, login social e sessões.',
        'A avaliação fica só com as estrelas, sem o comentário e as fotos.',
        'Pedidos que nunca foram contratados são cancelados, e os anexos e as mensagens deles são apagados.',
        `Reservas contratadas ou pagas guardam só o que a contabilidade precisa: data, itens, valores, situação, cupom, comprovante de pagamento e o chat da reserva. Elas ficam por ${ACCOUNTING_TERM}, sem o nome, o e-mail e o telefone.`,
        'O código da reserva leva até 5 letras do início do nome do cliente e continua nesse registro.',
        'As cópias de segurança somem em até 90 dias.',
        'O "Excluir cliente" do painel da administração segue a mesma regra.'
      ),
    ],
  },
  {
    id: 'codigo-da-reserva',
    title: 'O código da reserva',
    blocks: [
      paragraph(
        'Cada reserva tem um código como XP-BRUNO-20270110-1430-K7Q. Depois de "XP" vêm até 5 letras do início do nome do cliente e, em seguida, a data e a hora do pedido.'
      ),
      paragraph(
        'O código aparece nos e-mails, na página da reserva e no endereço dessa página. Ele não muda e continua no registro guardado da reserva, mesmo depois da exclusão da conta.'
      ),
    ],
  },
  {
    id: 'versao',
    title: 'Versão desta política',
    blocks: [paragraph(`Versão de ${PRIVACY_POLICY_UPDATED_AT}. Quando o texto mudar, esta data muda junto.`)],
  },
];
