import React from 'react';
import { PageLayout } from '../components/layouts/PageLayout';

export const LGPDPage: React.FC = () => (
  <PageLayout title="LGPD" description="Informações sobre tratamento de dados">
    <div className="max-w-4xl mx-auto bg-card rounded-xl p-8 border border-border">
      <h1 className="text-2xl font-bold mb-4">LGPD</h1>
      <p className="text-muted-foreground">Informamos como tratamos dados pessoais, direitos dos titulares e canais de contato para solicitações (ex.: exclusão, acesso). Para exercer seus direitos, envie email para <strong>lgpd@xproducoes.com</strong>.</p>
      <p className="text-muted-foreground mt-4">Nossa abordagem se inspira nas melhores práticas de privacidade observadas em grandes empresas: minimizamos dados, auditamos acessos e oferecemos caminhos claros para solicitações.</p>
    </div>
  </PageLayout>
);

export default LGPDPage;
