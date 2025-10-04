import React from 'react';
import { PageLayout } from '../components/layouts/PageLayout';

export const AboutPage: React.FC = () => {
  return (
    <PageLayout
      title="Sobre Nós"
      description="Quem somos, nossa história e valores que guiam o nosso trabalho."
    >
      <div className="max-w-4xl mx-auto">
        <div className="bg-card rounded-xl shadow-sm border border-border p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-3">Nossa História</h2>
            <p className="text-muted-foreground">
              A X Produçoes e Eventos é especialista em aluguel de equipamentos audiovisuais e produção de eventos.
              Com anos de experiência no mercado, oferecemos soluções completas para eventos corporativos,
              sociais e artísticos, sempre com foco em qualidade e excelência.
            </p>
          </section>

          <section>
            <h3 className="text-xl font-semibold text-foreground mb-3">Inspiração em grandes plataformas</h3>
            <p className="text-muted-foreground">
              Buscamos as melhores práticas de UX e confiança observadas em grandes plataformas: adotamos a descoberta orientada por dados similar ao que o Netflix faz para recomendar soluções técnicas,
              personalização de ofertas inspirada em abordagens do Spotify, e foco em confiança e verificações (reviews, políticas claras) no estilo Airbnb — tudo adaptado ao mercado de eventos.
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
