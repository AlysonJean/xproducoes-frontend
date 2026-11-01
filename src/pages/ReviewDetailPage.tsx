import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { PageLayout } from '../components/layouts/PageLayout';
import { TestimonialCard } from '../components/ui/TestimonialCard';
import { SEO } from '../components/SEO';
import { BrandLoader } from '../components/ui/BrandLoader';
import { buttonVariants } from '../components/ui/StandardComponents';
import type { Review } from '../types/types';
import { logger } from '../utils/logger';

export const ReviewDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReview = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        // Assuming we have an endpoint or can search by slug. 
        const response = await apiFetch(`/reviews/${slug}`); 
        setReview(response as Review);
      } catch (err) {
        logger.error('Erro ao carregar avaliação:', 'ReviewDetailPage', err);
        setError('Avaliação não encontrada.');
      } finally {
        setLoading(false);
      }
    };
    fetchReview();
  }, [slug]);

  if (loading) {
    return (
      // Achado: title="Carregando..." virava o <h1>/<title> no SSR (o useEffect não roda no servidor).
      <PageLayout title="Depoimento de cliente" hideTitle>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <BrandLoader size={120} label="Carregando avaliação..." />
        </div>
      </PageLayout>
    );
  }

  if (error || !review) {
    return (
      <PageLayout title="Avaliação não encontrada">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-6">{error || 'A avaliação que você procura não existe ou foi removida.'}</p>
          <Link to="/" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Voltar para o início</Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={`Avaliação de ${review.user?.name || 'Cliente'}`} description="Veja o que nossos clientes dizem sobre nós.">
      <SEO 
        title={`Depoimento de ${review.user?.name || 'Cliente'}`}
        description={`"${review.comment?.substring(0, 150)}..." - Confira esta avaliação sobre a X Produções.`} 
      />
      <div className="max-w-2xl mx-auto py-12 px-4">
        {/* scale-110 removido: o card ampliado passava da largura da tela em 375px. */}
        <TestimonialCard review={review} />

        <div className="mt-12 text-center">
          <Link to="/" className="text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline">
            ← Ver mais avaliações na página inicial
          </Link>
        </div>
      </div>
    </PageLayout>
  );
};

export default ReviewDetailPage;
