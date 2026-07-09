/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
// src/pages/QuoteSuccessPage.tsx

import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api';
import { buildQuoteMessage, getWhatsAppPhone, openWhatsApp } from '../../utils/whatsapp';
import { useNotifications } from '../../contexts/NotificationContext';

// Formato observado da resposta de GET /bookings/:id — não é o mesmo shape do tipo
// Booking compartilhado em types/types.ts (esse é o modelo normalizado usado nos
// formulários de criação de reserva; aqui é o retorno bruto da API para uma reserva já
// existente, com os campos de endereço/logística achatados).
interface QuoteBookingDetails {
  id: string;
  kit?: unknown;
  equipments?: unknown[];
  client?: { user?: { name?: string; phone?: string } };
  creator?: { name?: string; phone?: string };
  eventDate?: string;
  eventDuration?: number;
  street?: string;
  addressNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  addressComplement?: string;
  location?: string;
  notes?: string;
  requiresStairs?: boolean;
  isCovered?: boolean;
  hasParking?: boolean;
}

export const QuoteSuccessPage = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
    const [booking, setBooking] = useState<QuoteBookingDetails | null>(null);
  const { addNotification } = useNotifications();

  useEffect(() => {
    const load = async () => {
      if (!bookingId) return;
      try {
        const resp = await apiFetch<QuoteBookingDetails | { data: QuoteBookingDetails }>(`/bookings/${bookingId}`);
        const data = resp && 'data' in resp ? resp.data : resp;
        setBooking(data);
            } catch (err) {
        addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível carregar os detalhes do pedido.' });
      } finally {
  // noop
      }
    };
    load();
    }, [bookingId]);

  return (
    <div className="text-center bg-card p-8 rounded-lg max-w-2xl mx-auto">
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
      <h1 className="text-3xl font-bold mb-4 text-primary">
        Pedido de Orçamento Enviado!
      </h1>
      <p className="text-foreground mb-2">
        O seu pedido foi registado com sucesso. Use o botão abaixo para abrir o WhatsApp e finalizar os detalhes quando quiser.
      </p>
      <p className="text-muted-foreground mb-6">
        O número de referência do seu pedido é:{' '}
        <strong className="text-foreground">{bookingId}</strong>
      </p>
      <div className="flex justify-center gap-4 mt-8">
        <Link
          to="/"
          className="bg-primary hover:bg-primary text-primary-foreground font-bold py-2 px-6 rounded-lg transition-colors duration-200"
        >
          Página Inicial
        </Link>
        <Link
          to="/minhas-reservas"
          className="bg-muted hover:bg-muted text-foreground font-bold py-2 px-6 rounded-lg transition-colors duration-200"
        >
          Ver Meus Pedidos
        </Link>
        <button
          onClick={() => {
            if (!booking) {
              addNotification({ type: 'warning', title: 'Aguarde', message: 'Detalhes do pedido ainda não carregados.' });
              return;
            }

            try {
              // buildQuoteMessage sempre chama .map() em items — precisa ser um array
              // mesmo quando a reserva tem um kit único (achado ao tipar isto: antes,
              // com `any`, um booking.kit presente quebraria em runtime aqui).
              const items: Array<{ name?: string } | { equipment?: { name?: string } }> = booking.kit
                ? [booking.kit as { name?: string }]
                : ((booking.equipments as Array<{ name?: string } | { equipment?: { name?: string } }>) || []);
              const user = booking.client?.user || booking.creator || { name: '', phone: '' };
              const eventDate = booking.eventDate ? new Date(booking.eventDate) : new Date();
              const durationHours = booking.eventDuration || 0;
              const address = {
                street: booking.street,
                number: booking.addressNumber,
                neighborhood: booking.neighborhood,
                city: booking.city,
                state: booking.state,
                zipCode: booking.zipCode,
                complement: booking.addressComplement,
              };

              const mensagem = buildQuoteMessage({
                bookingId: booking.id,
                user: { name: user.name, phone: user.phone },
                venue: booking.location || '',
                eventDate,
                durationHours,
                address,
                items,
                notes: booking.notes,
                logistics: {
                  requiresStairs: booking.requiresStairs,
                  isCovered: booking.isCovered,
                  hasParking: booking.hasParking,
                },
                locale: 'pt-BR',
              });

              openWhatsApp(getWhatsAppPhone(), mensagem);
                        } catch (err) {
              addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível montar a mensagem para o WhatsApp.' });
            }
          }}
          className="bg-success hover:bg-success/90 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200"
        >
          Abrir WhatsApp
        </button>
      </div>
    </div>
  );
};
