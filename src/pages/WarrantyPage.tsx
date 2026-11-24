import React from 'react';
import { PageLayout } from '../components/layouts/PageLayout';

// Achados (auditoria do design system): 2º <h1> duplicando o do PageLayout e um parágrafo de
// enchimento ("inspiradas pela clareza encontrada em plataformas líderes") — removidos.
export const WarrantyPage: React.FC = () => (
  <PageLayout title="Garantia" description="Termos de garantia dos equipamentos">
    {/* Onda 4 da auditoria de 19/11 (F5-17, texto aprovado por Alyson em 24/11): o que o contrato de locação diz (cláusulas 4ª e 6ª);
        antes prometia "a operação dos equipamentos durante a locação", mais amplo que o contrato. */}
    <div className="max-w-4xl mx-auto bg-card rounded-xl p-8 border border-border space-y-4">
      <p className="text-muted-foreground">
        Se um equipamento apresentar defeito durante o evento, a equipe o substitui sempre que possível (cláusula 4ª do
        contrato de locação). Desgaste natural, defeito do equipamento e falha da nossa equipe não são cobrados de você.
      </p>
      <p className="text-muted-foreground">
        Dano, perda, furto ou extravio durante o evento, inclusive por convidados, seguem a cláusula 6ª: avisamos com
        fotos em até 48 horas depois do evento ou da devolução, e você pode contestar em até 5 dias úteis. A cobrança é o
        conserto comprovado ou, quando não houver conserto, o valor de mercado de um equipamento equivalente.
      </p>
    </div>
  </PageLayout>
);

export default WarrantyPage;
