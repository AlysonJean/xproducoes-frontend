import { useEffect, useState } from 'react';
import { apiFetch } from '../services/api';
import { StarIcon } from '@heroicons/react/24/solid';
import { UserCircleIcon } from '@heroicons/react/24/outline';

interface PublicReview {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  reviewer: {
    name: string;
    avatarUrl?: string | null;
  };
}

export const TestimonialCarousel = () => {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await apiFetch('/reviews/public');
        // Filter out reviews without comments for better visual appeal, or keep them if needed
        const reviewsWithComments = Array.isArray(data) 
          ? data.filter((r: PublicReview) => r.comment && r.comment.length > 10) 
          : [];
        setReviews(reviewsWithComments.slice(0, 10)); // Limit to top 10
      } catch (error) {
        console.error('Failed to fetch testimonials', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  if (loading || reviews.length === 0) return null;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">O que nossos clientes dizem</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Confira a experiência de quem já alugou com a X-Produções.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review) => (
            <div key={review.id} className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-1 mb-4 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className={`w-5 h-5 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`} />
                ))}
              </div>
              <p className="text-foreground/90 italic mb-6 line-clamp-4 min-h-[5rem]">"{review.comment}"</p>
              
              <div className="flex items-center gap-3">
                {review.reviewer.avatarUrl ? (
                  <img 
                    src={review.reviewer.avatarUrl} 
                    alt={review.reviewer.name} 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <UserCircleIcon className="w-10 h-10 text-muted-foreground" />
                )}
                <div>
                  <p className="font-semibold text-sm">{review.reviewer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
