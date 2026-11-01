// src/pages/FaqPage.tsx

import { useState, useEffect, useCallback, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FaqItem } from '../types/types';
import { apiFetch } from '../services/api';
import { asArray } from '../utils/normalize';
import { Card } from '../components/ui/StandardComponents';
import { BrandLoader } from '../components/ui/BrandLoader';
import { PageLayout, PageError, PageEmpty } from '../components/layouts/PageLayout';
import { SEO } from '../components/SEO';

const PAGE_TITLE = 'Perguntas Frequentes';
const PAGE_DESCRIPTION = 'Encontre respostas para as dúvidas mais comuns.';

const FaqSEO = () => (
  <SEO
    title="Perguntas Frequentes (FAQ)"
    description="Dúvidas sobre aluguel de som e luz? Veja aqui como funciona o processo de locação, pagamento e entrega da X Produções."
  />
);

// Achado: o acordeão era um <div onClick> — sem teclado, sem papel de botão e sem
// aria-expanded. Agora o cabeçalho é um <button> que controla a resposta.
const AccordionItem = ({ faq }: { faq: FaqItem }) => {
  const [isOpen, setIsOpen] = useState(false);
  const answerId = useId();
  return (
    <Card className="border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
      <h2 className="m-0">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={answerId}
          className="group w-full flex justify-between items-center gap-4 py-6 px-6 text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <span className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
            {faq.question}
          </span>
          <ChevronDown
            className={`h-6 w-6 flex-shrink-0 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </h2>
      {isOpen && (
        <div id={answerId} className="px-6 py-4 text-muted-foreground border-t border-border bg-muted/50">
          {faq.answer}
        </div>
      )}
    </Card>
  );
};

export const FaqPage = () => {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFaqs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/faq');
      setFaqs(asArray<FaqItem>(data));
    } catch {
      setError('Erro ao carregar perguntas frequentes. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  // Loading e erro agora dentro do PageLayout, com o título real (antes: "FAQ" no loading e
  // erro fora do layout, sem cabeçalho nem SEO).
  if (loading) {
    return (
      <PageLayout title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
        <FaqSEO />
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Carregando perguntas frequentes..." />
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
        <FaqSEO />
        <PageError message={error} onRetry={fetchFaqs} />
      </PageLayout>
    );
  }

  return (
    <PageLayout title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
      <FaqSEO />
      <div className="w-full max-w-3xl mx-auto">
        {faqs.length > 0 ? (
          <div className="space-y-4">
            {faqs.map((faq) => (
              <AccordionItem key={faq.id} faq={faq} />
            ))}
          </div>
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
