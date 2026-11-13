import { Link } from 'react-router-dom';
import { PageLayout } from '../components/layouts/PageLayout';
import { getWhatsAppPhone } from '../utils/whatsapp';
import {
  COMPANY_CNPJ,
  COMPANY_FULL_ADDRESS,
  COMPANY_LEGAL_NAME,
  COMPANY_REGISTERED_NAME,
  SUPPORT_EMAIL,
  SUPPORT_RESPONSE_LABEL,
  formatPhoneDisplay,
} from '../data/site';

// Data da última revisão do TEXTO destes termos. Atualize sempre que o conteúdo mudar.
// Achado: antes era `new Date()` — a página dizia ter sido atualizada "hoje" em todo acesso.
const LAST_UPDATED = '13/11/2026';

// Textos legais (13/11/2026): os Termos ficam coerentes com o contrato e as políticas novas: quem é a empresa (nome
// empresarial, CNPJ e endereço), o objeto (locação de equipamentos e serviços de montagem, operação técnica e
// desmontagem), como a contratação se forma (proposta, aceite e parcela inicial), o aceite pelo site com código no
// e-mail (só quando a proposta oferecer: o aceite online nasce desligado), a responsabilidade nos termos da lei (saiu
// a exclusão genérica de "danos indiretos", que não vale contra o consumidor) e o foro. Sem link para a política de
// reserva enquanto ela é rascunho.

const listClass = 'list-disc list-inside space-y-2 text-muted-foreground ml-4';
const textClass = 'text-muted-foreground leading-relaxed';
const titleClass = 'text-2xl font-semibold text-foreground mb-4';
const linkClass = 'text-primary hover:underline underline-offset-4 break-all';
const highlightClass = 'rounded-md border border-primary/40 bg-primary/5 p-4 font-semibold leading-relaxed text-foreground';

export const TermsPage = () => {
  const phone = getWhatsAppPhone();
  return (
    <PageLayout
      title="Termos de Uso"
      description={`Última atualização: ${LAST_UPDATED}`}
    >
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-xl p-5 sm:p-8 space-y-8 border border-border">
          <section id="aceite-dos-termos">
            <h2 className={titleClass}>1. Quem somos e aceite dos Termos</h2>
            <p className={`${textClass} mb-4`}>
              Este site é da {COMPANY_LEGAL_NAME}, nome empresarial {COMPANY_REGISTERED_NAME}, CNPJ {COMPANY_CNPJ},{' '}
              {COMPANY_FULL_ADDRESS}.
            </p>
            <p className={textClass}>
              Ao acessar e usar o site, você concorda com estes termos. A contratação de um evento segue também a
              proposta e o contrato de cada reserva.
            </p>
          </section>

          <section id="servicos">
            <h2 className={titleClass}>2. O que oferecemos</h2>
            <p className={`${textClass} mb-4`}>
              Nossos serviços são destinados para:
            </p>
            {/* Auditoria do orçamento (12/11/2026), E16: "Consultoria em eventos" e "Venda de acessórios" não existem. */}
            <ul className={listClass}>
              <li>Locação de equipamentos de som, iluminação e estrutura para eventos</li>
              <li>Serviços para o evento: DJ, técnico de som, técnico de iluminação, montagem e logística</li>
            </ul>
            <p className={`${textClass} mt-4`}>
              Cada contratação é a locação de equipamentos de som e iluminação e a prestação dos serviços de montagem,
              operação técnica e desmontagem que estiverem na proposta. A proposta lista cada item com o seu valor.
            </p>
          </section>

          <section id="contratacao">
            <h2 className={titleClass}>3. Pedido, proposta e contratação</h2>
            <ul className={listClass}>
              <li>O pedido de orçamento não é uma reserva: a equipe responde com uma proposta, que vale por 7 dias.</li>
              <li>A contratação acontece quando você aceita a proposta.</li>
              <li>A data só fica reservada depois do pagamento da parcela inicial do preço, no prazo da proposta.</li>
              <li>Valores, prazos de pagamento, cancelamento e remarcação são os da proposta e do contrato da reserva.</li>
            </ul>
          </section>

          <section id="aceite-eletronico">
            <h2 className={titleClass}>4. Aceite pelo site</h2>
            <p className={textClass}>
              Quando a proposta oferecer o aceite pelo site, você vê o resumo e o texto completo do contrato antes de
              aceitar, confirma com o código enviado ao seu e-mail e clica em "Aceito". Esse aceite vale como assinatura
              eletrônica (Medida Provisória 2.200-2/2001, art. 10, § 2º), e você recebe a cópia do contrato em PDF por
              e-mail.
            </p>
          </section>

          <section id="responsabilidades-do-cliente">
            <h2 className={titleClass}>5. Responsabilidades do Cliente</h2>
            <ul className={listClass}>
              <li>Usar os equipamentos conforme instruções fornecidas</li>
              <li>Devolver os equipamentos nas condições recebidas</li>
              <li>Comunicar imediatamente qualquer problema técnico</li>
              <li>Cumprir prazos de devolução estabelecidos</li>
              <li>Providenciar o ponto de energia pedido na proposta e passar informações corretas sobre o evento</li>
              <li>Cuidar das licenças do evento, como alvarás e direitos autorais das músicas (ECAD), e respeitar as regras de som do local</li>
            </ul>
          </section>

          <section id="responsabilidade">
            <h2 className={titleClass}>6. Responsabilidade da {COMPANY_LEGAL_NAME}</h2>
            <p className={`${textClass} mb-4`}>
              A {COMPANY_LEGAL_NAME} responde pelos equipamentos que entrega e pelo trabalho da sua equipe, nos termos da
              lei.
            </p>
            {/* Revisão (13/11/2026): a frase que limita a responsabilidade vem em destaque (CDC, art. 54, § 4º), como
                na política de reserva. */}
            <p className={highlightClass}>
              A {COMPANY_LEGAL_NAME} não responde por falha da rede elétrica ou da instalação do local nem por problema
              causado por informação errada sobre o evento, salvo se forneceu o gerador ou se a falha vier dos
              equipamentos ou da equipe dela.
            </p>
          </section>

          <section id="dados">
            <h2 className={titleClass}>7. Seus dados</h2>
            <p className={textClass}>
              O tratamento dos seus dados segue a{' '}
              <Link to="/privacidade" className={linkClass}>
                Política de Privacidade
              </Link>
              .
            </p>
          </section>

          <section id="foro">
            <h2 className={titleClass}>8. Foro</h2>
            <p className={textClass}>
              Se você contrata como consumidor, as ações correm no foro da cidade onde você mora. Nos demais casos, fica
              eleito o foro de Belo Horizonte - MG.
            </p>
          </section>

          <section id="contato">
            <h2 className={titleClass}>9. Contato</h2>
            <p className={textClass}>
              Para dúvidas sobre estes termos, entre em contato conosco através do e-mail{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
                {SUPPORT_EMAIL}
              </a>{' '}
              ou telefone{' '}
              <a href={`tel:+${phone}`} className="text-primary hover:underline underline-offset-4">
                {formatPhoneDisplay(phone)}
              </a>
              . {SUPPORT_RESPONSE_LABEL}.
            </p>
          </section>
        </div>
      </div>
    </PageLayout>
  );
};
