import { useEffect, useState } from 'react';
import { Calendar, FileDown, MapPin, ShieldCheck } from 'lucide-react';
import { apiFetch, quotePdfAPI } from '@/services/api';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { Button, Card } from '@/components/ui/StandardComponents';
import { NoticeCard, PROPOSAL_HELP_TEXT, ProposalShell, WhatsAppLink } from '@/components/proposal/ProposalShell';
import { ContractAcceptance } from '@/components/proposal/ContractAcceptance';
import type { ProposalContractStatus, ProposalPrefill } from '@/types/contract';
import { formatPrice } from '@/utils/formatPrice';
import { formatPricingLineTotal, toArrangeNote, type ToArrangeKind } from '@/utils/bookingPricing';
import { buildProposalReplyText } from '@/utils/whatsapp';
import { clientEventTitle } from '@/utils/eventTitle';

// P15 (aprovada em 02/11/2026), parte 1: página da proposta, sem login, só de leitura. Achado: a página antiga
// (/proposta/<número da reserva>) chamava GET /bookings/:id, que exige login e ser dono da reserva; o cliente que
// abria o link via "Proposta não encontrada", a validade era um "7 dias após emissão" fixo, e o convite de conta
// prometia "baixar notas fiscais". Agora o link é /proposta#token=<código>: o código fica depois do "#", que o
// navegador nunca manda ao servidor, então não entra nos registros da Vercel e do Render nem no Referer. A página
// lê o código só no navegador (useEffect; no SSR nada toca o window) e o manda no CORPO de POST /proposals/view.
// A resposta é uma lista fechada de campos (sem telefone, e-mail, endereço completo, notas nem o número da reserva).
// O aceite ("Li e aceito a política") é a parte 2, quando a política de reserva for publicada. O endereço antigo
// /proposta/<número> só avisa que o link não vale mais (pages/ProposalViewPage.tsx).
//
// A página não tem Analytics (utils/analyticsExclusions), sai com noindex e no-referrer e usa o layout mínimo do
// App.tsx (components/proposal/ProposalShell). O botão do WhatsApp é um link comum para o wa.me: sem o evento de
// conversão do GA, e o texto leva título e data, nunca o link.
// Auditoria do orçamento (12/11/2026): o link mostra sempre a reserva atual (decisão da dona de 12/11). O21/D9: as
// linhas sem preço (frete a combinar, pedágio à parte; o servidor manda toArrange) aparecem como "a combinar"/"à
// parte", nunca R$ 0,00, com a frase de que o total não as inclui. O11/D6: o link vencido responde 410 e a página diz
// "Este link venceu ou foi trocado. Peça um novo link à equipe."
// Orçamento em PDF (13/11/2026): "Baixar orçamento (PDF)" baixa o orçamento que o servidor gera na hora, a partir da
// reserva atual (a página continua sendo a fonte da verdade). O código vai no corpo do POST /proposals/pdf, com o
// mesmo controle do /proposals/view: link vencido ou trocado não baixa, e a página diz por quê.
// Aceite online (13/11/2026): com contract.enabled = true na resposta (CONTRACTS_ENABLED no servidor), a página mostra
// o aceite em passos abaixo da proposta (components/proposal/ContractAcceptance): "Aceitar proposta" no estado NONE ou
// PREPARED, a confirmação no ACCEPTED e "Contratação desistida" no WITHDRAWN. Sem contract (ou com enabled false e
// nenhum contrato aceito), nada muda: a proposta continua só de leitura, e o aceite segue com a equipe. O contrato já
// aceito ou desistido aparece sempre, também com a chave desligada depois e na resposta { state: "closed" } (reserva
// confirmada, ou validade vencida depois do aceite): o link é o caminho permanente para baixar o contrato e desistir no
// prazo de 7 dias (CDC, art. 49).

interface ProposalLine {
  description: string;
  quantity: number;
  total: number;
  toArrange?: ToArrangeKind;
}

interface OpenProposal {
  state: 'open';
  eventTitle: string | null;
  eventDate: string;
  eventEndDate: string;
  city: string | null;
  neighborhood: string | null;
  pricing: { lines: ProposalLine[]; discount: number | null; adjustment: number; total: number };
  validUntil: string;
  contract?: ProposalContractStatus | null;
  /** Revisão de 14/11/2026: o contato da reserva para começar o passo 1 do aceite. */
  prefill?: ProposalPrefill | null;
}

type ProposalResponse = OpenProposal | { state: 'closed'; contract?: ProposalContractStatus | null };

type ViewState =
  | { kind: 'loading' }
  | { kind: 'invalid' }
  | { kind: 'gone' }
  | { kind: 'closed'; contract?: ProposalContractStatus | null; token?: string }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'open'; proposal: OpenProposal; token: string };

/** O contrato já foi aceito (ou desistido) pelo site. */
const isSigned = (contract?: ProposalContractStatus | null): contract is ProposalContractStatus =>
  contract?.state === 'ACCEPTED' || contract?.state === 'WITHDRAWN';
/** A página mostra o aceite: a chave ligada (começar ou seguir o aceite) ou um contrato aceito ou desistido. */
const showsContract = (contract?: ProposalContractStatus | null): contract is ProposalContractStatus =>
  contract?.enabled === true || isSigned(contract);

const MESSAGES: Record<Exclude<ViewState['kind'], 'loading' | 'open'>, string> = {
  invalid: 'Este link não é válido. Peça um novo link à equipe.',
  gone: 'Este link venceu ou foi trocado. Peça um novo link à equipe.',
  closed: 'Esta proposta já foi confirmada.',
  unavailable: 'Link de proposta indisponível no momento.',
  error: 'Não conseguimos abrir a proposta agora. Tente de novo em alguns minutos ou fale com a equipe.',
};

// Data e hora do evento no horário de Brasília, qualquer que seja o fuso do aparelho de quem abre.
const dateBR = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });
const timeBR = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const dateTimeBR = (value: string) => `${dateBR.format(new Date(value))} às ${timeBR.format(new Date(value))}`;

/** O código do link: o valor de token= no fragmento (#token=...). Só no navegador. */
function readTokenFromHash(): string | null {
  const token = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token');
  return token && token.trim() ? token.trim() : null;
}

function stateForError(error: unknown): ViewState {
  const status = (error as { status?: number } | null)?.status;
  if (status === 404 || status === 400) return { kind: 'invalid' };
  if (status === 410) return { kind: 'gone' };
  if (status === 503) return { kind: 'unavailable' };
  return { kind: 'error' };
}

// Orçamento em PDF: o erro do download, pelo status (o mesmo do /proposals/view, mais o 409 da reserva confirmada e o
// 429 do limitador, que traz a mensagem do servidor).
function pdfErrorMessage(error: unknown): string {
  const status = (error as { status?: number } | null)?.status;
  if (status === 404 || status === 400) return MESSAGES.invalid;
  if (status === 410) return MESSAGES.gone;
  if (status === 409) return MESSAGES.closed;
  if (status === 503) return MESSAGES.unavailable;
  if (status === 429 && error instanceof Error && error.message) return error.message;
  return 'Não conseguimos gerar o PDF agora. Tente de novo em alguns minutos ou fale com a equipe.';
}

function OpenProposalView({ proposal, token }: { proposal: OpenProposal; token: string }) {
  const { pricing } = proposal;
  const offersContract = showsContract(proposal.contract);
  // Desistida (o servidor manda a proposta da reserva cancelada pela desistência): sem validade e sem o orçamento em
  // PDF (o POST /proposals/pdf responde 409 nela).
  const withdrawn = proposal.contract?.state === 'WITHDRAWN';
  const place = [proposal.neighborhood, proposal.city].filter(Boolean).join(', ');
  const toArrange = toArrangeNote(pricing.lines);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const downloadPdf = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      await quotePdfAPI.fromProposal(token);
    } catch (error) {
      setDownloadError(pdfErrorMessage(error));
    } finally {
      setDownloading(false);
    }
  };
  return (
    <Card padding className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Proposta</p>
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground break-words">{clientEventTitle(proposal.eventTitle) || 'Seu evento'}</h1>
      </div>

      <dl className="space-y-3 text-sm">
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <dt className="font-semibold text-foreground">Data</dt>
            <dd className="text-muted-foreground">
              Início {dateTimeBR(proposal.eventDate)} · término {dateTimeBR(proposal.eventEndDate)}
            </dd>
          </div>
        </div>
        {place && (
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <dt className="font-semibold text-foreground">Local</dt>
              <dd className="text-muted-foreground">{place}</dd>
            </div>
          </div>
        )}
      </dl>

      {/* As linhas, o desconto, o ajuste e o total da página do cliente (P16): técnico, montagem e frete inclusive. */}
      <div className="space-y-3 border-t border-border pt-4">
        {pricing.lines.length > 0 && (
          <ul className="space-y-2" aria-label="Itens da proposta">
            {pricing.lines.map((line, idx) => (
              <li key={idx} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0 break-words text-muted-foreground">
                  {line.quantity > 1 ? `${line.quantity}× ` : ''}{line.description}
                </span>
                <span className="shrink-0 font-medium text-foreground">{formatPricingLineTotal(line)}</span>
              </li>
            ))}
          </ul>
        )}
        {pricing.discount !== null && pricing.discount > 0 && (
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Desconto:</span>
            <span className="shrink-0 font-medium text-foreground">− {formatPrice(pricing.discount)}</span>
          </div>
        )}
        {pricing.adjustment !== 0 && (
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Ajuste no valor final:</span>
            <span className="shrink-0 font-medium text-foreground">
              {pricing.adjustment < 0 ? '− ' : '+ '}{formatPrice(Math.abs(pricing.adjustment))}
            </span>
          </div>
        )}
        <div className="flex justify-between gap-3 border-t border-border pt-3 text-lg font-bold">
          <span className="text-foreground">Total:</span>
          <span className="text-primary">{formatPrice(pricing.total)}</span>
        </div>
        {toArrange && <p className="text-sm text-muted-foreground">{toArrange}</p>}
      </div>

      {!withdrawn && (
        <>
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            Válida até {dateBR.format(new Date(proposal.validUntil))}
          </p>

          <div className="space-y-2">
            <Button
              variant="outline"
              onClick={downloadPdf}
              isLoading={downloading}
              leftIcon={<FileDown className="h-4 w-4" aria-hidden="true" />}
            >
              {downloading ? 'Gerando PDF...' : 'Baixar orçamento (PDF)'}
            </Button>
            {downloadError && (
              <p role="alert" className="text-sm text-destructive">
                {downloadError}
              </p>
            )}
          </div>
        </>
      )}

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {withdrawn
            ? 'Para contratar de novo, fale com a equipe.'
            : offersContract
              ? 'Dúvidas ou ajustes na proposta? Fale com a equipe.'
              : 'Para confirmar ou ajustar a proposta, fale com a equipe.'}
        </p>
        <WhatsAppLink text={buildProposalReplyText({ eventTitle: proposal.eventTitle, eventDate: proposal.eventDate })} />
      </div>
    </Card>
  );
}

export default function PublicProposalPage() {
  const [view, setView] = useState<ViewState>({ kind: 'loading' });
  // Aceite online: com a resposta "já aceita" (ALREADY_ACCEPTED), abre a proposta de novo, que volta na confirmação.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => {
    setView({ kind: 'loading' });
    setReloadKey((key) => key + 1);
  };

  useEffect(() => {
    let active = true;
    const token = readTokenFromHash();
    // Sem código no endereço, nem chama a API. O código vai no corpo, nunca no endereço. O POST pelo fetch (modo
    // "cors") já leva no Origin a origem do site mesmo com o no-referrer da página: pela especificação Fetch, a
    // política de referrer só zera o Origin fora do modo "cors". O referrerPolicy "origin" deste pedido garante
    // isso também num navegador que aplicasse o no-referrer da página ao Origin; sem o Origin, a conferência de
    // origem do CSRF (backend/src/middlewares/csrfMiddleware.ts) recusaria. O Referer leva só a origem do site, e o
    // fragmento (#token=...) nunca vai num Referer.
    const next: Promise<ViewState> = token
      ? apiFetch<ProposalResponse>('/proposals/view', {
          method: 'POST',
          body: JSON.stringify({ token }),
          referrerPolicy: 'origin',
        }).then((data): ViewState =>
          data.state === 'open' ? { kind: 'open', proposal: data, token } : { kind: 'closed', contract: data.contract, token },
        )
      : Promise.resolve({ kind: 'invalid' });
    next.catch(stateForError).then((state) => {
      if (active) setView(state);
    });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return (
    <ProposalShell>
      {view.kind === 'loading' && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <BrandLoader size={96} label="Abrindo a proposta..." />
        </div>
      )}
      {view.kind === 'open' && <OpenProposalView proposal={view.proposal} token={view.token} />}
      {view.kind === 'open' && showsContract(view.proposal.contract) && (
        <ContractAcceptance token={view.token} contract={view.proposal.contract} onReload={reload} prefill={view.proposal.prefill} />
      )}
      {view.kind === 'closed' && view.token && isSigned(view.contract) && (
        <ContractAcceptance token={view.token} contract={view.contract} onReload={reload} />
      )}
      {view.kind !== 'loading' && view.kind !== 'open' && !(view.kind === 'closed' && isSigned(view.contract)) && (
        <NoticeCard
          message={MESSAGES[view.kind]}
          whatsappText={view.kind === 'closed' ? 'Olá! Quero falar sobre a minha reserva já confirmada.' : PROPOSAL_HELP_TEXT}
        />
      )}
    </ProposalShell>
  );
}
