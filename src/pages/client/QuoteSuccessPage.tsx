// src/pages/client/QuoteSuccessPage.tsx

import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../services/api';
import { buildQuoteMessage, getWhatsAppPhone, openWhatsApp } from '../../utils/whatsapp';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { logger } from '../../utils/logger';
import { MessageCircle } from 'lucide-react';
import { Button, buttonVariants } from '../../components/ui/StandardComponents';
import { SuccessCard } from '../../components/client/SuccessCard';

// Achado (auditoria do design system): havia duas telas de sucesso para o mesmo fluxo. O pedido de
// orçamento caía em /reserva-sucesso ("Reserva realizada com sucesso!" — o pedido ainda está
// pendente de confirmação) e esta tela, com o texto certo, não tinha nenhuma rota que levasse a ela
// (nem recebia o id). Agora esta é a única tela do fluxo: /orcamento-sucesso/:bookingId, e
// /reserva-sucesso redireciona para cá.

type MessageItem = { name?: string } | { equipment?: { name?: string } };

// Reserva como chega de POST /bookings (no state da navegação) ou de GET /bookings/:id.
interface QuoteBooking {
  id?: string;
  kit?: { name?: string } | null;
  equipments?: MessageItem[];
  clientName?: string;
  clientContact?: string;
  client?: { phone?: string; user?: { name?: string; phone?: string } };
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

// Valores do formulário de /orcamento, enviados junto no state para montar a mensagem sem nova consulta.
interface QuoteFormValues {
  name?: string;
  phone?: string;
  eventDate?: string;
  duration?: number;
  street?: string;
  addressNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  addressComplement?: string;
  venue?: string;
  notes?: string;
  requiresStairs?: string;
  isCovered?: string;
  hasParking?: string;
}

export interface QuoteSuccessState {
  booking?: QuoteBooking | null;
  formData?: QuoteFormValues;
  cartItems?: MessageItem[];
  /** Marcado depois de abrir o WhatsApp sozinho, para não abrir de novo ao recarregar a página. */
  whatsAppOpened?: boolean;
}

const buildMessage = (bookingId: string | undefined, booking: QuoteBooking | null | undefined, form: QuoteFormValues | undefined, cartItems: MessageItem[] | undefined) => {
  const b = booking ?? {};
  const f = form ?? {};
  const items = cartItems?.length ? cartItems : (b.kit ? [b.kit] : b.equipments || []);
  const eventDate = b.eventDate || f.eventDate;
  return buildQuoteMessage({
    bookingId: b.id || bookingId,
    user: {
      name: b.clientName || b.client?.user?.name || b.creator?.name || f.name || '-',
      phone: b.client?.phone || b.client?.user?.phone || b.clientContact || b.creator?.phone || f.phone || '-',
    },
    venue: b.location || f.venue || '',
    eventDate: eventDate ? new Date(eventDate) : new Date(),
    durationHours: b.eventDuration || f.duration || 1,
    address: {
      street: b.street ?? f.street,
      number: b.addressNumber ?? f.addressNumber,
      neighborhood: b.neighborhood ?? f.neighborhood,
      city: b.city ?? f.city,
      state: b.state ?? f.state,
      zipCode: b.zipCode ?? f.zipCode,
      complement: b.addressComplement ?? f.addressComplement,
    },
    items,
    notes: b.notes || f.notes || '',
    logistics: {
      requiresStairs: b.requiresStairs ?? (f.requiresStairs === 'yes'),
      isCovered: b.isCovered ?? (f.isCovered === 'yes'),
      hasParking: b.hasParking ?? (f.hasParking === 'yes'),
    },
    locale: 'pt-BR',
  });
};

export const QuoteSuccessPage = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as QuoteSuccessState | null) ?? null;
  const { user, isLoading: authLoading } = useAuth();
  const { addNotification } = useNotifications();

  const hasStateData = Boolean(state?.booking || state?.formData);
  // Sem o state (link aberto depois, outra aba), busca a reserva — só com sessão: no checkout de
  // convidado com e-mail já cadastrado não há sessão e a rota responderia 401.
  const shouldFetch = Boolean(bookingId && !hasStateData && user);
  const [fetchedBooking, setFetchedBooking] = useState<QuoteBooking | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(false);
  const autoOpened = useRef(false);
  const [openedNow, setOpenedNow] = useState(false);

  useEffect(() => {
    if (!shouldFetch) return;
    let active = true;
    // Ligado aqui (e não no useState): a sessão costuma chegar depois do primeiro render.
    setLoadingBooking(true);
    (async () => {
      try {
        const resp = await apiFetch<QuoteBooking | { data: QuoteBooking }>(`/bookings/${encodeURIComponent(bookingId!)}`);
        if (active) setFetchedBooking(resp && 'data' in resp ? resp.data : resp);
      } catch (error) {
        logger.warn('Não foi possível carregar o pedido', 'QuoteSuccessPage', error);
      } finally {
        if (active) setLoadingBooking(false);
      }
    })();
    return () => { active = false; };
  }, [shouldFetch, bookingId]);

  const handleOpenWhatsApp = useCallback(() => {
    try {
      const booking = state?.booking ?? fetchedBooking;
      const message = booking || state?.formData
        ? buildMessage(bookingId, booking, state?.formData, state?.cartItems)
        // Sem os detalhes (ex.: página recarregada sem sessão): ao menos o número do pedido.
        : `Olá! Acabei de enviar um pedido de orçamento pelo site${bookingId ? ` (pedido ${bookingId})` : ''}.`;
      openWhatsApp(getWhatsAppPhone(), message);
    } catch (error) {
      logger.warn('Falha ao abrir o WhatsApp', 'QuoteSuccessPage', error);
      addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível montar a mensagem para o WhatsApp.' });
    }
  }, [state, fetchedBooking, bookingId, addNotification]);

  // Logo depois do envio do formulário, abre o WhatsApp uma vez com o pedido pronto (como antes).
  // Marca no state para não abrir de novo ao recarregar ou voltar para esta página.
  useEffect(() => {
    if (!hasStateData || state?.whatsAppOpened || autoOpened.current) return;
    autoOpened.current = true;
    handleOpenWhatsApp();
    setOpenedNow(true);
    navigate(location.pathname, { replace: true, state: { ...state, whatsAppOpened: true } });
  }, [hasStateData, state, handleOpenWhatsApp, navigate, location.pathname]);

  return (
    <SuccessCard
      title="Pedido de orçamento enviado!"
      actions={
        <>
          <Button
            variant="success"
            isLoading={loadingBooking}
            onClick={handleOpenWhatsApp}
            leftIcon={<MessageCircle className="h-4 w-4" aria-hidden="true" />}
          >
            {/* Rótulo único: o servidor não tem o state da navegação, e um texto que dependesse dele
                divergiria do navegador ao recarregar (erro de hidratação). */}
            Abrir WhatsApp
          </Button>
          {authLoading ? null : user ? (
            <Link to="/minhas-reservas" className={buttonVariants({ variant: 'outline' })}>
              Ver meus pedidos
            </Link>
          ) : (
            <Link to="/login" className={buttonVariants({ variant: 'outline' })}>
              Entrar para acompanhar
            </Link>
          )}
          <Link to="/" className={buttonVariants({ variant: 'ghost' })}>
            Página inicial
          </Link>
        </>
      }
    >
      <p className="text-foreground">
        Recebemos seu pedido. Nossa equipe vai conferir a disponibilidade e responder com o orçamento.
        A reserva só fica confirmada depois dessa resposta.
      </p>
      {bookingId && (
        <p>
          Número do pedido: <strong className="break-all text-foreground">{bookingId}</strong>
        </p>
      )}
      {openedNow && (
        <p role="status" className="text-sm font-semibold text-success">
          Abrimos o WhatsApp com os detalhes do pedido. Se ele não abriu, use o botão abaixo.
        </p>
      )}
    </SuccessCard>
  );
};
