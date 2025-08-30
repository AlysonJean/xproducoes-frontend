// packages/web/src/shared/modals/BookingModal.tsx

import React, { useState } from 'react';
import { FormModal } from './FormModal';
import { BookingModalProps, BookingData } from '../../types/types';
import {
  Input,
  Select,
  Textarea
} from '../ui/StandardComponents';

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  equipment,
  kit,
  initialData,
  title = 'Nova Reserva',
  ...props
}) => {
  const [formData] = useState<Partial<BookingData>>(initialData || {});

  const handleSubmit = (data: Partial<BookingData>) => {
    const bookingData: BookingData = {
      eventDate: data.eventDate!,
      eventTime: data.eventTime!,
      deliveryAddress: data.deliveryAddress!,
      eventType: data.eventType!,
      duration: data.duration!,
      additionalRequests: data.additionalRequests || '',
      clientName: data.clientName!,
      clientPhone: data.clientPhone!,
      clientEmail: data.clientEmail!,
    };
    if (onSubmit) onSubmit(bookingData);
  };

  const eventTypes = [
    'Casamento',
    'Festa de Aniversário',
    'Evento Corporativo',
    'Formatura',
    'Batizado',
    'Comunhão',
    'Outro',
  ];

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit as (data: unknown) => void}
      title={title}
      isLoading={isLoading}
      submitText="Criar Reserva"
      size="lg"
      {...props}
    >
      <div className="space-y-4">
        {(equipment || kit) && (
          <div className="p-4 bg-surface rounded-lg">
            <h4 className="font-medium text-primary mb-2">
              {equipment ? 'Equipamento' : 'Kit'} Selecionado
            </h4>
            <p className="text-sm text-tertiary">{equipment?.name || kit?.name}</p>
            {equipment?.price && (
              <p className="text-sm font-medium text-success">R${equipment.price}/dia</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Data do Evento *"
            type="date"
            name="eventDate"
            required
            defaultValue={formData.eventDate as string}
            min={new Date().toISOString().split('T')[0]}
            placeholder="Selecione a data do evento"
          />
          <Input
            label="Hora do Evento *"
            type="time"
            name="eventTime"
            required
            defaultValue={formData.eventTime as string}
            placeholder="Selecione o horário do evento"
          />
        </div>

        <Select
          label="Tipo de Evento *"
          name="eventType"
          required
          options={[
            { value: '', label: 'Selecione o tipo de evento' },
            ...eventTypes.map(type => ({ value: type, label: type }))
          ]}
          defaultValue={formData.eventType as string}
        />

        <Select
          label="Duração *"
          name="duration"
          required
          options={[
            { value: '', label: 'Selecione a duração' },
            { value: '4', label: '4 horas' },
            { value: '6', label: '6 horas' },
            { value: '8', label: '8 horas' },
            { value: '12', label: '12 horas' },
            { value: '24', label: '24 horas' }
          ]}
          defaultValue={formData.duration as string}
        />

        <Textarea
          label="Endereço de Entrega *"
          name="deliveryAddress"
          required
          rows={2}
          placeholder="Digite o endereço completo onde o equipamento deve ser entregue"
          defaultValue={formData.deliveryAddress as string}
        />

        <div className="border-t pt-4">
          <h4 className="font-medium text-primary mb-3">Dados do Cliente</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome Completo *"
              type="text"
              name="clientName"
              required
              defaultValue={formData.clientName as string}
              placeholder="Digite o nome completo"
            />
            <Input
              label="Telefone *"
              type="tel"
              name="clientPhone"
              required
              defaultValue={formData.clientPhone as string}
              placeholder="Digite o telefone"
            />
          </div>
          <Input
            label="Email *"
            type="email"
            name="clientEmail"
            required
            defaultValue={formData.clientEmail as string}
            placeholder="Digite o e-mail"
          />
        </div>

        <Textarea
          label="Pedidos Adicionais"
          name="additionalRequests"
          rows={3}
          placeholder="Descreva qualquer pedido especial ou observação importante"
          defaultValue={formData.additionalRequests as string}
        />
      </div>
    </FormModal>
  );
};
