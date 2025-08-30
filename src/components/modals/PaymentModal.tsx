// packages/web/src/shared/modals/PaymentModal.tsx
import React, { useState } from 'react';
import { FormModal } from './FormModal';

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
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-1">
            Valor do Pagamento (R$) *
          </label>
          <input
            type="number"
            name="amount"
            required
            min="0.01"
            step="0.01"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.00"
            defaultValue={totalAmount || initialData?.amount}
          />
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-2">
            Método de Pagamento *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {paymentMethods.map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => handleMethodChange(method)}
                className={`p-3 border rounded-md text-left transition-colors ${
                  selectedMethod === method
                    ? 'border-blue-500 bg-primary/10 text-primary'
                    : 'border hover:bg-muted'
                }`}
              >
                <div className="flex items-center">
                  <div
                    className={`w-4 h-4 rounded-full border-2 mr-3 ${
                      selectedMethod === method ? 'border-blue-500 bg-primary/100' : 'border'
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
        </div>

        {/* Card Details */}
        {(selectedMethod === 'Cartão de Crédito' || selectedMethod === 'Cartão de Débito') && (
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-foreground">Detalhes do Cartão</h4>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Nome do Titular *
              </label>
              <input
                type="text"
                name="cardholderName"
                required
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nome conforme aparece no cartão"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Número do Cartão *
              </label>
              <input
                type="text"
                name="cardNumber"
                required
                maxLength={19}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1234 5678 9012 3456"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  e.target.value = formatCardNumber(e.target.value);
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  Data de Validade *
                </label>
                <input
                  type="text"
                  name="expiryDate"
                  required
                  maxLength={5}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="MM/AA"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    e.target.value = formatExpiryDate(e.target.value);
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">CVV *</label>
                <input
                  type="text"
                  name="cvv"
                  required
                  maxLength={4}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="123"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, '');
                  }}
                />
              </div>
            </div>

            {/* Installments for Credit Card */}
            {selectedMethod === 'Cartão de Crédito' && (
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">Parcelas</label>
                <select
                  name="installments"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  defaultValue="1"
                  title="Selecione o número de parcelas"
                >
                  <option value="1">1x sem juros</option>
                  <option value="2">2x sem juros</option>
                  <option value="3">3x sem juros</option>
                  <option value="4">4x sem juros</option>
                  <option value="5">5x sem juros</option>
                  <option value="6">6x sem juros</option>
                  <option value="12">12x com juros</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* MB Way Phone */}
        {selectedMethod === 'MB Way' && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-foreground mb-3">MB Way</h4>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Número de Telefone *
              </label>
              <input
                type="tel"
                name="mbWayPhone"
                required
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+351 912 345 678"
              />
            </div>
          </div>
        )}

        {/* Bank Transfer Info */}
        {selectedMethod === 'Transferência Bancária' && (
          <div className="p-4 bg-primary/10 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Dados para Transferência</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>
                <strong>Banco:</strong> Banco Exemplo
              </p>
              <p>
                <strong>IBAN:</strong> PT50 0000 0000 0000 0000 0000 0
              </p>
              <p>
                <strong>Titular:</strong> X Produções
              </p>
              <p>
                <strong>Referência:</strong> {bookingId ? `BOOKING-${bookingId}` : 'A definir'}
              </p>
            </div>
          </div>
        )}

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-1">
            Data de Vencimento *
          </label>
          <input
            type="date"
            name="dueDate"
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min={new Date().toISOString().split('T')[0]}
            defaultValue={initialData?.dueDate}
            title="Data de Vencimento"
            placeholder="Selecione a data de vencimento"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-1">Descrição</label>
          <textarea
            name="description"
            rows={2}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Descrição adicional do pagamento..."
            defaultValue={initialData?.description}
          />
        </div>

        {/* Security Notice */}
        <div className="p-3 bg-success/10 border border-green-200 rounded-md">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-success mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-green-800">
              Seus dados de pagamento são processados de forma segura e criptografada.
            </p>
          </div>
        </div>
      </div>
    </FormModal>
  );
};
