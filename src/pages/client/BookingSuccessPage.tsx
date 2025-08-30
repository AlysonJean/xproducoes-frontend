// src/pages/BookingSuccessPage.tsx

import { Link, useParams, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { buildQuoteMessage, getWhatsAppPhone, openWhatsApp } from '../../utils/whatsapp';

export const BookingSuccessPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const booking = location.state?.booking;
  const formData = location.state?.formData;
  const openedRef = useRef(false);
  const [whatsFailed, setWhatsFailed] = useState(false);

  useEffect(() => {
    let canceled = false;
    if (booking || formData) {
      if (openedRef.current) return;
      openedRef.current = true;
      try {
        const items = booking?.kit ? [booking.kit] : booking?.equipments || [];
        const userInfo = {
          name: booking?.client?.name || formData?.name || '-',
          phone: (booking?.client && (booking.client as any).phone) || formData?.phone || '-',
        };
        const eventDate = booking?.eventDate ? new Date(booking.eventDate) : (formData?.eventDate ? new Date(formData.eventDate) : new Date());
        const address = typeof booking?.venue === 'object' && booking?.venue !== null
          ? {
              street: booking.venue.street || formData?.street || '',
              number: formData?.addressNumber || '',
              neighborhood: booking.venue.city || formData?.neighborhood || '',
              city: booking.venue.city || formData?.city || '',
              state: booking.venue.state || formData?.state || '',
              zipCode: booking.venue.zipCode || formData?.zipCode || '',
              complement: formData?.addressComplement || '',
            }
          : {
              street: formData?.street || '',
              number: formData?.addressNumber || '',
              neighborhood: formData?.neighborhood || '',
              city: formData?.city || '',
              state: formData?.state || '',
              zipCode: formData?.zipCode || '',
              complement: formData?.addressComplement || '',
            };
        const mensagem = buildQuoteMessage({
          bookingId: booking?.id,
          user: userInfo,
          venue: (typeof booking?.venue === 'string' ? booking.venue : '') || formData?.venue || '',
          eventDate,
          durationHours: booking?.duration || formData?.duration || 1,
          address,
          items,
          notes: booking?.notes || formData?.notes || '',
          logistics: {
            requiresStairs: (booking as any)?.requiresStairs ?? (formData?.requiresStairs === 'yes'),
            isCovered: (booking as any)?.isCovered ?? (formData?.isCovered === 'yes'),
            hasParking: (booking as any)?.hasParking ?? (formData?.hasParking === 'yes'),
          },
        });
        // Tenta abrir o WhatsApp
        setTimeout(() => {
          if (!canceled) {
            openWhatsApp(getWhatsAppPhone(), mensagem);
            // Marca como "tentou abrir"
            // setWhatsOpened(true); // Removido: não é mais necessário
            // Se após 1s não abriu, mostra fallback
            setTimeout(() => {
              if (!window.document.hasFocus()) return; // se perdeu o foco, provavelmente abriu
              setWhatsFailed(true);
            }, 1200);
          }
        }, 300);
      } catch (errWpp) {
        setWhatsFailed(true);
      }
    }
    return () => { canceled = true; };
  }, [booking, formData]);

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
      {/* Texto de incentivo animado para chamar atenção ao botão WhatsApp */}
      <p aria-hidden="true" className="animate-pulse text-sm font-semibold text-emerald-700">
        Precisa de ajuda imediata? Clique em "Abrir WhatsApp" e fale connosco agora mesmo!
      </p>
      {/* Texto para leitores de ecrã */}
      <p className="sr-only">Para abrir o WhatsApp, pressione o botão Abrir WhatsApp.</p>
      {whatsFailed && (
        <div className="bg-yellow-100 text-yellow-800 rounded p-3 mb-4 max-w-md mx-auto">
          <strong>Não foi possível abrir o WhatsApp automaticamente.</strong><br />
          Clique no botão abaixo para abrir manualmente.
        </div>
      )}
        <button
          aria-label="Abrir WhatsApp"
          title="Abrir WhatsApp"
          onClick={() => {
            try {
              const items = booking?.kit ? [booking.kit] : booking?.equipments || [];
              const userInfo = {
                name: booking?.client?.name || formData?.name || '-',
                phone: (booking?.client && (booking.client as any).phone) || formData?.phone || '-',
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
                bookingId: booking?.id,
                user: userInfo,
                venue: formData?.venue || '',
                eventDate,
                durationHours: booking?.eventDuration || formData?.duration || 1,
                address,
                items,
                notes: booking?.notes || formData?.notes || '',
                logistics: {
                  requiresStairs: (booking as any)?.requiresStairs ?? (formData?.requiresStairs === 'yes'),
                  isCovered: (booking as any)?.isCovered ?? (formData?.isCovered === 'yes'),
                  hasParking: (booking as any)?.hasParking ?? (formData?.hasParking === 'yes'),
                },
              });
              openWhatsApp(getWhatsAppPhone(), mensagem);
            } catch (e) {
              console.warn('Falha ao abrir WhatsApp manualmente', e);
            }
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          Abrir WhatsApp
        </button>
        <Link
          to="/"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-6 rounded-lg"
        >
          Página Inicial
        </Link>
        {/* Link corrigido para a nova página */}
        <Link
          to="/my-bookings"
          className="bg-muted hover:bg-muted/70 text-foreground font-bold py-2 px-6 rounded-lg border border-border"
        >
          Ver Minhas Reservas
        </Link>
      </div>
    </div>
  );
};
