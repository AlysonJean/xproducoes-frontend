import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FileDown } from 'lucide-react';
import { contractAPI, readApiError, saveBlob } from '@/services/api';
import { Button } from '@/components/ui/StandardComponents';
import type { ContractOtp, ContractPdfFile } from '@/types/contract';
import {
  contractErrorMessage,
  contractTime,
  currentTime,
  LINK_CODE_RESEND_WAIT_MS,
  reopensProposal,
  serverMessage,
  waitText,
} from './contractHelpers';

// Decisão de 16/11/2026 (LGPD, minimização e segurança): o contrato aceito traz CPF ou CNPJ, endereço, e-mail e telefone
// do contratante, e o link da proposta pode ter sido encaminhado. Logo depois do aceite, o botão baixa o PDF que a página
// acabou de mostrar no passo 2 (os mesmos bytes do contrato aceito), sem pedir nada. Ao reabrir o link, baixar pede um
// código enviado ao e-mail que aceitou o contrato (POST /proposals/contract/pdf/code). O código vale 10 minutos e pode ser
// usado de novo nesse tempo (um download que falhou no aparelho não pede outro código). O PDF também vai anexado ao
// e-mail do aceite e fica na área do cliente.
// Revisão do mesmo dia (há um código por vez para baixar e desistir): o código da desistência também baixa; com ele
// ainda valendo, o servidor não manda outro (reused "withdraw") e a tela pede aquele; pedir o da desistência zera o
// código de baixar desta tela (codeReset), e um código novo de baixar avisa a confirmação (onCodeIssued).

export interface ContractPdfDownloadProps {
  token: string;
  contractId: string;
  /** O PDF lido no passo 2 desta mesma visita: baixa direto. */
  pdfFile?: ContractPdfFile;
  /** O contrato saiu do aceito (ALREADY_ACCEPTED/CONTRACT_WITHDRAWN não se aplicam aqui, mas o link pode ter mudado). */
  onReopen?: () => void;
  /**
   * Muda quando a página pediu o código da desistência: há um código por vez, então o código de baixar desta tela deixa
   * de valer (o da desistência também baixa).
   */
  codeReset?: number;
  /** O servidor mandou um código novo para baixar: o código da desistência que a página guardava deixou de valer. */
  onCodeIssued?: () => void;
}

const UNAVAILABLE =
  'Baixar o contrato por esta página está indisponível agora. O PDF está anexado ao e-mail do aceite e na sua área do cliente.';
const FALLBACK = 'Não conseguimos baixar o contrato agora. Tente de novo em alguns minutos. O PDF também está no e-mail do aceite.';

export function ContractPdfDownload({ token, contractId, pdfFile, onReopen, codeReset = 0, onCodeIssued }: ContractPdfDownloadProps) {
  const [otp, setOtp] = useState<ContractOtp | null>(null);
  // O código que já baixou uma vez: vale até o otp vencer, e o próximo download não pede de novo.
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(currentTime);
  const codeRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  // Esta tela já pediu um código (para dizer "um novo código" e saber de onde veio o que chegou), mesmo depois de esquecê-lo.
  const askedBefore = useRef(false);
  const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const otpValid = (sent: ContractOtp | null) => Boolean(sent) && new Date((sent as ContractOtp).expiresAt).getTime() > currentTime();

  // A contagem do "Enviar outro código".
  useEffect(() => {
    if (resendAt <= currentTime()) return;
    const id = window.setInterval(() => {
      const t = currentTime();
      setNow(t);
      if (t >= resendAt) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendAt]);

  // A página pediu o código da desistência: o código de baixar guardado aqui deixou de valer (nada de reenviá-lo sozinho).
  const lastReset = useRef(codeReset);
  useEffect(() => {
    if (codeReset === lastReset.current) return;
    lastReset.current = codeReset;
    setOtp(null);
    setVerifiedCode(null);
  }, [codeReset]);

  // O foco acompanha a tela: o campo do código ao abrir; o botão "Baixar contrato" ao fechar.
  useEffect(() => {
    if (formOpen) codeRef.current?.focus();
    else if (wasOpen.current) buttonRef.current?.focus();
    wasOpen.current = formOpen;
  }, [formOpen]);

  /** O primeiro pedido e o "Enviar outro código": o código vai ao e-mail que aceitou o contrato. */
  const requestCode = async () => {
    const again = askedBefore.current;
    setRequesting(true);
    setError(null);
    setMessage(null);
    try {
      const sent = await contractAPI.pdfCode(token);
      askedBefore.current = true;
      setOtp(sent);
      setVerifiedCode(null);
      setFormOpen(true);
      setCode('');
      setCodeError(null);
      setResendAt(currentTime() + LINK_CODE_RESEND_WAIT_MS);
      setNow(currentTime());
      if (sent.reused === 'withdraw') {
        // O código da desistência ainda vale: o servidor não manda outro (não apaga o de quem está desistindo).
        setMessage(`Use o código da desistência que enviamos para ${sent.sentTo}: ele também serve para baixar.`);
      } else {
        onCodeIssued?.();
        if (again) setMessage(`Enviamos um novo código para ${sent.sentTo}.`);
      }
    } catch (err) {
      const info = readApiError(err);
      if (info.status === 429) {
        // Pedido cedo demais: o código pedido há pouco continua valendo, então o campo abre para digitá-lo.
        setFormOpen(true);
        setResendAt(currentTime() + (info.retryAfterSeconds ?? LINK_CODE_RESEND_WAIT_MS / 1000) * 1000);
        setNow(currentTime());
        setMessage(
          askedBefore.current
            ? `${serverMessage(info) || 'Você pediu um código há pouco.'} Se o código já chegou, digite-o abaixo.`
            : 'Você pediu um código há pouco. Digite abaixo o código que chegou por e-mail (o código da desistência também serve).',
        );
      } else if (info.code === 'CODE_NOT_SENT') {
        setError(serverMessage(info) || 'Não foi possível enviar o código agora. Tente de novo em instantes.');
      } else if (info.status === 503) {
        setError(UNAVAILABLE);
      } else if (reopensProposal(info.code)) {
        onReopen?.();
      } else {
        setError(contractErrorMessage(info, FALLBACK));
      }
    } finally {
      setRequesting(false);
    }
  };

  /** Baixa com o código; devolve se deu certo. */
  const downloadWith = async (value: string): Promise<boolean> => {
    setDownloading(true);
    setError(null);
    setMessage(null);
    try {
      await contractAPI.download(token, contractId, value);
      setVerifiedCode(value);
      setFormOpen(false);
      setCode('');
      setCodeError(null);
      setMessage('Contrato baixado. Confira a pasta de downloads do aparelho.');
      return true;
    } catch (err) {
      const info = readApiError(err);
      setVerifiedCode(null);
      if (info.code === 'INVALID_CODE') {
        const left = info.attemptsLeft;
        setFormOpen(true);
        setCodeError(
          left === 0
            ? 'Código incorreto, e as tentativas deste código acabaram. Peça outro código.'
            : left === null
              ? 'Código incorreto. Confira e digite de novo.'
              : `Código incorreto. ${left === 1 ? 'Resta 1 tentativa' : `Restam ${left} tentativas`}.`,
        );
        if (left === 0) {
          setResendAt(0);
          setOtp(null);
        }
        setCode('');
        codeRef.current?.focus();
      } else if (info.code === 'CODE_EXPIRED' || info.code === 'PDF_CODE_REQUIRED') {
        setFormOpen(true);
        setCodeError('O código venceu ou foi bloqueado. Peça outro código.');
        setResendAt(0);
        setOtp(null);
        setCode('');
        codeRef.current?.focus();
      } else if (info.status === 503) {
        setError(UNAVAILABLE);
      } else {
        setError(contractErrorMessage(info, FALLBACK));
      }
      return false;
    } finally {
      setDownloading(false);
    }
  };

  /** "Baixar contrato (PDF)": o arquivo desta visita; senão o código que ainda vale; senão pede um. */
  const start = () => {
    setError(null);
    setMessage(null);
    if (pdfFile) {
      saveBlob(pdfFile.blob, pdfFile.filename);
      setMessage('Contrato baixado. Confira a pasta de downloads do aparelho.');
      return;
    }
    if (verifiedCode && otpValid(otp)) {
      void downloadWith(verifiedCode);
      return;
    }
    if (otpValid(otp)) {
      setFormOpen(true);
      return;
    }
    void requestCode();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code) || downloading) return;
    void downloadWith(code);
  };

  const cancel = () => {
    setFormOpen(false);
    setCode('');
    setCodeError(null);
    setMessage(null);
    setError(null);
  };

  return (
    <div className="space-y-3">
      {!formOpen ? (
        <>
          <Button
            ref={buttonRef}
            type="button"
            variant="outline"
            size="lg"
            onClick={start}
            isLoading={requesting || downloading}
            leftIcon={<FileDown className="h-5 w-5" aria-hidden="true" />}
            className="w-full normal-case tracking-normal sm:w-auto"
          >
            {requesting ? 'Enviando o código...' : downloading ? 'Baixando...' : 'Baixar contrato (PDF)'}
          </Button>
          {!pdfFile && (
            <p className="text-muted-foreground">
              Para proteger os seus dados, baixar o contrato por esta página pede um código, que enviamos ao e-mail que aceitou o
              contrato.
            </p>
          )}
        </>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-3">
          <p id="contrato-baixar-envio">
            {otp ? (
              <>
                Enviamos um código de 6 dígitos para <strong className="break-all">{otp.sentTo}</strong>. Ele vale até{' '}
                {contractTime(otp.expiresAt)}.
              </>
            ) : (
              <>Digite o código de 6 dígitos que enviamos ao e-mail que aceitou o contrato.</>
            )}{' '}
            Se não chegar, confira o spam ou a aba Promoções.
          </p>
          <div className="space-y-1.5">
            <label htmlFor="contrato-baixar-codigo" className="block font-medium text-foreground">
              Código para baixar o contrato
            </label>
            <input
              ref={codeRef}
              id="contrato-baixar-codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              readOnly={downloading}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                setCodeError(null);
              }}
              aria-invalid={codeError ? true : undefined}
              aria-describedby={codeError ? 'contrato-baixar-envio contrato-baixar-codigo-erro' : 'contrato-baixar-envio'}
              className="h-14 w-full max-w-xs rounded-lg border-2 border-border bg-card px-4 font-mono text-2xl tracking-[0.4em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
            />
            {codeError && (
              <p id="contrato-baixar-codigo-erro" role="alert" className="text-destructive">
                {codeError}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="submit"
              size="lg"
              isLoading={downloading}
              disabled={requesting || !/^\d{6}$/.test(code)}
              leftIcon={<FileDown className="h-5 w-5" aria-hidden="true" />}
              className="w-full normal-case tracking-normal sm:w-auto"
            >
              {downloading ? 'Baixando...' : 'Baixar'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => void requestCode()}
              disabled={requesting || downloading || waitSeconds > 0}
              className="w-full normal-case tracking-normal sm:w-auto"
            >
              {waitSeconds > 0 ? `Enviar outro código em ${waitText(waitSeconds)}` : requesting ? 'Enviando...' : 'Enviar outro código'}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={cancel} disabled={downloading} className="w-full normal-case tracking-normal sm:w-auto">
              Voltar
            </Button>
          </div>
        </form>
      )}
      {/* Sempre na página (só o texto muda): o leitor de tela anuncia a mudança. */}
      <p role="status" className="text-muted-foreground">
        {message}
      </p>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
