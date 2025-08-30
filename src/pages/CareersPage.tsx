import React from 'react';
import { PageLayout } from '../components/layouts/PageLayout';

export const CareersPage: React.FC = () => {
  return (
    <PageLayout title="Carreiras" description="Trabalhe conosco - vagas e cultura da empresa">
      <div className="max-w-4xl mx-auto bg-card rounded-xl p-8 border border-border">
        <h1 className="text-2xl font-bold mb-4">Trabalhe na X Produções</h1>
        <p className="text-muted-foreground mb-4">Procuramos pessoas apaixonadas por áudio, luz e eventos. Valorizamos autonomia, vontade de aprender e foco no cliente.</p>

        <h2 className="text-xl font-semibold mt-6 mb-2">Benefícios</h2>
        <ul className="list-disc list-inside text-muted-foreground">
          <li>Ambiente colaborativo e técnico</li>
          <li>Oportunidades de crescimento e formação</li>
          <li>Remuneração compatível com o mercado</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6 mb-2">Vagas</h2>
        <p className="text-muted-foreground">Envie seu currículo para <strong>carreiras@xproducoes.com</strong> com o título da vaga no assunto.</p>
  <h3 className="text-md font-medium mt-6">Cultura e métodos</h3>
  <p className="text-muted-foreground">Nossa cultura combina agilidade técnica com empatia pelo cliente. Utilizamos métricas e feedbacks constantes para melhorar processos — uma abordagem similar à usada por equipes de produto em empresas líderes.</p>
      </div>
    </PageLayout>
  );
};

export default CareersPage;
