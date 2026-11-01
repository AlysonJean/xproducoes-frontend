import { PageLayout } from '../components/layouts/PageLayout';
import { getWhatsAppPhone } from '../utils/whatsapp';
import { LEGAL_SUPPORT_EMAIL, formatPhoneDisplay } from '../data/site';

// Data da última revisão do TEXTO destes termos. Atualize sempre que o conteúdo mudar.
// Achado: antes era `new Date()` — a página dizia ter sido atualizada "hoje" em todo acesso.
const LAST_UPDATED = '01/11/2026';

export const TermsPage = () => {
  const phone = getWhatsAppPhone();
  return (
    <PageLayout
      title="Termos de Uso"
      description={`Última atualização: ${LAST_UPDATED}`}
    >
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-xl p-8 space-y-8 border border-border">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Aceite dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao acessar e usar os serviços da X Produções e Eventos, você concorda em cumprir e estar vinculado 
              aos seguintes termos e condições de uso.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Uso dos Serviços</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Nossos serviços são destinados para:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Locação de equipamentos audiovisuais</li>
              <li>Consultoria em eventos</li>
              <li>Suporte técnico especializado</li>
              <li>Venda de acessórios</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Responsabilidades do Cliente</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Usar os equipamentos conforme instruções fornecidas</li>
              <li>Devolver os equipamentos nas condições recebidas</li>
              <li>Comunicar imediatamente qualquer problema técnico</li>
              <li>Cumprir prazos de devolução estabelecidos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              A X Produções e Eventos não se responsabiliza por danos indiretos, incidentais ou consequenciais 
              resultantes do uso de nossos equipamentos, exceto quando expressamente previsto em contrato.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para dúvidas sobre estes termos, entre em contato conosco através do e-mail{' '}
              <a href={`mailto:${LEGAL_SUPPORT_EMAIL}`} className="text-primary hover:underline underline-offset-4 break-all">
                {LEGAL_SUPPORT_EMAIL}
              </a>{' '}
              ou telefone{' '}
              <a href={`tel:+${phone}`} className="text-primary hover:underline underline-offset-4">
                {formatPhoneDisplay(phone)}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </PageLayout>
  );
};
