// src/pages/MyBookingsPage.tsx

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { asArray } from '@/utils/normalize';
import type { SafeBooking } from '@/types/types';
import { BookingListItem } from '@/components/ui/BookingListItem';
import { ReviewModal } from '@/components/modals/ReviewModal';
import { useNotifications } from '@/contexts/NotificationContext';
import { Card, buttonVariants } from '@/components/ui/StandardComponents';
import { ClientPage, ClientPageError, ClientPageLoading } from '@/components/client/ClientPage';

export const MyBookingsPage = () => {
  const [bookings, setBookings] = useState<SafeBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const fetchMyBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/bookings/user');
      setBookings(asArray<SafeBooking>(data));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Não foi possível carregar as suas reservas.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyBookings();
  }, [fetchMyBookings]);

  const handleReviewSuccess = async () => {
    addNotification({ type: 'success', title: 'Obrigado!', message: 'Sua avaliação foi enviada com sucesso.' });
    setReviewBookingId(null);
    await fetchMyBookings();
  };

  return (
    <ClientPage width="4xl" title="Minhas Reservas">
      {loading ? (
        <ClientPageLoading label="Carregando suas reservas..." />
      ) : error ? (
        <ClientPageError message={error} onRetry={fetchMyBookings} />
      ) : bookings.length > 0 ? (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <BookingListItem
              key={booking.id}
              booking={booking}
              onReviewClick={(id) => setReviewBookingId(id)}
              onViewDetails={(id) => {
                navigate(`/cliente/reservas/${id}`);
              }}
            />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
            <ClipboardList className="h-7 w-7" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-foreground">
            Nenhuma reserva encontrada
          </h2>
          <p className="mb-6 text-muted-foreground">
            Parece que você ainda não fez nenhuma reserva.
          </p>
          <Link to="/" className={buttonVariants()}>
            Ver Equipamentos
          </Link>
        </Card>
      )}
      {reviewBookingId && (
        <ReviewModal
          bookingId={reviewBookingId}
          onClose={() => setReviewBookingId(null)}
          onSuccess={handleReviewSuccess}
        />
      )}
    </ClientPage>
  );
};
