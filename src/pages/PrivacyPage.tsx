import { PageLayout } from '../components/layouts/PageLayout';
export const PrivacyPage = () => {
  return (
    <PageLayout
      title="Política de Privacidade"
      description={`Última atualização: ${new Date().toLocaleDateString('pt-BR')}`}
    >
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-2xl p-8 space-y-8 border border-border">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Informações que Coletamos</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Coletamos informações necessárias para fornecer nossos serviços:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Dados de identificação (nome, e-mail, telefone)</li>
              <li>Dados de navegação (endereço IP, cookies, páginas visitadas)</li>
              <li>Dados de uso (preferências, histórico de solicitações)</li>
              <li>Dados fornecidos em formulários (mensagens, eventuais anexos)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Como Usamos suas Informações</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Prestar e melhorar nossos serviços</li>
              <li>Atender solicitações e comunicações</li>
              <li>Personalizar a experiência do usuário</li>
              <li>Cumprir obrigações legais e regulatórias</li>
              <li>Prevenção a fraudes e segurança</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, 
              exceto quando necessário para:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4 mt-4">
              <li>Operacionalização de serviços (provedores de hospedagem, e-mail, pagamento)</li>
              <li>Cumprimento de obrigações legais e solicitações de autoridades</li>
              <li>Proteção de direitos, propriedade e segurança da empresa e usuários</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Seus Direitos</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              De acordo com a LGPD, você tem direito a:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Acessar, corrigir e atualizar seus dados</li>
              <li>Solicitar a exclusão ou portabilidade dos dados</li>
              <li>Revogar consentimentos</li>
              <li>Obter informações sobre uso e compartilhamento</li>
              <li>Reclamar junto à autoridade competente</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Segurança</h2>
            <p className="text-muted-foreground leading-relaxed">
              Implementamos medidas técnicas e organizacionais apropriadas para proteger suas 
              informações pessoais contra acesso não autorizado, alteração, divulgação ou destruição.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Contato</h2>
            <p className="text-muted-foreground">
              Para exercer seus direitos ou esclarecer dúvidas, entre em contato:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4 mt-2">
              <li>E-mail: <span className="text-primary">privacidade@xproducoes.com</span></li>
              <li>Telefone: <span className="text-primary">(11) 99999-9999</span></li>
              <li>Endereço: Rua Exemplo, 123 - São Paulo/SP</li>
            </ul>
          </section>
        </div>
      </div>
    </PageLayout>
  );
};
