import { useState } from 'react';
import { ConfirmModal } from '../modals/ConfirmModal';
import { Input } from '../ui/Input';

// Onda 2b da auditoria do status da reserva (D8, decisão de Alyson de 21/11/2026): marcar Reembolsada registra o valor
// devolvido ao cliente e o dia da devolução; o pagamento fica "Devolvido". O servidor confere de novo (valor maior que
// zero, até o valor da reserva; dia até hoje) e responde o motivo.

const brasiliaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

export interface RefundInput {
  refundAmount: number;
  refundedAt: string;
}

interface RefundModalProps {
  /** A reserva a reembolsar (null: janela fechada). */
  booking: { id: string; totalPrice?: number | string | null } | null;
  onClose: () => void;
  /** Grava; true fecha a janela (num erro ela fica aberta com o que foi digitado, e a tela diz o motivo). */
  onConfirm: (refund: RefundInput) => Promise<boolean>;
}

function RefundForm({ booking, onClose, onConfirm }: RefundModalProps & { booking: NonNullable<RefundModalProps['booking']> }) {
  // O dia de hoje (Brasília), lido quando a janela abre (ela monta a cada abertura).
  const [today] = useState(brasiliaToday);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const total = Number(booking.totalPrice);

  const confirm = async () => {
    const value = Number(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return setError('Digite o valor devolvido ao cliente (maior que zero).');
    if (Number.isFinite(total) && total > 0 && Math.round(value * 100) > Math.round(total * 100)) {
      return setError('O valor devolvido passa do valor da reserva.');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError('Escolha o dia da devolução.');
    if (date > today) return setError('O dia da devolução não pode ser no futuro.');
    setSaving(true);
    const saved = await onConfirm({ refundAmount: Math.round(value * 100) / 100, refundedAt: date });
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <ConfirmModal
      isOpen
      onClose={onClose}
      onConfirm={() => void confirm()}
      isLoading={saving}
      closeOnOverlayClick={false}
      title="Registrar o reembolso"
      message="A reserva passa para Reembolsada e o pagamento fica como Devolvido. Se foi engano, volte a reserva para Cancelada na lista."
      variant="warning"
      confirmText="Registrar reembolso"
      cancelText="Voltar"
    >
      <div className="space-y-3">
        <Input
          label="Valor devolvido (R$)"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError(null);
          }}
          description={Number.isFinite(total) && total > 0 ? `Até ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, o valor da reserva.` : undefined}
        />
        <Input
          label="Dia da devolução"
          type="date"
          max={today}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setError(null);
          }}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </ConfirmModal>
  );
}

export function RefundModal({ booking, onClose, onConfirm }: RefundModalProps) {
  if (!booking) return null;
  return <RefundForm key={booking.id} booking={booking} onClose={onClose} onConfirm={onConfirm} />;
}
