import React from 'react';
import { PageLayout } from '../components/layouts/PageLayout';
import { SEO } from '../components/SEO';

export const AboutPage: React.FC = () => {
  return (
    <PageLayout
      title="Sobre Nós"
      description="Quem somos, nossa história e valores que guiam o nosso trabalho."
    >
      <SEO 
        title="Sobre a X Produções" 
        description="Conheça a história da X Produções e Eventos. Referência em qualidade técnica no aluguel de equipamentos audiovisuais em Belo Horizonte."
      />
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-xl shadow-sm border border-border p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-3">Nossa História</h2>
            <p className="text-muted-foreground mb-4">
              A X Produçoes e Eventos nasceu de uma visão clara: oferecer excelência técnica sem concessões no mercado audiovisual. 
              Com uma trajetória marcada pela evolução constante, passamos de uma empresa de locação para nos tornarmos referência 
              em engenharia de eventos. Nossa experiência foi forjada nos bastidores das mais exigentes produções, onde aprendemos 
              que o domínio técnico e a precisão são o que separam um bom evento de uma experiência inesquecível.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-foreground mb-3">Excelência Técnica e Profissionalismo</h3>
            <p className="text-muted-foreground">
              Nosso diferencial não está apenas no que fazemos, mas em como fazemos. Construímos nossa reputação sobre pilares 
              sólidos de conhecimento técnico e rigor operacional. Cada equipamento do nosso acervo passa por verificações 
              exaustivas para garantir confiabilidade absoluta. Nossa equipe não é formada apenas por operadores, mas por 
              especialistas apaixonados que entendem a física do som e a ciência da luz, garantindo que cada projeto seja 
              executado com maestria técnica e postura profissional irrepreensível.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-foreground mb-3">Nossa Missão</h3>
            <p className="text-muted-foreground">
              Proporcionar experiências únicas através de tecnologia de ponta e atendimento personalizado,
              garantindo que cada evento seja inesquecível.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-foreground mb-3">Nossos Valores</h3>
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
