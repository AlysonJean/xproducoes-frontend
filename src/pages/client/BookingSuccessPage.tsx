// src/pages/BookingSuccessPage.tsx

import { useEffect, useRef } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { buildQuoteMessage, getWhatsAppPhone, openWhatsApp } from '../../utils/whatsapp';

export const BookingSuccessPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const booking = location.state?.booking;
  const formData = location.state?.formData;
  const cartItems = location.state?.cartItems;
  const hasAutoOpened = useRef(false);

  const handleOpenWhatsApp = () => {
    try {
      const items = cartItems || (booking?.kit ? [booking.kit] : booking?.equipments || []);
      const userInfo = {
        name: booking?.clientName || booking?.client?.user?.name || formData?.name || '-',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        phone: (booking?.client && (booking.client as any).phone) || booking?.clientContact || formData?.phone || '-',
      };
      const eventDate = booking?.eventDate ? new Date(booking.eventDate) : (formData?.eventDate ? new Date(formData.eventDate) : new Date());
      const address = {
        street: formData?.street || '',
        number: formData?.addressNumber || '',
        neighborhood: formData?.neighborhood || '',
        city: formData?.city || '',
        state: formData?.state || '',
        zipCode: formData?.zipCode || '',
        complement: formData?.addressComplement || '',
      };
      const mensagem = buildQuoteMessage({
        bookingId: booking?.id || id,
        user: userInfo,
        venue: formData?.venue || '',
        eventDate,
        durationHours: booking?.eventDuration || formData?.duration || 1,
        address,
        items,
        notes: booking?.notes || formData?.notes || '',
        logistics: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          requiresStairs: (booking as any)?.requiresStairs ?? (formData?.requiresStairs === 'yes'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          isCovered: (booking as any)?.isCovered ?? (formData?.isCovered === 'yes'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          hasParking: (booking as any)?.hasParking ?? (formData?.hasParking === 'yes'),
        },
      });
      openWhatsApp(getWhatsAppPhone(), mensagem);
    } catch (e) {
      console.warn('Falha ao abrir WhatsApp', e);
    }
  };

  useEffect(() => {
    // Abre automaticamente apenas uma vez quando a página carrega
    if (!hasAutoOpened.current) {
      handleOpenWhatsApp();
      hasAutoOpened.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="text-center bg-card p-8 rounded-lg max-w-2xl mx-auto border border-border">
      <div className="mx-auto mb-4 flex items-center justify-center h-12 w-12 rounded-full bg-success/10">
        <svg
          className="h-6 w-6 text-success"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 13l4 4L19 7"
          ></path>
        </svg>
      </div>
      <h1 className="text-3xl font-bold mb-4 text-foreground">
        Reserva Realizada com Sucesso!
      </h1>
      <p className="text-muted-foreground mb-2">
        O seu pedido foi recebido e já está a ser processado pela nossa equipa.
      </p>
      <p className="text-muted-foreground mb-6">
        O ID da sua reserva é: <strong className="text-foreground">{id}</strong>
      </p>
  <div className="flex flex-col items-center gap-4">
      <p aria-hidden="true" className="animate-pulse text-sm font-semibold text-emerald-700">
        Estamos a abrir o WhatsApp para finalizar os detalhes...
      </p>

        <button
          aria-label="Abrir WhatsApp"
          title="Abrir WhatsApp"
          onClick={handleOpenWhatsApp}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          Reabrir WhatsApp
        </button>
        <Link
          to="/"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-6 rounded-lg"
        >
          Página Inicial
        </Link>
        {/* Link corrigido para a nova página */}
        <Link
          to="/minhas-reservas"
          className="bg-muted hover:bg-muted/70 text-foreground font-bold py-2 px-6 rounded-lg border border-border"
        >
          Ver Minhas Reservas
        </Link>
      </div>
    </div>
  );
};
