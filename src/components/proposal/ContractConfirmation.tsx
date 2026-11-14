import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, Copy, FileDown } from 'lucide-react';
import { contractAPI, readApiError } from '@/services/api';
import { Button } from '@/components/ui/StandardComponents';
import { formatPrice } from '@/utils/formatPrice';
import { formatCnpj, normalizeDocument } from '@/utils/document';
import { COMPANY_CNPJ, SUPPORT_EMAIL } from '@/data/site';
import type { ContractInstallment, ContractOtp } from '@/types/contract';
import {
  contractDate,
  contractDateTime,
  contractDayMonthTime,
  contractErrorMessage,
  contractTime,
  copyText,
  currentTime,
  reopensProposal,
  serverMessage,
  withdrawalOpen,
} from './contractHelpers';

// Aceite online (13/11/2026), passo 3: a confirmação imediata do aceite (Decreto 7.962/2013, art. 4º), com o protocolo,
// a data e a hora, a impressão digital, o PIX da parcela inicial (só a chave do CNPJ da empresa) e o saldo. O aceite
// não confirma a reserva: ela segue pendente até a equipe receber a parcela inicial. Cliente final: "Desistir da
// contratação" até o fim do prazo de 7 dias (CDC, art. 49).
// Revisão de 14/11/2026 (teste de 13/11: quem recebesse o link encaminhado desistia com dois cliques): o botão manda um
// código ao e-mail que aceitou o contrato, e a desistência só vale com ele (a área do cliente segue pelo login).
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
  /** Já desistida por outro caminho (CONTRACT_WITHDRAWN): abre a proposta de novo. */
  onReopen?: () => void;
}

const WITHDRAW_UNAVAILABLE = `A desistência pelo site está indisponível agora. Desista pela sua área do cliente ou avise a equipe pelo WhatsApp ou pelo e-mail ${SUPPORT_EMAIL}.`;
/** O servidor aceita outro código depois de 60 s. */
const RESEND_WAIT_MS = 60_000;
/** "42 s" ou, para esperas longas (o limite do dia), "3 h" / "25 min". */
const waitText = (seconds: number) =>
  seconds < 90 ? `${seconds} s` : seconds < 90 * 60 ? `${Math.ceil(seconds / 60)} min` : `${Math.ceil(seconds / 3600)} h`;

export function ContractConfirmation({ token, data, onWithdrawn, onReopen }: ContractConfirmationProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  // O último código pedido (para onde foi e até quando vale) e se o campo do código está aberto: "Voltar" fecha o campo
  // sem esquecer o código, e "Desistir" de novo reabre com ele enquanto valer (um pedido novo trocaria o código).
  const [withdrawOtp, setWithdrawOtp] = useState<ContractOtp | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeMessage, setCodeMessage] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawalClosed, setWithdrawalClosed] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(currentTime);
  const codeRef = useRef<HTMLInputElement>(null);
  const desistirRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));

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

  // A contagem do "Enviar outro código" (o servidor pede 60 s entre pedidos).
  useEffect(() => {
    if (resendAt <= currentTime()) return;
    const id = window.setInterval(() => {
      const t = currentTime();
      setNow(t);
      if (t >= resendAt) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendAt]);

  // O foco acompanha a tela: o campo do código ao abrir; o botão "Desistir da contratação" ao voltar.
  useEffect(() => {
    if (formOpen) codeRef.current?.focus();
    else if (wasOpen.current) desistirRef.current?.focus();
    wasOpen.current = formOpen;
  }, [formOpen]);

  // O prazo fechou (o servidor diz o motivo: prazo, revendedor, evento já começou): o botão some e fica a frase.
  const closeWithdrawal = (info: { message: string }) => {
    setWithdrawalClosed(true);
    setFormOpen(false);
    setWithdrawOtp(null);
    setWithdrawError(
      serverMessage(info) || 'O prazo de desistência terminou. Para cancelar, fale com a equipe: vale a tabela de cancelamento do contrato.',
    );
  };

  /** "Enviar outro código" (e o primeiro pedido): o código vai ao e-mail que aceitou o contrato. */
  const requestCode = async () => {
    const again = withdrawOtp !== null;
    setRequesting(true);
    setWithdrawError(null);
    setCodeMessage(null);
    try {
      const sent = await contractAPI.withdrawCode(token);
      setWithdrawOtp(sent);
      setFormOpen(true);
      setCode('');
      setCodeError(null);
      setResendAt(currentTime() + RESEND_WAIT_MS);
      setNow(currentTime());
      if (again) setCodeMessage(`Enviamos um novo código para ${sent.sentTo}.`);
    } catch (error) {
      const info = readApiError(error);
      if (info.code === 'WITHDRAWAL_CLOSED') {
        closeWithdrawal(info);
      } else if (reopensProposal(info.code)) {
        onReopen?.();
      } else if (info.status === 429) {
        // Pedido cedo demais: o código pedido há pouco continua valendo, então o campo abre para digitá-lo.
        setFormOpen(true);
        setResendAt(currentTime() + (info.retryAfterSeconds ?? RESEND_WAIT_MS / 1000) * 1000);
        setNow(currentTime());
        setCodeMessage(`${serverMessage(info) || 'Você pediu um código há pouco.'} Se o código já chegou, digite-o abaixo.`);
      } else if (info.code === 'CODE_NOT_SENT') {
        // A fila falhou agora (passageiro): tentar de novo em instantes.
        setWithdrawError(serverMessage(info) || 'Não foi possível enviar o código agora. Tente de novo em instantes.');
      } else if (info.status === 503) {
        setWithdrawError(WITHDRAW_UNAVAILABLE);
      } else {
        setWithdrawError(contractErrorMessage(info, `Não conseguimos enviar o código agora. Tente de novo ou avise a equipe pelo WhatsApp ou pelo e-mail ${SUPPORT_EMAIL}.`));
      }
    } finally {
      setRequesting(false);
    }
  };

  /** "Desistir da contratação": reabre o campo com o código que ainda vale; senão, pede um. */
  const startWithdraw = () => {
    if (withdrawOtp && new Date(withdrawOtp.expiresAt).getTime() > currentTime()) {
      setWithdrawError(null);
      setFormOpen(true);
      return;
    }
    void requestCode();
  };

  const withdraw = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code) || withdrawing) return;
    setWithdrawing(true);
    setWithdrawError(null);
    setCodeMessage(null);
    try {
      const result = await contractAPI.withdraw(token, code);
      onWithdrawn(result?.withdrawnAt ?? null);
    } catch (error) {
      const info = readApiError(error);
      if (info.code === 'WITHDRAWAL_CLOSED') {
        closeWithdrawal(info);
      } else if (info.code === 'INVALID_CODE') {
        const left = info.attemptsLeft;
        setCodeError(
          left === 0
            ? 'Código incorreto, e as tentativas deste código acabaram. Peça outro código.'
            : left === null
              ? 'Código incorreto. Confira e digite de novo.'
              : `Código incorreto. ${left === 1 ? 'Resta 1 tentativa' : `Restam ${left} tentativas`}.`,
        );
        if (left === 0) setResendAt(0);
        setCode('');
        codeRef.current?.focus();
      } else if (info.code === 'CODE_EXPIRED') {
        setCodeError('O código venceu ou foi bloqueado. Peça outro código.');
        setResendAt(0);
        setCode('');
        codeRef.current?.focus();
      } else if (reopensProposal(info.code)) {
        onReopen?.();
      } else if (info.status === 429) {
        setCodeError(serverMessage(info) || 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.');
      } else if (info.status === 503) {
        setWithdrawError(WITHDRAW_UNAVAILABLE);
      } else {
        setWithdrawError(
          contractErrorMessage(info, `Não conseguimos registrar a desistência agora. Tente de novo ou avise a equipe pelo WhatsApp ou pelo e-mail ${SUPPORT_EMAIL}.`),
        );
      }
    } finally {
      setWithdrawing(false);
    }
  };

  const cancelWithdraw = () => {
    setFormOpen(false);
    setCode('');
    setCodeError(null);
    setCodeMessage(null);
    setWithdrawError(null);
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
          {!formOpen ? (
            <>
              <p className="text-muted-foreground">Para confirmar que é você, mandamos um código ao e-mail que aceitou o contrato.</p>
              <Button
                ref={desistirRef}
                type="button"
                variant="destructive"
                size="lg"
                onClick={startWithdraw}
                isLoading={requesting}
                className="w-full normal-case tracking-normal sm:w-auto"
              >
                {requesting ? 'Enviando o código...' : 'Desistir da contratação'}
              </Button>
            </>
          ) : (
            <form onSubmit={withdraw} noValidate className="space-y-3">
              <p id="contrato-desistir-envio">
                {withdrawOtp ? (
                  <>
                    Enviamos um código de 6 dígitos para <strong className="break-all">{withdrawOtp.sentTo}</strong>. Ele vale até{' '}
                    {contractTime(withdrawOtp.expiresAt)}.
                  </>
                ) : (
                  <>Digite o código de 6 dígitos que enviamos ao e-mail que aceitou o contrato.</>
                )}{' '}
                Se não chegar, confira o spam ou a aba Promoções.
              </p>
              <div className="space-y-1.5">
                <label htmlFor="contrato-desistir-codigo" className="block font-medium text-foreground">
                  Código para desistir
                </label>
                <input
                  ref={codeRef}
                  id="contrato-desistir-codigo"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  readOnly={withdrawing}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setCodeError(null);
                  }}
                  aria-invalid={codeError ? true : undefined}
                  aria-describedby={codeError ? 'contrato-desistir-envio contrato-desistir-codigo-erro' : 'contrato-desistir-envio'}
                  className="h-14 w-full max-w-xs rounded-lg border-2 border-border bg-card px-4 font-mono text-2xl tracking-[0.4em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
                />
                {codeError && (
                  <p id="contrato-desistir-codigo-erro" role="alert" className="text-destructive">
                    {codeError}
                  </p>
                )}
              </div>
              <p className="font-medium">A reserva é cancelada, você recebe a confirmação por e-mail e a equipe devolve tudo o que você já pagou.</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="submit"
                  variant="destructive"
                  size="lg"
                  isLoading={withdrawing}
                  disabled={requesting || !/^\d{6}$/.test(code)}
                  className="w-full normal-case tracking-normal sm:w-auto"
                >
                  {withdrawing ? 'Registrando...' : 'Confirmar desistência'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => void requestCode()}
                  disabled={requesting || withdrawing || waitSeconds > 0}
                  className="w-full normal-case tracking-normal sm:w-auto"
                >
                  {waitSeconds > 0 ? `Enviar outro código em ${waitText(waitSeconds)}` : requesting ? 'Enviando...' : 'Enviar outro código'}
                </Button>
                <Button type="button" variant="outline" size="lg" onClick={cancelWithdraw} disabled={withdrawing} className="w-full normal-case tracking-normal sm:w-auto">
                  Voltar
                </Button>
              </div>
            </form>
          )}
          {/* Sempre na página (só o texto muda): o leitor de tela anuncia a mudança. */}
          <p role="status" className="text-muted-foreground">
            {codeMessage}
          </p>
          {/* A desistência vale por qualquer canal (CDC, art. 49): o código é só o caminho mais rápido por aqui. */}
          <p className="text-muted-foreground">
            Se o código não chegar, você também pode desistir pela sua área do cliente ou avisando a equipe pelo WhatsApp ou pelo
            e-mail {SUPPORT_EMAIL}.
          </p>
        </section>
      )}
      {withdrawError && (
        <p role="alert" className="rounded-lg border-2 border-destructive/50 bg-destructive/10 p-4">
          {withdrawError}
        </p>
      )}

    </div>
  );
}
