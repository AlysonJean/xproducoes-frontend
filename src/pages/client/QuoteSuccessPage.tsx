// src/pages/QuoteSuccessPage.tsx

import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { apiFetch } from '../../services/api';
import { buildQuoteMessage, getWhatsAppPhone, openWhatsApp } from '../../utils/whatsapp';
import { useNotifications } from '../../contexts/NotificationContext';
import { MessageCircle } from 'lucide-react';
import { Button, buttonVariants } from '../../components/ui/StandardComponents';
import { SuccessCard } from '../../components/client/SuccessCard';

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
  // Achado: a rota em App.tsx é `/orcamento-sucesso`, sem `:bookingId` — o id nunca chegava, o número
  // de referência saía vazio e o botão do WhatsApp só dizia "Aguarde". Sem id, a tela agora esconde o
  // que depende dele (referência e WhatsApp); se a rota ganhar o parâmetro, tudo volta a aparecer.
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<QuoteBookingDetails | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(Boolean(bookingId));
  const { addNotification } = useNotifications();

  useEffect(() => {
    const load = async () => {
      if (!bookingId) return;
      try {
        setLoadingBooking(true);
        const resp = await apiFetch<QuoteBookingDetails | { data: QuoteBookingDetails }>(`/bookings/${bookingId}`);
        const data = resp && 'data' in resp ? resp.data : resp;
        setBooking(data);
      } catch {
        addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível carregar os detalhes do pedido.' });
      } finally {
        setLoadingBooking(false);
      }
    };
    load();
  }, [bookingId, addNotification]);

  return (
    <SuccessCard
      title="Pedido de orçamento enviado!"
      actions={
        <>
          <Link to="/" className={buttonVariants()}>
            Página Inicial
          </Link>
          <Link to="/minhas-reservas" className={buttonVariants({ variant: 'outline' })}>
            Ver Meus Pedidos
          </Link>
          {bookingId && (
            <Button
              variant="success"
              isLoading={loadingBooking}
              disabled={!booking}
              leftIcon={<MessageCircle className="h-4 w-4" aria-hidden="true" />}
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
                } catch {
                  addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível montar a mensagem para o WhatsApp.' });
                }
              }}
            >
              Abrir WhatsApp
            </Button>
          )}
        </>
      }
    >
      <p className="text-foreground">
        {bookingId
          ? 'Seu pedido foi registrado com sucesso. Use o botão abaixo para abrir o WhatsApp e finalizar os detalhes quando quiser.'
          : 'Seu pedido foi registrado com sucesso. Nossa equipe vai entrar em contato em breve.'}
      </p>
      {bookingId && (
        <p>
          O número de referência do seu pedido é:{' '}
          <strong className="break-all text-foreground">{bookingId}</strong>
        </p>
      )}
    </SuccessCard>
  );
};
