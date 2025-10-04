// src/pages/FaqPage.tsx

import { useState, useEffect } from 'react';
import type { FaqItem } from '../types/types';
import { apiFetch } from '../services/api';
import { asArray } from '../utils/normalize';
import { Card, Grid } from '../components/ui/StandardComponents';
import { PageLayout, PageLoading, PageError, PageEmpty } from '../components/layouts/PageLayout';

// AccordionItem com visual de Card, igual ao portfólio
const AccordionItem = ({ faq }: { faq: FaqItem }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="group cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
      <Card className="mb-6 border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
        <div className="flex justify-between items-center py-6 px-6">
          <h3 className="text-lg font-semibold text-foreground mb-0 group-hover:text-primary transition-colors">
            {faq.question}
          </h3>
          <span className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
        {isOpen && (
          <div className="px-6 pb-6 text-muted-foreground border-t border-border bg-muted/50">
            {faq.answer}
          </div>
        )}
      </Card>
    </div>
  );
};

export const FaqPage = () => {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
  const data = await apiFetch('/api/faq');
  setFaqs(asArray<FaqItem>(data));
      } catch (err) {
        setError('Erro ao carregar perguntas frequentes. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  if (loading) {
    return <PageLoading message="A carregar perguntas..." />;
  }

  if (error) {
    return <PageError message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <PageLayout
      title="Perguntas Frequentes"
      description="Encontre respostas para as dúvidas mais comuns."
    >
      <div className="w-full max-w-3xl mx-auto">
        {faqs.length > 0 ? (
          <Grid columns={{ sm: 1 }} gap={0}>
            {faqs.map((faq) => (
              <AccordionItem key={faq.id} faq={faq} />
            ))}
          </Grid>
        ) : (
          <PageEmpty
            title="Nenhuma pergunta encontrada"
            message="Tente novamente mais tarde ou entre em contato com o suporte."
          />
        )}
      </div>
    </PageLayout>
  );
};
