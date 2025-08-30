import React from 'react';
import { PageLayout } from '../components/layouts/PageLayout';

export const HelpPage: React.FC = () => (
  <PageLayout title="Central de Ajuda" description="Perguntas frequentes e guias">
    <div className="max-w-4xl mx-auto bg-card rounded-xl p-8 border border-border">
      <h1 className="text-2xl font-bold mb-4">Central de Ajuda</h1>
      <p className="text-muted-foreground mb-4">Encontre respostas rápidas sobre reservas, pagamentos, cancelamentos e suporte técnico. Se não encontrar o que precisa, entre em contato pelo chat ou email <strong>suporte@xproducoes.com</strong>.</p>

      <h2 className="text-lg font-semibold mt-6">Guias Rápidos</h2>
      <ul className="list-disc list-inside text-muted-foreground">
        <li>Como reservar equipamentos</li>
        <li>Política de cancelamento</li>
        <li>Requisitos técnicos para eventos</li>
      </ul>
      <section className="mt-6">
        <h3 className="text-md font-medium">Design de suporte inspirado em grandes apps</h3>
        <p className="text-muted-foreground">Oferecemos autoatendimento claro com articulação por tópicos e pesquisa rápida, inspirada em abordagens utilizadas por grandes plataformas para reduzir tempo de resolução e aumentar satisfação do usuário.</p>
      </section>
    </div>
  </PageLayout>
);

export default HelpPage;
