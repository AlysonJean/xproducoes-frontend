import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, ExternalLink, FileDown } from 'lucide-react';
import { contractAPI, readApiError } from '@/services/api';
import { Button, buttonVariants } from '@/components/ui/StandardComponents';
import { formatPrice } from '@/utils/formatPrice';
import type { ContractAccepted, ContractPrepared, ContractPurpose } from '@/types/contract';
import {
  cancellationNotes,
  contractDate,
  contractDateTime,
  contractErrorMessage,
  contractTime,
  currentTime,
  limitingClauses,
  reopensProposal,
} from './contractHelpers';

// Aceite online (13/11/2026), passo 2: antes do "Aceito" o cliente vê o RESUMO da contratação (do servidor) e o
// CONTRATO INTEGRAL (o PDF exato que o servidor preparou e guardou, com a impressão digital SHA-256 à vista), marca a
// caixa (desmarcada de início) e digita o código de 6 dígitos que foi para o e-mail dele (MP 2.200-2, art. 10, § 2º;
// CDC, art. 54, § 4º: as cláusulas que limitam direitos em destaque). No celular o PDF dentro da página costuma não
// abrir (ou só a 1ª página): lá o contrato abre em tela cheia ou é baixado, e o aviso diz isso. O "Aceito" só fica
// habilitado com o contrato aberto, a caixa marcada e os 6 dígitos do código: nada de aceite por omissão.

const RESEND_WAIT_MS = 60_000;

type PdfState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; url: string; filename: string };

function SummaryRow({ label, children, strong }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="font-semibold text-foreground">{label}</dt>
      <dd className={strong ? 'text-lg font-bold text-primary' : 'text-foreground'}>{children}</dd>
    </div>
  );
}

export interface ContractReviewStepProps {
  token: string;
  prepared: ContractPrepared;
  purpose: ContractPurpose | null;
  /** Aviso no topo do passo (o contrato foi preparado de novo porque a reserva mudou). */
  notice?: string | null;
  /** O contrato está sendo preparado de novo (CONTRACT_CHANGED): nada de aceitar o anterior enquanto isso. */
  busy?: boolean;
  onCorrect: () => void;
  onAccepted: (accepted: ContractAccepted, sentTo: string) => void;
  /** 409 CONTRACT_CHANGED: a reserva mudou; quem chama prepara o contrato de novo. */
  onContractChanged: () => void;
  /** 409 ALREADY_ACCEPTED ou CONTRACT_WITHDRAWN: quem chama abre a proposta de novo. */
  onReopen: () => void;
}

export function ContractReviewStep({
  token,
  prepared,
  purpose,
  notice,
  busy = false,
  onCorrect,
  onAccepted,
  onContractChanged,
  onReopen,
}: ContractReviewStepProps) {
  const { summary } = prepared;
  const [pdf, setPdf] = useState<PdfState>({ status: 'loading' });
  const [pdfAttempt, setPdfAttempt] = useState(0);
  const [otp, setOtp] = useState(prepared.otp);
  const [code, setCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendAt, setResendAt] = useState(() => currentTime() + RESEND_WAIT_MS);
  const [now, setNow] = useState(currentTime);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));
  // O que ainda falta para o "Aceito" (o botão fica desabilitado até não faltar nada).
  const missing = [
    busy && 'esperar o contrato novo',
    pdf.status !== 'ready' && 'o contrato completo aberto nesta página',
    !agreed && 'marcar a caixa de concordância',
    !/^\d{6}$/.test(code) && 'digitar os 6 dígitos do código',
  ].filter((item): item is string => Boolean(item));
  const canAccept = missing.length === 0;

  // O PDF exato preparado (POST /proposals/contract/pdf), num endereço local do navegador; solto ao sair do passo.
  useEffect(() => {
    let active = true;
    let url: string | null = null;
    contractAPI
      .pdf(token, prepared.contractId)
      .then(({ blob, filename }) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setPdf({ status: 'ready', url, filename: filename || 'contrato.pdf' });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setPdf({
          status: 'error',
          message: contractErrorMessage(readApiError(error), 'Não conseguimos abrir o contrato agora. Tente de novo em alguns instantes.'),
        });
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [token, prepared.contractId, pdfAttempt]);

  // A contagem do "Reenviar código".
  useEffect(() => {
    if (resendAt <= currentTime()) return;
    const id = window.setInterval(() => {
      const t = currentTime();
      setNow(t);
      if (t >= resendAt) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendAt]);

  const allowResendNow = () => {
    setResendAt(0);
    setNow(currentTime());
  };

  const retryPdf = () => {
    setPdf({ status: 'loading' });
    setPdfAttempt((n) => n + 1);
  };

  const resend = async () => {
    setResending(true);
    setResendMessage(null);
    try {
      const fresh = await contractAPI.sendCode(token, prepared.contractId);
      setOtp(fresh);
      setResendAt(currentTime() + RESEND_WAIT_MS);
      setNow(currentTime());
      setCode('');
      setCodeError(null);
      setResendMessage(`Enviamos um novo código para ${fresh.sentTo}.`);
    } catch (error) {
      const info = readApiError(error);
      if (info.code === 'CONTRACT_CHANGED') {
        onContractChanged();
        return;
      }
      if (reopensProposal(info.code)) {
        onReopen();
        return;
      }
      if (info.status === 429) {
        const wait = (info.retryAfterSeconds ?? RESEND_WAIT_MS / 1000) * 1000;
        setResendAt(currentTime() + wait);
        setNow(currentTime());
        setResendMessage('Você pediu muitos códigos seguidos. Aguarde a contagem para pedir outro.');
      } else {
        setResendMessage(contractErrorMessage(info, 'Não conseguimos reenviar o código agora. Tente de novo em alguns instantes.'));
      }
    } finally {
      setResending(false);
    }
  };

  const accept = async (event: FormEvent) => {
    event.preventDefault();
    if (!canAccept || submitting) return;
    setAcceptError(null);
    setSubmitting(true);
    try {
      const accepted = await contractAPI.accept(token, { contractId: prepared.contractId, sha256: prepared.sha256, code });
      onAccepted(accepted, otp.sentTo);
    } catch (error) {
      const info = readApiError(error);
      if (info.code === 'CONTRACT_CHANGED') {
        onContractChanged();
        return;
      }
      if (reopensProposal(info.code)) {
        onReopen();
        return;
      }
      if (info.code === 'INVALID_CODE') {
        const left = info.attemptsLeft;
        if (left === 0) {
          setCodeError('Código incorreto, e as tentativas deste código acabaram. Peça um novo código.');
          allowResendNow();
        } else {
          setCodeError(
            left === null ? 'Código incorreto. Confira e digite de novo.' : `Código incorreto. ${left === 1 ? 'Resta 1 tentativa' : `Restam ${left} tentativas`}.`,
          );
        }
        setCode('');
        codeRef.current?.focus();
      } else if (info.code === 'CODE_EXPIRED') {
        setCodeError('O código venceu. Peça um novo código e digite-o aqui.');
        setCode('');
        allowResendNow();
        codeRef.current?.focus();
      } else {
        setAcceptError(contractErrorMessage(info, 'Não conseguimos registrar o aceite agora. Tente de novo em alguns minutos ou fale com a equipe.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const notes = cancellationNotes(purpose);

  return (
    <div className="space-y-8 text-base">
      {busy && (
        <p role="status" className="rounded-lg bg-muted p-4">
          A proposta mudou. Preparando o contrato de novo...
        </p>
      )}
      {notice && (
        <div role="alert" className="flex gap-3 rounded-lg border-2 border-warning/60 bg-warning/10 p-4 text-foreground">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
          <p>{notice}</p>
        </div>
      )}

      <section aria-labelledby="contrato-resumo" className="space-y-5 rounded-lg border-2 border-primary/40 bg-primary/5 p-4 sm:p-6">
        <h3 id="contrato-resumo" className="text-xl font-bold text-foreground">
          Resumo da contratação
        </h3>
        <dl className="space-y-3">
          <SummaryRow label="O que você contrata">{summary.object}</SummaryRow>
          <SummaryRow label="Data do evento">
            Início {contractDateTime(summary.eventDate)}
            {summary.eventEndDate ? ` · término ${contractDateTime(summary.eventEndDate)}` : ''}
          </SummaryRow>
          <SummaryRow label="Local">{summary.location}</SummaryRow>
          <SummaryRow label="Valor total" strong>
            {formatPrice(summary.total)}
          </SummaryRow>
          <SummaryRow label="Parcela inicial do preço">
            {formatPrice(summary.initialPayment.amount)}, por PIX, até {contractDate(summary.initialPayment.dueDate)} se você
            aceitar hoje (o prazo conta do aceite). A data só fica reservada depois que ela é paga.
          </SummaryRow>
          <SummaryRow label="Saldo">
            {formatPrice(summary.balance.amount)}, até {contractDateTime(summary.balance.dueDate)}
          </SummaryRow>
          <SummaryRow label="Frete">{summary.freight}</SummaryRow>
          <SummaryRow label="Desistência">
            {summary.withdrawalDays
              ? `Você pode desistir em até ${summary.withdrawalDays} dias corridos depois do aceite, sem custo, com a devolução de tudo o que pagou.`
              : 'Na contratação para revender ou produzir o evento de outra pessoa não há prazo de desistência: vale a tabela de cancelamento.'}
          </SummaryRow>
          <SummaryRow label="Foro">{summary.forum}</SummaryRow>
        </dl>

        <div className="space-y-3 rounded-lg border-l-4 border-warning bg-warning/10 p-4">
          <h4 className="font-bold text-foreground">Cancelamento (cláusula em destaque)</h4>
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Retenção do valor total pela antecedência do cancelamento</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-2 pr-3 font-semibold">Quando você cancela</th>
                <th scope="col" className="py-2 font-semibold">Fica retido do valor total</th>
              </tr>
            </thead>
            <tbody>
              {summary.cancellation.map((rule) => (
                <tr key={rule.range} className="border-b border-border/60">
                  <td className="py-2 pr-3">{rule.range}</td>
                  <td className="py-2 font-semibold">{rule.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {notes.highlight.map((text) => (
            <p key={text} className="font-semibold">
              {text}
            </p>
          ))}
          {notes.plain.map((text) => (
            <p key={text}>{text}</p>
          ))}
        </div>

        <div className="space-y-3">
          <h4 className="font-bold text-foreground">Outras cláusulas em destaque</h4>
          <ul className="space-y-3">
            {limitingClauses().map((clause) => (
              <li key={clause.title} className="rounded-lg border-l-4 border-warning bg-warning/10 p-4">
                <p className="font-semibold text-foreground">{clause.title}</p>
                {clause.texts.map((text) => (
                  <p key={text} className="mt-1 font-semibold">
                    {text}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-muted-foreground">Este é um resumo. Vale o texto do contrato completo, logo abaixo.</p>
      </section>

      <section aria-labelledby="contrato-integral" className="space-y-4">
        <h3 id="contrato-integral" className="text-xl font-bold text-foreground">
          Contrato completo
        </h3>
        <p>Leia o contrato inteiro antes de aceitar, inclusive as cláusulas em destaque. Você pode salvar e imprimir o arquivo.</p>
        {pdf.status === 'loading' && <p role="status">Carregando o contrato...</p>}
        {pdf.status === 'error' && (
          <div role="alert" className="space-y-3 rounded-lg border-2 border-destructive/50 bg-destructive/10 p-4">
            <p>{pdf.message}</p>
            <Button type="button" variant="outline" size="lg" onClick={retryPdf}>
              Tentar de novo
            </Button>
          </div>
        )}
        {pdf.status === 'ready' && (
          <>
            <iframe
              src={pdf.url}
              title="Contrato completo (PDF)"
              className="hidden h-[75vh] w-full rounded-lg border-2 border-border bg-card md:block"
            />
            <p className="rounded-lg bg-muted p-4 md:hidden">
              No celular, abra o contrato em tela cheia (ou baixe o arquivo) para ler todas as páginas.
            </p>
            <p className="hidden text-muted-foreground md:block">
              Se o contrato não aparecer no quadro acima, abra em tela cheia ou baixe o arquivo.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={pdf.url}
                target="_blank"
                rel="noopener"
                className={buttonVariants({ variant: 'outline', size: 'lg', className: 'normal-case tracking-normal' })}
              >
                <ExternalLink className="h-5 w-5" aria-hidden="true" />
                Abrir o contrato em tela cheia
              </a>
              <a
                href={pdf.url}
                download={pdf.filename}
                className={buttonVariants({ variant: 'outline', size: 'lg', className: 'normal-case tracking-normal' })}
              >
                <FileDown className="h-5 w-5" aria-hidden="true" />
                Baixar contrato (PDF)
              </a>
            </div>
          </>
        )}
        <div className="space-y-1">
          <p className="font-semibold">Impressão digital do contrato (SHA-256)</p>
          <p className="break-all font-mono text-base" data-testid="contrato-sha256">
            {prepared.sha256}
          </p>
          <p className="text-muted-foreground">
            É a identificação única deste arquivo: o contrato que fica guardado depois do aceite tem a mesma impressão digital.
            Versão do modelo: {prepared.templateVersion}.
          </p>
        </div>
      </section>

      <form onSubmit={accept} noValidate className="space-y-5" aria-labelledby="contrato-confirmar">
        <h3 id="contrato-confirmar" className="text-xl font-bold text-foreground">
          Aceite
        </h3>
        {/* A ordem da política de reserva: marcar a caixa, digitar o código e clicar em "Aceito". */}
        <label
          htmlFor="contrato-concordo"
          className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border-2 border-border p-3 font-medium text-foreground"
        >
          <input
            id="contrato-concordo"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-primary"
          />
          <span>Li o contrato inteiro, inclusive as cláusulas em destaque, e concordo</span>
        </label>
        <p>
          Enviamos um código de 6 dígitos para <strong className="break-all">{otp.sentTo}</strong>. Ele vale até{' '}
          {contractTime(otp.expiresAt)}.
        </p>
        <div className="space-y-1.5">
          <label htmlFor="contrato-codigo" className="block font-medium text-foreground">
            Código de confirmação
          </label>
          <input
            ref={codeRef}
            id="contrato-codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
              setCodeError(null);
            }}
            aria-invalid={codeError ? true : undefined}
            aria-describedby={codeError ? 'contrato-codigo-erro' : undefined}
            className="h-14 w-full max-w-xs rounded-lg border-2 border-border bg-card px-4 font-mono text-2xl tracking-[0.4em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
          />
          {codeError && (
            <p id="contrato-codigo-erro" role="alert" className="text-destructive">
              {codeError}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={resend}
            disabled={waitSeconds > 0 || resending}
            className="w-full normal-case tracking-normal sm:w-auto"
          >
            {waitSeconds > 0 ? `Reenviar código em ${waitSeconds} s` : resending ? 'Reenviando...' : 'Reenviar código'}
          </Button>
          {resendMessage && (
            <p role="status" className="text-muted-foreground">
              {resendMessage}
            </p>
          )}
        </div>

        {acceptError && (
          <p role="alert" className="rounded-lg border-2 border-destructive/50 bg-destructive/10 p-4">
            {acceptError}
          </p>
        )}

        {!canAccept && (
          <p id="contrato-aceite-falta" className="text-muted-foreground">
            Para aceitar, falta: {missing.join('; ')}.
          </p>
        )}
        {/* A ordem na tela é a do Tab, no celular e no computador. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="lg" onClick={onCorrect} disabled={submitting}>
            Corrigir dados
          </Button>
          <Button
            type="submit"
            size="lg"
            isLoading={submitting}
            disabled={!canAccept}
            aria-describedby={canAccept ? undefined : 'contrato-aceite-falta'}
            className="sm:min-w-48"
          >
            {submitting ? 'Registrando...' : 'Aceito'}
          </Button>
        </div>
      </form>
    </div>
  );
}
