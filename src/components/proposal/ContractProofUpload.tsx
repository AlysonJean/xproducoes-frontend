import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Upload } from 'lucide-react';
import { contractAPI, readApiError } from '@/services/api';
import { Button } from '@/components/ui/StandardComponents';
import { SUPPORT_EMAIL } from '@/data/site';
import type { ContractProof } from '@/types/contract';
import { ATTACHMENT_ACCEPT, ATTACHMENT_RULE_TEXT, attachmentFileProblem } from '@/utils/bookingAttachments';
import { contractDayMonthTime, contractErrorMessage, serverMessage } from './contractHelpers';

// Semanas 2 e 3 do teste do aceite (16/11/2026): "enviar o comprovante pela própria página, com aviso automático para a
// equipe" (antes: o comprovante ia pelo WhatsApp e o cliente esperava). POST /proposals/contract/proof, com o código do
// link; o arquivo segue a regra dos comprovantes da área do cliente (JPG, PNG, WebP ou PDF até 10 MB) e fica privado na
// reserva. A página mostra só a data de cada envio (o arquivo não volta pelo link).

export interface ContractProofUploadProps {
  token: string;
  proofs: ContractProof[];
  /** A equipe já registrou a parcela inicial: o comprovante agora é o do saldo. */
  received: boolean;
  /** Depois de cada envio, a lista nova (a confirmação tira o aviso do PIX vencido de quem já mandou o comprovante). */
  onProofsChange?: (proofs: ContractProof[]) => void;
}

const FALLBACK = `Não conseguimos enviar o comprovante agora. Tente de novo ou mande pelo WhatsApp ou pelo e-mail ${SUPPORT_EMAIL}.`;

function proofErrorMessage(info: ReturnType<typeof readApiError>): string {
  if (info.status === 413) return `Arquivo muito grande. Envie ${ATTACHMENT_RULE_TEXT}.`;
  if (info.status === 503) return `O envio pelo site está indisponível agora. Mande o comprovante pelo WhatsApp ou pelo e-mail ${SUPPORT_EMAIL}.`;
  if (info.status === 429) return serverMessage(info) || 'Muitos envios em pouco tempo. Aguarde alguns minutos e tente de novo.';
  return contractErrorMessage(info, FALLBACK);
}

export function ContractProofUpload({ token, proofs: initialProofs, received, onProofsChange }: ContractProofUploadProps) {
  const [proofs, setProofs] = useState<ContractProof[]>(initialProofs);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Depois do envio (com erro ou não), o foco volta ao campo do arquivo: o botão que estava com o foco fica desabilitado
  // sem arquivo. Só depois do desenho, quando o campo deixa de estar desabilitado.
  const focusFile = useRef(false);
  const inputId = useId();
  const errorId = `${inputId}-erro`;

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] ?? null;
    setMessage(null);
    const problem = chosen ? attachmentFileProblem(chosen) : null;
    setError(problem);
    setFile(problem ? null : chosen);
    if (problem) event.target.value = '';
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || sending) return;
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await contractAPI.proof(token, file);
      setProofs(result.proofs);
      onProofsChange?.(result.proofs);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      setMessage(`Comprovante enviado em ${contractDayMonthTime(result.sentAt)}. A equipe recebeu o aviso, confere o PIX e confirma a reserva.`);
    } catch (err) {
      setError(proofErrorMessage(readApiError(err)));
    } finally {
      focusFile.current = true;
      setSending(false);
    }
  };

  useEffect(() => {
    if (sending || !focusFile.current) return;
    focusFile.current = false;
    inputRef.current?.focus();
  }, [sending]);

  return (
    <section aria-labelledby={`${inputId}-titulo`} className="space-y-3 rounded-lg border-2 border-border p-4">
      <h3 id={`${inputId}-titulo`} className="text-lg font-bold text-foreground">
        Enviar o comprovante
      </h3>
      <p>
        {received
          ? 'Ao pagar o saldo, envie aqui o comprovante do PIX (foto ou PDF).'
          : 'Depois de pagar, envie aqui o comprovante do PIX (foto ou PDF). A equipe recebe um aviso, confere o pagamento e confirma a reserva.'}
      </p>
      {proofs.length > 0 && (
        <div>
          <p className="font-medium text-foreground">Comprovantes enviados por esta página:</p>
          <ul className="list-disc pl-6">
            {proofs.map((proof, idx) => (
              <li key={`${proof.sentAt}-${idx}`}>{contractDayMonthTime(proof.sentAt)}</li>
            ))}
          </ul>
        </div>
      )}
      <form onSubmit={send} noValidate className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor={inputId} className="block font-medium text-foreground">
            Arquivo do comprovante ({ATTACHMENT_RULE_TEXT})
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ATTACHMENT_ACCEPT}
            onChange={choose}
            disabled={sending}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="block w-full text-base text-foreground file:mr-3 file:min-h-11 file:rounded-lg file:border-2 file:border-border file:bg-card file:px-4 file:font-semibold file:text-foreground"
          />
          {error && (
            <p id={errorId} role="alert" className="text-destructive">
              {error}
            </p>
          )}
        </div>
        <Button
          type="submit"
          size="lg"
          isLoading={sending}
          disabled={!file || sending}
          leftIcon={<Upload className="h-5 w-5" aria-hidden="true" />}
          className="w-full normal-case tracking-normal sm:w-auto"
        >
          {sending ? 'Enviando...' : 'Enviar comprovante'}
        </Button>
      </form>
      {/* Sempre na página (só o texto muda): o leitor de tela anuncia o envio. */}
      <p role="status" className="min-h-6 text-muted-foreground">
        {message}
      </p>
    </section>
  );
}
