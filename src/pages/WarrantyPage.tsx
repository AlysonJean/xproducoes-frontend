import React from 'react';
import { PageLayout } from '../components/layouts/PageLayout';

// Achados (auditoria do design system): 2º <h1> duplicando o do PageLayout e um parágrafo de
// enchimento ("inspiradas pela clareza encontrada em plataformas líderes") — removidos.
export const WarrantyPage: React.FC = () => (
  <PageLayout title="Garantia" description="Termos de garantia dos equipamentos">
    <div className="max-w-4xl mx-auto bg-card rounded-xl p-8 border border-border">
      <p className="text-muted-foreground">
        Garantimos a operação dos equipamentos durante o período de locação, mediante condições de uso adequadas.
        Danos acidentais podem resultar em cobranças adicionais conforme contrato.
      </p>
    </div>
  </PageLayout>
);

export default WarrantyPage;
