import React from 'react';
import { PageLayout } from '../components/layouts/PageLayout';

export const HelpPage: React.FC = () => (
  <PageLayout title="Central de Ajuda" description="Perguntas frequentes e guias">
    <div className="max-w-4xl mx-auto bg-card rounded-xl p-8 border border-border">
      <h1 className="text-2xl font-bold mb-4">Central de Ajuda</h1>
      <p className="text-muted-foreground mb-4">Encontre respostas rápidas sobre reservas, pagamentos, cancelamentos e suporte técnico. Se não encontrar o que precisa, entre em contato pelo chat ou email <strong>suporte@xproducoeseventos.com.br</strong>.</p>

      <h2 className="text-lg font-semibold mt-6">Guias Rápidos</h2>
      <ul className="list-disc list-inside text-muted-foreground">
        <li>Como reservar equipamentos</li>
        <li>Política de cancelamento</li>
        <li>Requisitos técnicos para eventos</li>
      </ul>
      <section className="mt-6">
        <h3 className="text-md font-medium">Suporte ágil e eficiente</h3>
        <p className="text-muted-foreground">Oferecemos um sistema de autoatendimento inteligente e descomplicado, desenvolvido para que você encontre as respostas que precisa em instantes, garantindo mais autonomia e agilidade para sua experiência.</p>
      </section>
    </div>
  </PageLayout>
);

export default HelpPage;
