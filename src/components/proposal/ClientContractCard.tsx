import { useEffect, useState } from 'react';
import { FileDown } from 'lucide-react';
import { contractAPI, readApiError } from '@/services/api';
import { Badge, Button, Card, ConfirmModal } from '@/components/ui/StandardComponents';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatPrice } from '@/utils/formatPrice';
import type { BookingContractSummary, ClientContract } from '@/types/contract';
import { ContractPixPayment } from './ContractPixPayment';
import {
  contractDate,
  contractDateTime,
  contractDayMonth,
  contractDayMonthTime,
  contractStateLabel,
  contractStateVariant,
  serverMessage,
  withdrawalOpen,
} from './contractHelpers';

// Aceite online (13/11/2026): o cartão "Contrato" da área do cliente (pages/client/BookingDetailsPage), quando a reserva
// tem contrato (contractSummary no GET /bookings/:id). Os detalhes vêm de GET /bookings/:id/contract (só o dono da
// reserva): estado, data do aceite, impressão digital, vencimentos e, para o cliente final dentro dos 7 dias, "Desistir
// da contratação" (a política de reserva cita este botão e o da página da proposta).
// Semanas 2 e 3 (16/11/2026): enquanto a parcela inicial não foi registrada, o PIX com QR Code e "copia e cola" já com o
// valor (o mesmo da página da proposta); o comprovante segue pelo cartão "Comprovantes" desta tela.

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; contract: ClientContract };

// Botões do cartão com 44 px de altura e texto de 16 px (o "Desistir" também é tocado no celular).
const TOUCH = 'h-11 text-base';

export interface ClientContractCardProps {
  bookingId: string;
  /** Onda 2 da auditoria do status (M3): o status da reserva; cancelada ou reembolsada, o contrato aceito fica "Encerrado". */
  bookingStatus?: string | null;
  summary: BookingContractSummary;
  /** Depois da desistência: a tela recarrega a reserva (cancelada). */
  onChanged: () => void;
}

export function ClientContractCard({ bookingId, summary, onChanged, bookingStatus }: ClientContractCardProps) {
  const { addNotification } = useNotifications();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    let active = true;
    contractAPI
      .forClient(bookingId)
      .then((contract) => active && setLoad({ status: 'ready', contract }))
      .catch(() => active && setLoad({ status: 'error' }));
    return () => {
      active = false;
    };
  }, [bookingId, summary.state, attempt]);

  const contract = load.status === 'ready' ? load.contract : null;
  const closed = summary.state === 'ACCEPTED' && (bookingStatus === 'CANCELLED' || bookingStatus === 'REFUNDED');
  const state = contract?.state ?? summary.state;
  const acceptedAt = contract?.acceptedAt ?? summary.acceptedAt;
  const canWithdraw = Boolean(contract?.canWithdraw) && withdrawalOpen(contract?.withdrawUntil, contract?.canWithdraw);
  const hasFile = state === 'ACCEPTED' || state === 'WITHDRAWN';

  const download = async () => {
    setDownloading(true);
    try {
      await contractAPI.downloadForClient(bookingId);
    } catch {
      addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível baixar o contrato agora. Tente de novo em alguns minutos.' });
    } finally {
      setDownloading(false);
    }
  };

  const withdraw = async () => {
    setWithdrawing(true);
    try {
      await contractAPI.withdrawForClient(bookingId);
      setConfirmOpen(false);
      addNotification({
        type: 'success',
        title: 'Desistência registrada',
        message: 'A reserva foi cancelada. Enviamos a confirmação para o seu e-mail, e a equipe devolve tudo o que você já pagou.',
      });
      onChanged();
    } catch (error) {
      setConfirmOpen(false);
      const info = readApiError(error);
      addNotification({
        type: 'error',
        title: 'Desistência não registrada',
        // WITHDRAWAL_CLOSED: a frase do servidor diz o motivo (reason: prazo, revendedor, evento já começou).
        message:
          info.code === 'WITHDRAWAL_CLOSED'
            ? serverMessage(info) || 'O prazo de desistência terminou. Para cancelar, fale com a equipe: vale a tabela de cancelamento do contrato.'
            : 'Não foi possível registrar a desistência agora. Tente de novo ou fale com a equipe.',
      });
      setAttempt((n) => n + 1);
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <Card padding>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-foreground">Contrato</h2>
        <Badge variant={closed ? 'outline' : contractStateVariant(state)} size="lg">
          {closed ? 'Encerrado' : contractStateLabel(state)}
        </Badge>
      </div>

      <div className="space-y-3 text-base">
        {state === 'PREPARED' && <p className="text-muted-foreground">O contrato ainda não foi aceito. O aceite é feito pelo link da proposta.</p>}
        {state === 'SUPERSEDED' && <p className="text-muted-foreground">Este contrato foi trocado por outro.</p>}
        {/* Onda 2 (M3): a reserva cancelada pela equipe com o contrato aceito; os vencimentos saem da tela. */}
        {closed && <p className="font-medium text-foreground">A reserva foi cancelada. Os pagamentos combinados com a equipe seguem o contrato.</p>}
        {state === 'WITHDRAWN' && (
          <p className="font-medium text-foreground">
            Contratação desistida{contract?.withdrawnAt ? ` em ${contractDayMonth(contract.withdrawnAt)}` : ''}.
          </p>
        )}
        <dl className="space-y-2">
          {summary.partyName && (
            <div>
              <dt className="text-sm text-muted-foreground">Contratante</dt>
              <dd className="font-medium text-foreground">{summary.partyName}</dd>
            </div>
          )}
          {contract?.protocol && (
            <div>
              <dt className="text-sm text-muted-foreground">Protocolo</dt>
              <dd className="break-all font-mono text-foreground">{contract.protocol}</dd>
            </div>
          )}
          {acceptedAt && (
            <div>
              <dt className="text-sm text-muted-foreground">Aceito em</dt>
              <dd className="font-medium text-foreground">{contractDateTime(acceptedAt)}</dd>
            </div>
          )}
          {state === 'ACCEPTED' && !closed && contract?.initialPayment && (
            <div>
              <dt className="text-sm text-muted-foreground">Parcela inicial (PIX)</dt>
              <dd className="font-medium text-foreground">
                {formatPrice(contract.initialPayment.amount)} até {contractDate(contract.initialPayment.dueDate)}
              </dd>
            </div>
          )}
          {state === 'ACCEPTED' && !closed && contract?.balance && (
            <div>
              <dt className="text-sm text-muted-foreground">Saldo</dt>
              <dd className="font-medium text-foreground">
                {formatPrice(contract.balance.amount)} até {contractDateTime(contract.balance.dueDate)}
              </dd>
            </div>
          )}
          {contract?.sha256 && (
            <div>
              <dt className="text-sm text-muted-foreground">Impressão digital (SHA-256)</dt>
              <dd className="break-all font-mono text-sm text-foreground">{contract.sha256}</dd>
            </div>
          )}
        </dl>

        {state === 'ACCEPTED' && !closed && contract?.pix?.copyPaste && !contract.initialPaymentReceived && (
          <div className="space-y-2 rounded-lg border-2 border-primary/40 bg-primary/5 p-4">
            <p className="font-semibold text-foreground">Pagar a parcela inicial por PIX</p>
            <ContractPixPayment copyPaste={contract.pix.copyPaste} pixKey={contract.pix.key} dueDate={contract.initialPayment?.dueDate} />
            <p className="text-muted-foreground">Depois de pagar, envie o comprovante no cartão &quot;Comprovantes&quot; desta página.</p>
          </div>
        )}

        {load.status === 'error' && (
          <div role="alert" className="space-y-2 text-destructive">
            <p>Não conseguimos carregar os detalhes do contrato.</p>
            <Button variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)} className={TOUCH}>
              Tentar de novo
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {hasFile && (
            <Button
              variant="outline"
              size="sm"
              onClick={download}
              isLoading={downloading}
              leftIcon={<FileDown className="h-4 w-4" aria-hidden="true" />}
              className={TOUCH}
            >
              {downloading ? 'Baixando...' : 'Baixar contrato (PDF)'}
            </Button>
          )}
          {canWithdraw && contract?.withdrawUntil && (
            <>
              <p>
                Você pode desistir até {contractDayMonthTime(contract.withdrawUntil)}, sem custo, com a devolução de tudo o que pagou.
              </p>
              <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)} className={TOUCH}>
                Desistir da contratação
              </Button>
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={withdraw}
        title="Desistir da contratação?"
        message="A reserva é cancelada, você recebe a confirmação por e-mail e a equipe devolve tudo o que você já pagou."
        confirmText="Desistir"
        cancelText="Voltar"
        variant="danger"
        isLoading={withdrawing}
      />
    </Card>
  );
}
