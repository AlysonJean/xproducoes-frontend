// src/pages/MyBookingsPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/services/api';
import { asArray } from '@/utils/normalize';
import type { SafeBooking } from '@/types/types';
import { BookingListItem } from '@/components/ui/BookingListItem';
import { Link } from 'react-router-dom';
import { ReviewModal } from '@/components/modals/ReviewModal';
import { useNotifications } from '@/contexts/NotificationContext';

export const MyBookingsPage = () => {
  const [bookings, setBookings] = useState<SafeBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const fetchMyBookings = async () => {
    try {
      setLoading(true);
  const data = await apiFetch('/api/bookings/user');
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
  };

  useEffect(() => {
    fetchMyBookings();
  }, []);

  const handleReviewSuccess = async () => {
    addNotification({ type: 'success', title: 'Obrigado!', message: 'A sua avaliação foi enviada com sucesso.' });
    setReviewBookingId(null);
    await fetchMyBookings();
  };

  if (loading)
    return (
      <div className="text-center text-xl text-foreground">
        A carregar as suas reservas...
      </div>
    );
  if (error)
    return (
      <div className="text-center text-destructive bg-destructive/10 p-4 rounded-md border border-destructive">
        {error}
      </div>
    );

  return (
    <>
      <div className="max-w-4xl mx-auto">
  <h1 className="text-3xl font-bold mb-6 text-foreground">Minhas Reservas</h1>
    {Array.isArray(bookings) && bookings.length > 0 ? (
          <div className="space-y-4">
      {bookings.map((booking) => (
              <div key={booking.id}>
                <BookingListItem
                  booking={booking}
                  onReviewClick={(id) => setReviewBookingId(id)}
                  onViewDetails={(id) => {
                    navigate(`/client/bookings/${id}`);
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center bg-card p-8 rounded-lg border border-border">
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              Nenhuma reserva encontrada
            </h2>
            <p className="text-muted-foreground mb-6">
              Parece que ainda não fez nenhuma reserva.
            </p>
            <Link
              to="/"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-6 rounded-lg"
            >
              Ver Equipamentos
            </Link>
          </div>
        )}
      </div>
      {reviewBookingId && (
        <ReviewModal
          bookingId={reviewBookingId}
          onClose={() => setReviewBookingId(null)}
          onSuccess={handleReviewSuccess}
        />
      )}
    </>
  );
};
