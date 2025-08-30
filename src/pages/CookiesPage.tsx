import React from 'react';
import { PageLayout } from '../components/layouts/PageLayout';

export const CookiesPage: React.FC = () => (
  <PageLayout title="Política de Cookies" description="Como usamos cookies e tecnologias semelhantes">
    <div className="max-w-4xl mx-auto bg-card rounded-xl p-8 border border-border">
      <h1 className="text-2xl font-bold mb-4">Política de Cookies</h1>
      <p className="text-muted-foreground">Utilizamos cookies para melhorar a experiência no site, analisar tráfego e personalizar conteúdo. Você pode gerenciar suas preferências através do navegador.</p>
      <p className="text-muted-foreground mt-4">Como em grandes plataformas, damos transparência sobre o uso de cookies e oferecemos meios para que o usuário controle suas preferências de privacidade.</p>
    </div>
  </PageLayout>
);

export default CookiesPage;
