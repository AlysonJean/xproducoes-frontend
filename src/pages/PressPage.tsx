import React from 'react';
import { PageLayout } from '../components/layouts/PageLayout';

export const PressPage: React.FC = () => {
  return (
    <PageLayout title="Imprensa" description="Materiais e contato para a imprensa">
      <div className="max-w-4xl mx-auto bg-card rounded-xl p-8 border border-border">
        <h1 className="text-2xl font-bold mb-4">Imprensa</h1>
        <p className="text-muted-foreground mb-4">Solicitações de imprensa, kits de mídia e imagens. Entre em contato: <strong>suporte@xproducoeseventos.com.br</strong></p>

        <h2 className="text-xl font-semibold mt-6 mb-2">Recursos</h2>
        <ul className="list-disc list-inside text-muted-foreground">
          <li>Kit de imprensa (logotipos, fotos)</li>
          <li>Declarações oficiais e releases</li>
        </ul>
        <section className="mt-6">
          <h3 className="text-md font-medium">Nossa abordagem de comunicação</h3>
          <p className="text-muted-foreground">Priorizamos transparência e velocidade de comunicação, seguindo padrões de grandes players para liberação de materiais e respostas rápidas a solicitações de mídia.</p>
        </section>
      </div>
    </PageLayout>
  );
};

export default PressPage;
