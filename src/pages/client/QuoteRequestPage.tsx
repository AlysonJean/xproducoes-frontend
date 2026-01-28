import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import type { Booking } from '../../types/types';

import { CustomQuoteFormData } from '@/types/types';

export const QuoteRequestPage: React.FC = () => {
  const { cart, clearCart } = useCart();
  const items = (cart as any)?.equipments ?? [];
  const kitId = (cart as any)?.kit?.id ?? undefined;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CustomQuoteFormData>({
    defaultValues: {
      requiresStairs: 'no',
      isCovered: 'no',
      hasParking: 'no',
  // start time padrão
  startTime: '19:00',
    },
  });

  const onSubmit = async (data: CustomQuoteFormData) => {
    setServerError(null);

    if (!items.length && !kitId) {
      setServerError('Adicione um kit ou equipamento ao carrinho.');
      return;
    }

    // Requer autenticação para criar reserva (backend protege /bookings)
    if (!user?.id) {
      const msg = 'Você precisa estar logado para enviar o pedido. Faça login e tente novamente.';
      setServerError(msg);
      addNotification({ type: 'warning', title: 'Login necessário', message: msg });
      return;
    }

    const durationNum = Number(data.duration);
    if (!data.eventDate || isNaN(durationNum) || durationNum <= 0) {
      setServerError('Preencha a data e duração corretamente.');
      return;
    }
    // Construir payload mínimo compatível com backend (juntando data + hora de início)
    const startTimeStr = (data as any).startTime || '00:00';
    const [hh, mm] = startTimeStr.split(':').map((s: string) => Number(s));
    const eventStart = new Date(data.eventDate);
    eventStart.setHours(hh || 0, mm || 0, 0, 0);

    const eventEnd = new Date(eventStart.getTime() + durationNum * 3600 * 1000);

    const bookingData: any = {
      eventDate: eventStart.toISOString(),
      eventEndDate: eventEnd.toISOString(),
      eventDuration: durationNum,
      location: data.venue,
      street: data.street,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      addressNumber: data.addressNumber,
      addressComplement: data.addressComplement || undefined,
      requiresStairs: data.requiresStairs === 'yes',
      isCovered: data.isCovered === 'yes',
      hasParking: data.hasParking === 'yes',
      notes: data.notes || undefined,
      status: 'PENDING',
    };

  // enviar também a hora de início separada caso precise (setupTime)
  bookingData.setupTime = eventStart.toISOString();

    // kitId or equipmentIds
    if (kitId) {
      bookingData.kitId = kitId;
    } else {
      bookingData.equipmentIds = items.map((it: any) => it.id || it.equipment?.id).filter(Boolean);
    }

  // Dados do usuário autenticado
  bookingData.userId = user.id;
  // Enviar também dados de contato do cliente para manter cadastro atualizado
  bookingData.clientName = (user as any)?.name || data.name || undefined;
  bookingData.clientContact = (user as any)?.phone || (user as any)?.email || data.phone || data.email || undefined;
  if (data.email) bookingData.clientEmail = data.email;

    const idempotencyKey = uuidv4();
    try {
      addNotification({ type: 'info', title: 'Enviando pedido', message: 'Salvando seu pedido...' });
      const resp = await api.post('/bookings', bookingData, { headers: { 'Idempotency-Key': idempotencyKey } });
      const createdBooking: Booking | null = resp?.data?.data ?? resp?.data ?? null;
      try { await clearCart(); } catch (e) { console.warn('Erro ao limpar carrinho', e); }
      addNotification({ type: 'success', title: 'Pedido salvo', message: 'O pedido foi salvo como pendente.' });
      
      const statePayload = { 
        booking: createdBooking, 
        formData: data,
        // Passar itens do carrinho explicitamente para garantir que o WhatsApp tenha os nomes corretos
        // pois o retorno da API pode não trazer as relações carregadas
        cartItems: kitId ? [{ name: (cart as any)?.kit?.name ? `Kit: ${(cart as any)?.kit?.name}` : 'Kit Selecionado' }] : items
      };

      if (createdBooking?.id) {
        navigate(`/booking-success/${createdBooking.id}`, { state: statePayload });
      } else {
        navigate('/booking-success', { state: statePayload });
      }
    } catch (err: any) {
      console.error('Erro ao criar booking', err);
      const msg = err?.response?.data?.message || err?.message || 'Erro ao salvar pedido.';
      setServerError(msg);
      addNotification({ type: 'error', title: 'Erro ao salvar', message: msg });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-4xl font-bold text-center text-primary">Finalizar Orçamento</h1>
      <div className="bg-card p-8 rounded-lg shadow-lg border border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="venue">Local do Evento*</label>
            <input {...register('venue', { required: true })} id="venue" className="input" />
            {errors.venue && <span className="text-destructive">Campo obrigatório</span>}
          </div>
          <div>
            <label htmlFor="eventDate">Data do Evento*</label>
            <input type="date" {...register('eventDate', { required: true })} id="eventDate" className="input" />
            {errors.eventDate && <span className="text-destructive">Campo obrigatório</span>}
          </div>
          <div>
            <label htmlFor="startTime">Hora de Início*</label>
            <input type="time" {...register('startTime', { required: true })} id="startTime" className="input" defaultValue="19:00" />
            {errors.startTime && <span className="text-destructive">Campo obrigatório</span>}
          </div>
          <div>
            <label htmlFor="duration">Duração (horas)*</label>
            <input type="number" {...register('duration', { required: true, min: 1 })} id="duration" className="input" />
            {errors.duration && <span className="text-destructive">Campo obrigatório</span>}
          </div>
          <div>
            <label htmlFor="zipCode">CEP*</label>
            <input {...register('zipCode', { required: true })} id="zipCode" className="input" />
            {errors.zipCode && <span className="text-destructive">Campo obrigatório</span>}
          </div>
          <div>
            <label htmlFor="street">Rua*</label>
            <input {...register('street', { required: true })} id="street" className="input" />
            {errors.street && <span className="text-destructive">Campo obrigatório</span>}
          </div>
          <div>
            <label htmlFor="addressNumber">Número*</label>
            <input {...register('addressNumber', { required: true })} id="addressNumber" className="input" />
            {errors.addressNumber && <span className="text-destructive">Campo obrigatório</span>}
          </div>
          <div>
            <label htmlFor="neighborhood">Bairro*</label>
            <input {...register('neighborhood', { required: true })} id="neighborhood" className="input" />
            {errors.neighborhood && <span className="text-destructive">Campo obrigatório</span>}
          </div>
          <div>
            <label htmlFor="city">Cidade*</label>
            <input {...register('city', { required: true })} id="city" className="input" />
            {errors.city && <span className="text-destructive">Campo obrigatório</span>}
          </div>
          <div>
            <label htmlFor="state">Estado*</label>
            <input {...register('state', { required: true })} id="state" className="input" />
            {errors.state && <span className="text-destructive">Campo obrigatório</span>}
          </div>
        </div>

        <div className="mt-6">
          <label>O local tem escadas?*</label>
          <div>
            <label><input type="radio" value="yes" {...register('requiresStairs', { required: true })} /> Sim</label>
            <label className="ml-4"><input type="radio" value="no" {...register('requiresStairs', { required: true })} /> Não</label>
            {errors.requiresStairs && <span className="text-destructive ml-2">Obrigatório</span>}
          </div>
        </div>

        <div className="mt-4">
          <label>O local é coberto?*</label>
          <div>
            <label><input type="radio" value="yes" {...register('isCovered', { required: true })} /> Sim</label>
            <label className="ml-4"><input type="radio" value="no" {...register('isCovered', { required: true })} /> Não</label>
            {errors.isCovered && <span className="text-destructive ml-2">Obrigatório</span>}
          </div>
        </div>

        <div className="mt-4">
          <label>O local possui estacionamento?*</label>
          <div>
            <label><input type="radio" value="yes" {...register('hasParking', { required: true })} /> Sim</label>
            <label className="ml-4"><input type="radio" value="no" {...register('hasParking', { required: true })} /> Não</label>
            {errors.hasParking && <span className="text-destructive ml-2">Obrigatório</span>}
          </div>
        </div>

        {!user?.id && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name">Nome*</label>
              <input {...register('name', { required: true })} id="name" className="input" />
              {errors.name && <span className="text-destructive">Campo obrigatório</span>}
            </div>
            <div>
              <label htmlFor="phone">Telefone ou Email*</label>
              <input {...register('phone', { required: true })} id="phone" className="input" />
              {errors.phone && <span className="text-destructive">Campo obrigatório</span>}
            </div>
          </div>
        )}

        <div className="mt-4">
          <label htmlFor="notes">Observações</label>
          <textarea {...register('notes')} id="notes" className="input w-full" rows={3}></textarea>
        </div>

        {serverError && <div className="bg-destructive/10 text-destructive p-3 rounded-md my-4">{serverError}</div>}

        <div className="mt-6">
          <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isSubmitting}>
            Salvar pedido
          </Button>
        </div>
      </div>
    </form>
  );
};

export default QuoteRequestPage;

