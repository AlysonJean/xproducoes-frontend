
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '../services/api';
import { PageLayout, PageLoading } from '../components/layouts/PageLayout';
import { TestimonialCard } from '../components/ui/TestimonialCard';
import { SEO } from '../components/SEO';
import type { Review } from '../types/types';

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
        // If not, we might need to filter client-side or add endpoint.
        // For now, let's try a direct fetch if API supports it, or search.
        // Since we implemented backfill but not explicit 'getBySlug' in repo yet, 
        // we might rely on the generic 'review' endpoint matching logic or need to update backend?
        // Wait, task list ID associated with 'Update Repositories' is still pending.
        // I will assume for now I can fetch by id or slug, OR I need to implement that backend part.
        // Actually, I haven't updated the backend repository/controller yet to find by slug.
        // But let's write the frontend assuming it will work or I'll fix backend next.
        
        // Let's try to fetch specifically.
        const response = await apiFetch(`/reviews/${slug}`); // Endpoint needs to support slug
        setReview(response as Review);
      } catch (err) {
        console.error('Erro ao carregar avaliação:', err);
        setError('Avaliação não encontrada.');
      } finally {
        setLoading(false);
      }
    };
    fetchReview();
  }, [slug]);

  if (loading) return <PageLoading message="Carregando avaliação..." />;

  if (error || !review) {
    return (
      <PageLayout title="Avaliação não encontrada">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-6">{error || 'A avaliação que você procura não existe ou foi removida.'}</p>
          <Link to="/" className="text-primary hover:underline">Voltar para o início</Link>
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
        <TestimonialCard review={review} className="transform scale-110" />
        
        <div className="mt-12 text-center">
          <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
            ← Ver mais avaliações na página inicial
          </Link>
        </div>
      </div>
    </PageLayout>
  );
};
