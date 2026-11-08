import React from 'react';
import { PageLayout } from '../components/layouts/PageLayout';
import { SEO } from '../components/SEO';

// Achado: existia um `setTimeout` de 600ms fingindo um "carregamento inicial" sem nenhuma
// busca de dado real por trás — só atrasava conteúdo 100% estático por atraso mesmo, e (pior)
// escondia o <SEO> real do HTML gerado no servidor (useEffect/setTimeout nunca rodam durante
// o SSR, então o servidor sempre renderizava o branch de loading com título genérico).
export const AboutPage: React.FC = () => {
  return (
    <PageLayout
      title="Sobre Nós"
      description="Quem somos, nossa história e valores que guiam o nosso trabalho."
    >
      <SEO 
        title="Sobre Nós"
        description="Conheça a história da X Produções e Eventos. Aluguel de equipamentos audiovisuais para eventos em Belo Horizonte."
      />
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-xl shadow-sm border border-border p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-3">Nossa História</h2>
            <p className="text-muted-foreground mb-4">
              A X Produções e Eventos nasceu de uma visão clara: oferecer qualidade técnica no mercado audiovisual.
              Com uma trajetória de evolução constante, a locação de equipamentos passou a vir junto com o cuidado técnico
              de cada evento. Nossa experiência vem dos bastidores das produções, onde aprendemos que o domínio técnico e a
              precisão são o que separam um bom evento de uma experiência inesquecível.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Cuidado Técnico e Profissionalismo</h2>
            <p className="text-muted-foreground">
              Nosso diferencial não está apenas no que fazemos, mas em como fazemos. Construímos nossa reputação sobre pilares 
              sólidos de conhecimento técnico e rigor operacional. Cada equipamento do nosso acervo é verificado antes de
              sair para o evento. Nossa equipe não é formada apenas por operadores, mas por profissionais que entendem de som
              e de luz e cuidam para que cada projeto seja executado com técnica e postura profissional.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Nossa Missão</h2>
            <p className="text-muted-foreground">
              Proporcionar experiências marcantes com equipamento revisado e atendimento personalizado,
              para que cada evento saia como foi planejado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Nossos Valores</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Excelência em atendimento</li>
              <li>Qualidade dos equipamentos</li>
              <li>Pontualidade e confiabilidade</li>
              <li>Inovação constante</li>
              <li>Preços justos e transparentes</li>
            </ul>
          </section>
        </div>
      </div>
    </PageLayout>
  );
};

export default AboutPage;
