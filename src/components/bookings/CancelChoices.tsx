import { useState } from 'react';
import { Checkbox } from '../ui/Checkbox';
import { NotifyClientCheckbox } from './NotifyClientCheckbox';

// Onda 2 da auditoria do status da reserva (decisões de Alyson de 21/11/2026), na janela de cancelar da ficha:
// - D2: "Avisar o cliente por e-mail" (marcada): o cliente recebe o e-mail de reserva cancelada;
// - D3: a equipe escalada sai da escala e recebe o aviso; o evento sai da Google Agenda (o texto diz isso);
// - D9: com contrato aceito, a equipe escolhe entre a desistência que o cliente pediu (dentro do prazo legal: o contrato
//   fica desistido e o cliente recebe o e-mail da desistência, com a devolução integral) e o cancelamento pela tabela do
//   contrato (o valor a reter segue a tabela; o pagamento continua manual). Revisão da onda 2: a desistência só aparece
//   dentro do prazo (o contrato de revenda não tem); fora dele, a janela diz que vale a tabela.

const brasiliaDay = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });

interface CancelChoicesProps {
  contractAccepted: boolean;
  withdrawUntil: string | null;
  mode: 'cancel' | 'withdraw';
  onModeChange: (mode: 'cancel' | 'withdraw') => void;
  notifyClient: boolean;
  onNotifyChange: (checked: boolean) => void;
  hasEmail?: boolean;
}

export function CancelChoices({ contractAccepted, withdrawUntil, mode, onModeChange, notifyClient, onNotifyChange, hasEmail }: CancelChoicesProps) {
  const until = withdrawUntil ? new Date(withdrawUntil) : null;
  const untilText = until && !Number.isNaN(until.getTime()) ? brasiliaDay.format(until) : null;
  // A hora de quando a janela abriu (a janela monta a cada abertura).
  const [openedAt] = useState(() => Date.now());
  const withdrawOpen = Boolean(untilText) && (until as Date).getTime() > openedAt;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        A equipe escalada sai da escala e recebe um aviso por e-mail, e o evento sai da Google Agenda.
      </p>
      {contractAccepted && !withdrawOpen && (
        <p className="rounded-md border border-border p-3 text-sm text-foreground">
          <strong>O cliente já aceitou o contrato</strong> e o prazo de desistência não está aberto: vale a tabela de
          cancelamento do contrato para o que foi pago (a devolução é combinada com o cliente).
        </p>
      )}
      {contractAccepted && withdrawOpen && (
        <fieldset className="space-y-2 rounded-md border border-border p-3">
          <legend className="px-1 text-sm font-semibold text-foreground">O cliente já aceitou o contrato</legend>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="cancel-mode"
              value="withdraw"
              checked={mode === 'withdraw'}
              onChange={() => onModeChange('withdraw')}
              className="mt-1"
            />
            <span>
              <strong>Desistência do cliente</strong>, pedida à equipe{untilText ? ` (prazo até ${untilText})` : ''}. O contrato fica
              desistido, com devolução integral, e o cliente recebe o e-mail da desistência.
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="cancel-mode"
              value="cancel"
              checked={mode === 'cancel'}
              onChange={() => onModeChange('cancel')}
              className="mt-1"
            />
            <span>
              <strong>Cancelamento</strong>: vale a tabela de cancelamento do contrato para o que foi pago (a devolução é combinada
              com o cliente).
            </span>
          </label>
        </fieldset>
      )}
      {!(contractAccepted && mode === 'withdraw') && (
        <NotifyClientCheckbox checked={notifyClient} onChange={onNotifyChange} hasEmail={hasEmail} kind="cancelada" />
      )}
    </div>
  );
}

// D6: "registrar o sinal como recebido" ao confirmar (marcada): o pagamento fica Parcial. Desmarcada, a reserva fica
// confirmada com o sinal em aberto: a área do cliente mostra a parcela e recebe o comprovante (o copia e cola do PIX é só
// da reserva ainda não confirmada), e o resumo diário ao dono lista a reserva até o pagamento ser registrado.
export function MarkPaymentCheckbox({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <Checkbox
      label="Registrar o sinal como recebido"
      description="O pagamento fica como Parcial. Desmarque se o cliente ainda não pagou: a reserva fica confirmada com o sinal em aberto, o cliente ainda pode mandar o comprovante pela área dele e o resumo diário lembra você até o pagamento ser registrado."
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
  );
}
