// packages/web/src/shared/modals/PaymentModal.tsx
import React, { useState } from 'react';
import { FormModal } from './FormModal';
import { Input, Select, Textarea } from '../ui/StandardComponents';

import type { PaymentModalProps, PaymentData } from '../../types/types';

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  bookingId,
  totalAmount,
  paymentMethods = [
    'Cartão de Crédito',
    'Cartão de Débito',
    'MB Way',
    'Transferência Bancária',
    'Dinheiro',
  ],
  initialData,
  title = 'Processar Pagamento',
  ...props
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string>(
    initialData?.method || paymentMethods[0] || 'Cartão de Crédito'
  );

  const handleSubmit = (data: Partial<PaymentData>) => {
    const paymentData: PaymentData = {
      amount: typeof data.amount === 'string' ? parseFloat(data.amount) : Number(data.amount ?? 0),
      method: selectedMethod,
      dueDate: data.dueDate ?? '',
      description: data.description || '',
      bookingId,
      installments:
        typeof data.installments === 'string'
          ? parseInt(data.installments)
          : (data.installments ?? undefined),
    };

    if (selectedMethod === 'Cartão de Crédito' || selectedMethod === 'Cartão de Débito') {
      paymentData.cardDetails = {
        cardNumber: data.cardDetails?.cardNumber || '',
        expiryDate: data.cardDetails?.expiryDate || '',
        cvv: data.cardDetails?.cvv || '',
        cardholderName: data.cardDetails?.cardholderName || '',
      };
    }

    if (selectedMethod === 'MB Way') {
      paymentData.mbWayPhone = data.mbWayPhone ?? '';
    }

    if (onSubmit) {
      onSubmit(paymentData);
    }
  };

  const handleMethodChange = (method: string) => {
    setSelectedMethod(method);
    // setShowCardDetails removido pois não é mais utilizado
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  // Achado (auditoria do design system): campos crus com `focus:ring-blue-500` e rótulos soltos
  // (sem htmlFor), azul fixo no método selecionado e um bloco "Dados para Transferência" com banco e
  // IBAN fictícios ("Banco Exemplo", "PT50 0000…"). Campos agora são Input/Select/Textarea com label;
  // os dados bancários falsos saíram (fica só a referência do pedido).
  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit as (data: unknown) => void}
      title={title}
      isLoading={isLoading}
      submitText="Processar Pagamento"
      size="lg"
      {...props}
    >
      <div className="space-y-4">
        {/* Payment Amount */}
        <Input
          label="Valor do Pagamento (R$) *"
          type="number"
          name="amount"
          required
          min="0.01"
          step="0.01"
          placeholder="0.00"
          defaultValue={totalAmount || initialData?.amount}
        />

        {/* Payment Method */}
        <fieldset>
          <legend className="block text-sm font-medium text-card-foreground mb-2">
            Método de Pagamento *
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {paymentMethods.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => handleMethodChange(method)}
                aria-pressed={selectedMethod === method}
                className={`p-3 border rounded-md text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selectedMethod === method
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted'
                }`}
              >
                <div className="flex items-center">
                  <div
                    aria-hidden="true"
                    className={`w-4 h-4 rounded-full border-2 mr-3 ${
                      selectedMethod === method ? 'border-primary bg-primary' : 'border-border'
                    }`}
                  >
                    {selectedMethod === method && (
                      <div className="w-full h-full rounded-full bg-card scale-50"></div>
                    )}
                  </div>
                  <span className="text-sm font-medium">{method}</span>
                </div>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Card Details */}
        {(selectedMethod === 'Cartão de Crédito' || selectedMethod === 'Cartão de Débito') && (
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-foreground">Detalhes do Cartão</h4>

            <Input
              label="Nome do Titular *"
              type="text"
              name="cardholderName"
              required
              placeholder="Nome conforme aparece no cartão"
            />

            <Input
              label="Número do Cartão *"
              type="text"
              name="cardNumber"
              required
              maxLength={19}
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                e.target.value = formatCardNumber(e.target.value);
              }}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Data de Validade *"
                type="text"
                name="expiryDate"
                required
                maxLength={5}
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/AA"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  e.target.value = formatExpiryDate(e.target.value);
                }}
              />

              <Input
                label="CVV *"
                type="text"
                name="cvv"
                required
                maxLength={4}
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  e.target.value = e.target.value.replace(/[^0-9]/g, '');
                }}
              />
            </div>

            {/* Installments for Credit Card */}
            {selectedMethod === 'Cartão de Crédito' && (
              <Select
                label="Parcelas"
                name="installments"
                defaultValue="1"
                options={[
                  { value: '1', label: '1x sem juros' },
                  { value: '2', label: '2x sem juros' },
                  { value: '3', label: '3x sem juros' },
                  { value: '4', label: '4x sem juros' },
                  { value: '5', label: '5x sem juros' },
                  { value: '6', label: '6x sem juros' },
                  { value: '12', label: '12x com juros' },
                ]}
              />
            )}
          </div>
        )}

        {/* MB Way Phone */}
        {selectedMethod === 'MB Way' && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-foreground mb-3">MB Way</h4>
            <Input
              label="Número de Telefone *"
              type="tel"
              name="mbWayPhone"
              required
            />
          </div>
        )}

        {/* Bank Transfer Info */}
        {selectedMethod === 'Transferência Bancária' && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <h4 className="font-medium text-foreground mb-2">Transferência Bancária</h4>
            <p className="text-sm text-foreground">
              <strong>Referência:</strong> {bookingId ? `BOOKING-${bookingId}` : 'A definir'}
            </p>
          </div>
        )}

        {/* Due Date */}
        <Input
          label="Data de Vencimento *"
          type="date"
          name="dueDate"
          required
          min={new Date().toISOString().split('T')[0]}
          defaultValue={initialData?.dueDate}
        />

        {/* Description */}
        <Textarea
          label="Descrição"
          name="description"
          rows={2}
          placeholder="Descrição adicional do pagamento..."
          defaultValue={initialData?.description}
        />

        {/* Security Notice */}
        <div className="p-3 bg-success/10 border border-success/30 rounded-md">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-success mr-2 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-foreground">
              Seus dados de pagamento são processados de forma segura e criptografada.
            </p>
          </div>
        </div>
      </div>
    </FormModal>
  );
};
