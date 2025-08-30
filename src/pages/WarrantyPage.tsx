import React from 'react';
import { PageLayout } from '../components/layouts/PageLayout';

export const WarrantyPage: React.FC = () => (
  <PageLayout title="Garantia" description="Termos de garantia dos equipamentos">
    <div className="max-w-4xl mx-auto bg-card rounded-xl p-8 border border-border">
      <h1 className="text-2xl font-bold mb-4">Garantia</h1>
      <p className="text-muted-foreground">Garantimos a operação dos equipamentos durante o período de locação, mediante condições de uso adequadas. Danos acidentais podem resultar em cobranças adicionais conforme contrato.</p>
  <p className="text-muted-foreground mt-4">Adotamos políticas claras e fáceis de entender — inspiradas pela clareza encontrada em plataformas líderes — para garantir previsibilidade e confiança entre locador e cliente.</p>
    </div>
  </PageLayout>
);

export default WarrantyPage;
