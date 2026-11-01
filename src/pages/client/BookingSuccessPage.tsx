// src/pages/BookingSuccessPage.tsx

import { useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { buildQuoteMessage, getWhatsAppPhone, openWhatsApp } from '../../utils/whatsapp';
import type { BookingDetails } from '../../types/types';
import { logger } from '../../utils/logger';
import { MessageCircle } from 'lucide-react';
import { Button, buttonVariants } from '../../components/ui/StandardComponents';
import { SuccessCard } from '../../components/client/SuccessCard';

interface BookingSuccessFormData {
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

interface BookingSuccessLocationState {
  booking?: BookingDetails;
  formData?: BookingSuccessFormData;
  cartItems?: Array<{ name?: string } | { equipment?: { name?: string } }>;
}

export const BookingSuccessPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const state = location.state as BookingSuccessLocationState | null;
  const booking = state?.booking;
  const formData = state?.formData;
  const cartItems = state?.cartItems;
  const hasAutoOpened = useRef(false);

  const handleOpenWhatsApp = useCallback(() => {
    try {
      const items = cartItems || (booking?.kit ? [booking.kit] : booking?.equipments || []);
      const userInfo = {
        name: booking?.clientName || booking?.client?.user?.name || formData?.name || '-',
                phone: booking?.client?.phone || booking?.clientContact || formData?.phone || '-',
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
                    requiresStairs: booking?.requiresStairs ?? (formData?.requiresStairs === 'yes'),
                    isCovered: booking?.isCovered ?? (formData?.isCovered === 'yes'),
                    hasParking: booking?.hasParking ?? (formData?.hasParking === 'yes'),
        },
      });
      openWhatsApp(getWhatsAppPhone(), mensagem);
    } catch (e) {
      logger.warn('Falha ao abrir WhatsApp', 'BookingSuccessPage', e);
    }
  }, [booking, formData, cartItems, id]);

  useEffect(() => {
    // Abre automaticamente apenas uma vez quando a página carrega
    if (!hasAutoOpened.current) {
      handleOpenWhatsApp();
      hasAutoOpened.current = true;
    }
    }, [handleOpenWhatsApp]);

  return (
    <SuccessCard
      title="Reserva realizada com sucesso!"
      actions={
        <>
          <Button
            variant="success"
            onClick={handleOpenWhatsApp}
            leftIcon={<MessageCircle className="h-4 w-4" aria-hidden="true" />}
          >
            Reabrir WhatsApp
          </Button>
          <Link to="/" className={buttonVariants()}>
            Página Inicial
          </Link>
          <Link to="/minhas-reservas" className={buttonVariants({ variant: 'outline' })}>
            Ver Minhas Reservas
          </Link>
        </>
      }
    >
      <p>Seu pedido foi recebido e já está sendo processado pela nossa equipe.</p>
      {id && (
        <p>
          O ID da sua reserva é: <strong className="break-all text-foreground">{id}</strong>
        </p>
      )}
      {/* role="status" (antes aria-hidden): quem usa leitor de tela também fica sabendo que o WhatsApp abriu. */}
      <p role="status" className="text-sm font-semibold text-success">
        Estamos abrindo o WhatsApp para finalizar os detalhes...
      </p>
    </SuccessCard>
  );
};
