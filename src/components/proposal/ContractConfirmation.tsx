import { useState } from 'react';
import { CheckCircle2, Copy, FileDown } from 'lucide-react';
import { contractAPI, readApiError } from '@/services/api';
import { Button, ConfirmModal } from '@/components/ui/StandardComponents';
import { formatPrice } from '@/utils/formatPrice';
import { formatCnpj, normalizeDocument } from '@/utils/document';
import { COMPANY_CNPJ, SUPPORT_EMAIL } from '@/data/site';
import type { ContractInstallment } from '@/types/contract';
import {
  contractDate,
  contractDateTime,
  contractDayMonthTime,
  contractErrorMessage,
  copyText,
  serverMessage,
  withdrawalOpen,
} from './contractHelpers';

// Aceite online (13/11/2026), passo 3: a confirmação imediata do aceite (Decreto 7.962/2013, art. 4º), com o protocolo,
// a data e a hora, a impressão digital, o PIX da parcela inicial (só a chave do CNPJ da empresa) e o saldo. O aceite
// não confirma a reserva: ela segue pendente até a equipe receber a parcela inicial. Cliente final: "Desistir da
// contratação" até o fim do prazo de 7 dias (CDC, art. 49), com confirmação no modal do design system.
// Ao reabrir o link de um contrato aceito, o /proposals/view traz os mesmos dados (protocolo, parcela inicial, saldo e
// chave PIX) no contract do ACCEPTED: o que não vier não aparece.

export interface ContractConfirmationData {
  acceptedAt?: string | null;
  protocol?: string;
  sha256?: string | null;
  initialPayment?: ContractInstallment | null;
  balance?: ContractInstallment | null;
  withdrawUntil?: string | null;
  canWithdraw?: boolean;
  pixKey?: string;
  contractId?: string;
  /** O e-mail (mascarado) que recebeu o código: o contrato vai para ele. */
  sentTo?: string;
}

export interface ContractConfirmationProps {
  token: string;
  data: ContractConfirmationData;
  onWithdrawn: (withdrawnAt: string | null) => void;
}

export function ContractConfirmation({ token, data, onWithdrawn }: ContractConfirmationProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawalClosed, setWithdrawalClosed] = useState(false);

  // A chave PIX do CNPJ da empresa (a da resposta do aceite; ao reabrir o link, a do site).
  const pixKey = data.pixKey || COMPANY_CNPJ;
  const canWithdraw = !withdrawalClosed && withdrawalOpen(data.withdrawUntil, data.canWithdraw);

  const download = async () => {
    if (!data.contractId) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      await contractAPI.download(token, data.contractId);
    } catch (error) {
      setDownloadError(contractErrorMessage(readApiError(error), 'Não conseguimos baixar o contrato agora. Tente de novo em alguns minutos.'));
    } finally {
      setDownloading(false);
    }
  };

  const copyPix = async () => {
    const ok = await copyText(normalizeDocument(pixKey));
    setCopyStatus(ok ? 'Chave PIX copiada.' : 'Não deu para copiar. Selecione a chave e copie.');
  };

  const withdraw = async () => {
    setWithdrawing(true);
    setWithdrawError(null);
    try {
      const result = await contractAPI.withdraw(token);
      setConfirmOpen(false);
      onWithdrawn(result?.withdrawnAt ?? null);
    } catch (error) {
      const info = readApiError(error);
      setConfirmOpen(false);
      if (info.code === 'WITHDRAWAL_CLOSED') {
        setWithdrawalClosed(true);
        // A frase do servidor diz o motivo (reason: prazo, revendedor, evento já começou).
        setWithdrawError(
          serverMessage(info) || 'O prazo de desistência terminou. Para cancelar, fale com a equipe: vale a tabela de cancelamento do contrato.',
        );
      } else {
        setWithdrawError(
          contractErrorMessage(info, `Não conseguimos registrar a desistência agora. Tente de novo ou avise a equipe pelo WhatsApp ou pelo e-mail ${SUPPORT_EMAIL}.`),
        );
      }
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="space-y-6 text-base">
      <div className="flex gap-3 rounded-lg border-2 border-success/50 bg-success/10 p-4">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-success" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">Contrato aceito.</p>
          <p>A data fica reservada depois que a parcela inicial é paga. A equipe confirma a reserva quando receber o PIX.</p>
        </div>
      </div>

      <dl className="space-y-3">
        {data.protocol && (
          <div>
            <dt className="font-semibold">Protocolo</dt>
            <dd className="break-all font-mono">{data.protocol}</dd>
          </div>
        )}
        {data.acceptedAt && (
          <div>
            <dt className="font-semibold">Aceito em</dt>
            <dd>{contractDateTime(data.acceptedAt)} (horário de Brasília)</dd>
          </div>
        )}
        {data.sha256 && (
          <div>
            <dt className="font-semibold">Impressão digital do contrato (SHA-256)</dt>
            <dd className="break-all font-mono">{data.sha256}</dd>
          </div>
        )}
      </dl>

      <section aria-labelledby="contrato-pagamento" className="space-y-3 rounded-lg border-2 border-primary/40 bg-primary/5 p-4">
        <h3 id="contrato-pagamento" className="text-lg font-bold text-foreground">
          Parcela inicial por PIX
        </h3>
        {data.initialPayment && (
          <p>
            Valor: <strong>{formatPrice(data.initialPayment.amount)}</strong>, até {contractDate(data.initialPayment.dueDate)}.
          </p>
        )}
        <div className="space-y-2">
          <p>
            Chave PIX (CNPJ): <strong className="font-mono">{formatCnpj(pixKey)}</strong>
          </p>
          <Button type="button" variant="outline" size="lg" onClick={copyPix} leftIcon={<Copy className="h-5 w-5" aria-hidden="true" />} className="w-full normal-case tracking-normal sm:w-auto">
            Copiar chave PIX
          </Button>
          <p role="status" className="min-h-6 text-muted-foreground">
            {copyStatus}
          </p>
        </div>
        <p>Pague só na chave PIX do CNPJ da empresa. Depois de pagar, mande o comprovante para a equipe pelo WhatsApp.</p>
        {data.balance && (
          <p>
            Saldo: <strong>{formatPrice(data.balance.amount)}</strong>, até {contractDateTime(data.balance.dueDate)}.
          </p>
        )}
        {!data.initialPayment && !data.balance && (
          <p className="text-muted-foreground">Os valores e os vencimentos estão no e-mail do contrato.</p>
        )}
      </section>

      <div className="space-y-3">
        <p>
          Enviamos o contrato para o seu e-mail{data.sentTo ? <> (<span className="break-all">{data.sentTo}</span>)</> : null}, com o
          comprovante do aceite.
        </p>
        {data.contractId ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={download}
            isLoading={downloading}
            leftIcon={<FileDown className="h-5 w-5" aria-hidden="true" />}
            className="w-full normal-case tracking-normal sm:w-auto"
          >
            {downloading ? 'Baixando...' : 'Baixar contrato (PDF)'}
          </Button>
        ) : (
          <p className="text-muted-foreground">A cópia do contrato em PDF está nesse e-mail.</p>
        )}
        {downloadError && (
          <p role="alert" className="text-destructive">
            {downloadError}
          </p>
        )}
      </div>

      {canWithdraw && data.withdrawUntil && (
        <section aria-labelledby="contrato-desistir" className="space-y-3 border-t border-border pt-5">
          <h3 id="contrato-desistir" className="text-lg font-bold text-foreground">
            Desistência
          </h3>
          <p>
            Você pode desistir da contratação até {contractDayMonthTime(data.withdrawUntil)}, sem custo, com a devolução de tudo o que
            pagou.
          </p>
          <Button type="button" variant="destructive" size="lg" onClick={() => setConfirmOpen(true)} className="w-full normal-case tracking-normal sm:w-auto">
            Desistir da contratação
          </Button>
        </section>
      )}
      {withdrawError && (
        <p role="alert" className="rounded-lg border-2 border-destructive/50 bg-destructive/10 p-4">
          {withdrawError}
        </p>
      )}

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
    </div>
  );
}
