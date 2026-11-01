import React from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '../components/layouts/PageLayout';
import { SUPPORT_EMAIL } from '../data/site';

// Achados (auditoria do design system): 2º <h1> duplicando o do PageLayout, classe `text-md`
// (não existe), "Guias Rápidos" que não levavam a lugar nenhum, menção a um "chat" que não
// existe e um parágrafo de enchimento sobre "autoatendimento inteligente" — corrigidos. Os guias
// agora apontam para as páginas reais.
const helpLinks = [
  { to: '/faq', label: 'Perguntas frequentes (reservas, pagamento, entrega)' },
  { to: '/guias', label: 'Guias e dicas técnicas para eventos' },
  { to: '/garantia', label: 'Garantia dos equipamentos' },
  { to: '/contato', label: 'Fale com a equipe' },
];

export const HelpPage: React.FC = () => (
  <PageLayout title="Central de Ajuda" description="Perguntas frequentes e guias">
    <div className="max-w-4xl mx-auto bg-card rounded-xl p-8 border border-border space-y-6">
      <p className="text-muted-foreground">
        Encontre respostas rápidas sobre reservas, pagamentos, cancelamentos e suporte técnico. Se não encontrar o que
        precisa, escreva para{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-primary hover:underline underline-offset-4 break-all">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">Guias Rápidos</h2>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          {helpLinks.map((link) => (
            <li key={link.to}>
              <Link to={link.to} className="text-primary hover:underline underline-offset-4">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  </PageLayout>
);

export default HelpPage;
