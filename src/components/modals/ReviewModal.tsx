// src/components/ReviewModal.tsx

import React, { useState } from 'react';
import { apiFetch } from '../../services/api';
import { Form, Textarea, Button, Alert, Modal } from '../ui/StandardComponents';


interface ReviewModalProps {
  bookingId?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

const Star = ({
  index,
  filled,
  onSelect,
}: {
  index: number;
  filled: boolean;
  onSelect: (value: number) => void;
}) => (
  <label className={`p-1 rounded-md transition-colors focus-within:ring-2 focus-within:ring-ring cursor-pointer ${
    filled ? 'text-yellow-400' : 'text-muted-foreground hover:text-yellow-500'
  }`}>
    <span className="sr-only">{`Dar ${index} estrela${index > 1 ? 's' : ''}`}</span>
    <input
      type="radio"
      name="rating"
      value={index}
      checked={filled}
      onChange={() => onSelect(index)}
      className="sr-only"
    />
    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  </label>
);


export const ReviewModal = ({ bookingId, onClose, onSuccess }: ReviewModalProps) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Por favor, selecione uma classificação de estrelas.');
      return;
    }
    setLoading(true);
    setError('');
    try {
  await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ bookingId, rating, comment }),
      });
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Ocorreu um erro ao enviar a sua avaliação.');
      } else {
        setError('Ocorreu um erro ao enviar a sua avaliação.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose || (() => {})} size="md" title="Deixe a sua Avaliação">
      <Form onSubmit={handleSubmit}>
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        <div>
          <div className="mb-2 text-sm font-medium text-foreground">A sua classificação</div>
          <div className="flex items-center gap-2" role="radiogroup" aria-label="Classificação por estrelas">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} index={star} filled={star <= rating} onSelect={setRating} />
            ))}
          </div>
        </div>
        <div className="mt-6">
          <Textarea
            id="comment"
            value={comment}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
            placeholder="O seu comentário (opcional)"
            rows={4}
          />
        </div>
        <Button type="submit" isLoading={loading} fullWidth>
          {loading ? 'A Enviar...' : 'Enviar Avaliação'}
        </Button>
      </Form>
    </Modal>
  );
};
