import type { Review } from '../../types/types';

interface TestimonialCardProps extends React.HTMLAttributes<HTMLDivElement> {
  review: Review;
}

interface StarsProps {
  rating: number;
}

const Stars = ({ rating }: StarsProps) => {
  return (
    <div className="flex">
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className={`w-5 h-5 ${i < rating ? 'text-primary' : 'text-muted-foreground'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
};

export const TestimonialCard: React.FC<TestimonialCardProps> = ({ review, ...rest }) => {
  return (
    <div {...rest} className="bg-card border border-border p-6 rounded-lg shadow-sm flex flex-col h-full relative group">
      {review.slug && (
        <a href={`/depoimentos/${review.slug}`} className="absolute top-4 right-4 text-muted-foreground hover:text-primary transition-colors" title="Link direto">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
        </a>
      )}
      <div className="flex-grow">
        <Stars rating={review.rating} />
        <p className="text-muted-foreground mt-4 italic">"{review.comment || 'Sem comentário'}"</p>
      </div>
      <div className="mt-4 pt-4 border-t border-border">
        <p className="font-bold text-foreground text-right">
          - {review.user?.name || 'Usuário Anônimo'}
        </p>
      </div>
    </div>
  );
};
