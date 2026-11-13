import { useEffect, useState, type ReactNode } from 'react';
import { FileSignature, FileText, Mail } from 'lucide-react';
import { contractAPI } from '@/services/api';
import { Badge, Button, Card } from '@/components/ui/StandardComponents';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatPrice } from '@/utils/formatPrice';
import { formatCpf, formatDocument, maskDocument } from '@/utils/document';
import type { AdminContract, BookingContractSummary } from '@/types/contract';
import {
  PERSON_TYPE_LABEL,
  PURPOSE_LABEL,
  contractDate,
  contractDateTime,
  contractEventLabel,
  contractStateLabel,
  contractStateVariant,
  normalizeAdminContract,
} from './contractHelpers';

// Aceite online (13/11/2026): o cartão "Contrato" da ficha do painel (pages/admin/BookingDetailPage), quando a reserva
// tem contrato. GET /admin/bookings/:id/contract: quem aceitou, finalidade, documento (mascarado na tela; o completo só
// a pedido), data e hora, IP, navegador, impressão digital, vencimentos e a trilha do aceite. "Baixar contrato (PDF)" e
// "Reenviar e-mail do contrato" (POST .../contract/resend).

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; contract: AdminContract };

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="contents">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-foreground">{children}</dd>
    </div>
  );
}

export interface AdminContractCardProps {
  bookingId: string;
  summary: BookingContractSummary;
}

export function AdminContractCard({ bookingId, summary }: AdminContractCardProps) {
  const { addNotification } = useNotifications();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [showDocument, setShowDocument] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let active = true;
    contractAPI
      .forAdmin(bookingId)
      .then((raw) => active && setLoad({ status: 'ready', contract: normalizeAdminContract(raw) }))
      .catch((error: unknown) =>
        active &&
        setLoad({ status: 'error', message: error instanceof Error && error.message ? error.message : 'Não foi possível carregar o contrato.' }),
      );
    return () => {
      active = false;
    };
  }, [bookingId, summary.state, attempt]);

  const contract = load.status === 'ready' ? load.contract : null;
  const state = contract?.state ?? summary.state;
  const party = contract?.party ?? null;
  const hasFile = Boolean(contract?.sha256) || state === 'ACCEPTED' || state === 'WITHDRAWN';

  const download = async () => {
    setDownloading(true);
    try {
      await contractAPI.downloadForAdmin(bookingId);
    } catch (error) {
      addNotification({ type: 'error', title: 'Erro no PDF', message: error instanceof Error && error.message ? error.message : 'Não foi possível baixar o contrato.' });
    } finally {
      setDownloading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await contractAPI.resend(bookingId);
      addNotification({ type: 'success', title: 'E-mail reenviado', message: 'O e-mail do contrato, com o PDF e o comprovante do aceite, entrou na fila de envio.' });
      setAttempt((n) => n + 1);
    } catch (error) {
      addNotification({ type: 'error', title: 'E-mail não reenviado', message: error instanceof Error && error.message ? error.message : 'Não foi possível reenviar o e-mail do contrato.' });
    } finally {
      setResending(false);
    }
  };

  const documentText = (doc: string) => (showDocument ? formatDocument(doc) : maskDocument(doc));

  return (
    <Card className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileSignature className="h-5 w-5 text-primary" aria-hidden="true" />
          <h3 className="text-base font-bold text-foreground">Contrato</h3>
        </div>
        <Badge variant={contractStateVariant(state)}>{contractStateLabel(state)}</Badge>
      </div>

      {load.status === 'loading' && <p className="text-sm text-muted-foreground">Carregando o contrato...</p>}
      {load.status === 'error' && (
        <div role="alert" className="space-y-2 text-sm text-destructive">
          <p>{load.message}</p>
          <Button variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
            Tentar de novo
          </Button>
        </div>
      )}

      {contract && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {party && (
            <>
              <Row label="Contratante">{party.name}</Row>
              <Row label="Tipo">{PERSON_TYPE_LABEL[party.personType]}</Row>
              <Row label={party.personType === 'PJ' ? 'CNPJ' : 'CPF'}>
                <span className="font-mono">{documentText(party.document)}</span>
                {party.document && (
                  <button
                    type="button"
                    onClick={() => setShowDocument((v) => !v)}
                    aria-pressed={showDocument}
                    className="ml-2 text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    {showDocument ? 'Ocultar' : 'Mostrar completo'}
                  </button>
                )}
              </Row>
              {party.representative && (
                <Row label="Quem aceitou">
                  {party.representative.name}, {party.representative.role} (CPF{' '}
                  <span className="font-mono">{showDocument ? formatCpf(party.representative.cpf) : maskDocument(party.representative.cpf)}</span>)
                </Row>
              )}
            </>
          )}
          {contract.purpose && <Row label="Finalidade">{PURPOSE_LABEL[contract.purpose]}</Row>}
          {contract.otpEmail && <Row label="E-mail do código">{contract.otpEmail}</Row>}
          {contract.acceptedAt && <Row label="Aceito em">{contractDateTime(contract.acceptedAt)} (Brasília)</Row>}
          {contract.ip && <Row label="IP">{contract.ip}</Row>}
          {contract.userAgent && <Row label="Navegador">{contract.userAgent}</Row>}
          {contract.templateVersion && <Row label="Versão do modelo">{contract.templateVersion}</Row>}
          {contract.sha256 && (
            <Row label="Impressão digital (SHA-256)">
              <span className="break-all font-mono text-xs">{contract.sha256}</span>
            </Row>
          )}
          {contract.initialPayment && (
            <Row label="Parcela inicial">
              {formatPrice(contract.initialPayment.amount)} até {contractDate(contract.initialPayment.dueDate)}
            </Row>
          )}
          {contract.balance && (
            <Row label="Saldo">
              {formatPrice(contract.balance.amount)} até {contractDateTime(contract.balance.dueDate)}
            </Row>
          )}
          {contract.withdrawnAt ? (
            <Row label="Desistência">
              {contractDateTime(contract.withdrawnAt)}
              {contract.withdrawReason ? ` (${contract.withdrawReason})` : ''}
            </Row>
          ) : (
            contract.withdrawUntil && state === 'ACCEPTED' && <Row label="Pode desistir até">{contractDateTime(contract.withdrawUntil)}</Row>
          )}
        </dl>
      )}

      {hasFile && (
        <div className="flex flex-col gap-2">
          {hasFile && (
            <Button variant="outline" size="sm" fullWidth onClick={download} isLoading={downloading} leftIcon={<FileText className="h-4 w-4" />}>
              Baixar contrato (PDF)
            </Button>
          )}
          {state === 'ACCEPTED' && (
            <Button variant="outline" size="sm" fullWidth onClick={resend} isLoading={resending} leftIcon={<Mail className="h-4 w-4" />}>
              Reenviar e-mail do contrato
            </Button>
          )}
        </div>
      )}

      {contract && contract.events.length > 0 && (
        <section aria-labelledby="ficha-contrato-trilha" className="space-y-2">
          <h4 id="ficha-contrato-trilha" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Trilha do aceite
          </h4>
          <ol className="space-y-1 text-sm">
            {contract.events.map((event, idx) => (
              <li key={`${event.type}-${idx}`} className="flex flex-wrap justify-between gap-x-3">
                <span className="font-medium text-foreground">{contractEventLabel(event.type)}</span>
                <span className="text-muted-foreground">{contractDateTime(event.createdAt)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </Card>
  );
}
