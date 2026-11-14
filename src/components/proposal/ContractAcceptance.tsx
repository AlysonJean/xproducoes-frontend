import { useEffect, useRef, useState } from 'react';
import { FileSignature } from 'lucide-react';
import { contractAPI, readApiError } from '@/services/api';
import { Button, Card } from '@/components/ui/StandardComponents';
import { cn } from '@/utils/cn';
import type { ContractPrepared, ContractPurpose, ProposalContractStatus, ProposalPrefill } from '@/types/contract';
import { ContractPartyStep } from './ContractPartyStep';
import { ContractReviewStep } from './ContractReviewStep';
import { ContractConfirmation, type ContractConfirmationData } from './ContractConfirmation';
import {
  contractDayMonth,
  contractErrorMessage,
  formErrorsFromServer,
  partyFormFromPrefill,
  partyFromForm,
  reopensProposal,
  type PartyForm,
  type PartyFormErrors,
} from './contractHelpers';

// Aceite online (13/11/2026): o aceite da proposta pelo site, em passos (dados → resumo, contrato completo e código →
// confirmação), quando o /proposals/view traz contract.enabled = true (CONTRACTS_ENABLED no servidor). O contrato já
// aceito (ou desistido) aparece mesmo com a chave desligada depois: baixar e desistir no prazo de 7 dias não somem
// (CDC, art. 49). Sem contrato e sem a chave, a página da proposta não mostra nada disto. As regras ficam no servidor
// (roteiro da leva B, "CONTRATO DA API"): aqui só o caminho do cliente e as mensagens de cada resposta.

type Stage = 'intro' | 'party' | 'review' | 'accepted' | 'withdrawn';

const STEPS = ['Seus dados', 'Contrato e código', 'Confirmação'] as const;
const STEP_OF: Partial<Record<Stage, number>> = { party: 0, review: 1, accepted: 2 };
const TITLE_OF: Record<Stage, string> = {
  intro: 'Aceitar a proposta pelo site',
  party: 'Passo 1 de 3: seus dados',
  review: 'Passo 2 de 3: resumo, contrato e código',
  accepted: 'Passo 3 de 3: contrato aceito',
  withdrawn: 'Contratação desistida',
};

const CHANGED_NOTICE =
  'A proposta mudou depois que você abriu o contrato. Preparamos o contrato de novo, com um novo código no seu e-mail: confira o resumo e o contrato e aceite outra vez.';

export interface ContractAcceptanceProps {
  token: string;
  contract: ProposalContractStatus;
  /** Abre a proposta de novo: já aceita ou desistida (reopensProposal), a página volta na confirmação ou na desistência. */
  onReload: () => void;
  /** O contato da reserva para começar o passo 1 (revisão de 14/11/2026); sem ele, o passo 1 começa vazio. */
  prefill?: ProposalPrefill | null;
}

function initialConfirmation(contract: ProposalContractStatus): ContractConfirmationData {
  return {
    acceptedAt: contract.acceptedAt ?? null,
    sha256: contract.sha256 ?? null,
    withdrawUntil: contract.withdrawUntil ?? null,
    canWithdraw: contract.canWithdraw,
    contractId: contract.contractId,
    protocol: contract.protocol ?? undefined,
    initialPayment: contract.initialPayment ?? null,
    balance: contract.balance ?? null,
    pixKey: contract.pix?.key,
  };
}

export function ContractAcceptance({ token, contract, onReload, prefill }: ContractAcceptanceProps) {
  const [stage, setStage] = useState<Stage>(
    contract.state === 'ACCEPTED' ? 'accepted' : contract.state === 'WITHDRAWN' ? 'withdrawn' : 'intro',
  );
  const [form, setForm] = useState<PartyForm>(() => partyFormFromPrefill(prefill));
  const [purpose, setPurpose] = useState<ContractPurpose | null>(null);
  const [prepared, setPrepared] = useState<ContractPrepared | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ContractConfirmationData>(() => initialConfirmation(contract));
  const [withdrawnAt, setWithdrawnAt] = useState<string | null>(contract.withdrawnAt ?? null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // A cada passo, o foco vai para o título (o leitor de tela anuncia onde a pessoa está) e a página rola até ele.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    headingRef.current?.scrollIntoView?.({ block: 'start' });
  }, [stage, prepared?.contractId]);

  /** POST /proposals/contract/prepare. Devolve os erros por campo (passo 1) ou nada. */
  const prepare = async (data: PartyForm, options: { changed?: boolean } = {}): Promise<PartyFormErrors | void> => {
    setPreparing(true);
    setError(null);
    try {
      const result = await contractAPI.prepare(token, partyFromForm(data));
      setPrepared(result);
      setPurpose(data.purpose || null);
      setNotice(options.changed ? CHANGED_NOTICE : null);
      setStage('review');
    } catch (err) {
      const info = readApiError(err);
      if (reopensProposal(info.code)) {
        onReload();
        return;
      }
      // A reserva mudou e o contrato novo não saiu: volta aos dados, com o motivo (o "Continuar" tenta de novo).
      if (options.changed) setStage('party');
      if (info.status === 400 && Object.keys(info.fieldErrors).length > 0) {
        const { errors, other } = formErrorsFromServer(info.fieldErrors);
        setError(['Confira os campos destacados.', ...other].join(' '));
        return errors;
      }
      setError(contractErrorMessage(info, 'Não conseguimos preparar o contrato agora. Tente de novo em alguns minutos ou fale com a equipe.'));
    } finally {
      setPreparing(false);
    }
  };

  const alert = error && (
    <div role="alert" className="rounded-lg border-2 border-destructive/50 bg-destructive/10 p-4 text-base">
      <p>{error}</p>
    </div>
  );

  const step = STEP_OF[stage];

  return (
    <section aria-labelledby="contrato-aceite-titulo">
      <Card padding className="space-y-6">
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-base font-semibold uppercase tracking-wider text-muted-foreground">
            <FileSignature className="h-5 w-5" aria-hidden="true" />
            Contrato
          </p>
          <h2 id="contrato-aceite-titulo" ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold text-foreground focus:outline-none">
            {stage === 'withdrawn' && withdrawnAt ? `Contratação desistida em ${contractDayMonth(withdrawnAt)}` : TITLE_OF[stage]}
          </h2>
          {step !== undefined && (
            <ol aria-label="Etapas do aceite" className="grid grid-cols-3 gap-2">
              {STEPS.map((label, idx) => (
                <li
                  key={label}
                  aria-current={idx === step ? 'step' : undefined}
                  className={cn(
                    'rounded-lg border-2 px-2 py-2 text-center text-base font-semibold',
                    idx === step ? 'border-primary bg-primary/10 text-primary' : idx < step ? 'border-primary/30 text-foreground' : 'border-border text-muted-foreground',
                  )}
                >
                  {label}
                </li>
              ))}
            </ol>
          )}
        </div>

        {stage === 'intro' && (
          <div className="space-y-4 text-base">
            <p>
              Você pode aceitar esta proposta aqui: informa os seus dados, confere o resumo e o contrato completo e confirma com um
              código enviado ao seu e-mail.
            </p>
            {contract.state === 'PREPARED' && <p>Você já começou o aceite: para continuar, informe os seus dados de novo.</p>}
            <p className="text-muted-foreground">O aceite não reserva a data sozinho: ela fica reservada depois que a parcela inicial é paga.</p>
            {alert}
            <Button type="button" size="lg" fullWidth onClick={() => setStage('party')}>
              Aceitar proposta
            </Button>
          </div>
        )}

        {stage === 'party' && (
          <ContractPartyStep
            form={form}
            onChange={setForm}
            onSubmit={(data) => prepare(data)}
            submitting={preparing}
            alert={alert}
            prefill={prefill}
          />
        )}

        {stage === 'review' && prepared && (
          <>
            {alert}
            <ContractReviewStep
              key={prepared.contractId}
              token={token}
              prepared={prepared}
              purpose={purpose}
              notice={notice}
              busy={preparing}
              onCorrect={() => {
                setNotice(null);
                setError(null);
                setStage('party');
              }}
              onAccepted={(accepted, sentTo) => {
                setConfirmation({
                  acceptedAt: accepted.acceptedAt,
                  protocol: accepted.protocol,
                  sha256: accepted.sha256,
                  initialPayment: accepted.initialPayment,
                  balance: accepted.balance,
                  withdrawUntil: accepted.withdrawUntil,
                  canWithdraw: Boolean(accepted.withdrawUntil),
                  pixKey: accepted.pix?.key,
                  contractId: prepared.contractId,
                  sentTo,
                });
                setStage('accepted');
              }}
              onContractChanged={() => {
                void prepare(form, { changed: true });
              }}
              onReopen={onReload}
            />
          </>
        )}

        {stage === 'accepted' && (
          <ContractConfirmation
            token={token}
            data={confirmation}
            onReopen={onReload}
            onWithdrawn={(at) => {
              setWithdrawnAt(at);
              setStage('withdrawn');
            }}
          />
        )}

        {stage === 'withdrawn' && (
          <div className="space-y-3 text-base">
            <p>A reserva foi cancelada. Enviamos a confirmação para o seu e-mail.</p>
            <p>Se você já pagou alguma parte, a equipe devolve tudo o que você pagou.</p>
          </div>
        )}
      </Card>
    </section>
  );
}
