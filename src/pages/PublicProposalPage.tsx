import { useEffect, useState } from 'react';
import { Calendar, MapPin, ShieldCheck } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { Card } from '@/components/ui/StandardComponents';
import { NoticeCard, PROPOSAL_HELP_TEXT, ProposalShell, WhatsAppLink } from '@/components/proposal/ProposalShell';
import { formatPrice } from '@/utils/formatPrice';
import { formatPricingLineTotal, toArrangeNote, type ToArrangeKind } from '@/utils/bookingPricing';
import { buildProposalReplyText } from '@/utils/whatsapp';

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
}

type ProposalResponse = OpenProposal | { state: 'closed' };

type ViewState =
  | { kind: 'loading' }
  | { kind: 'invalid' }
  | { kind: 'gone' }
  | { kind: 'closed' }
  | { kind: 'unavailable' }
  | { kind: 'error' }
  | { kind: 'open'; proposal: OpenProposal };

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

function OpenProposalView({ proposal }: { proposal: OpenProposal }) {
  const { pricing } = proposal;
  const place = [proposal.neighborhood, proposal.city].filter(Boolean).join(', ');
  const toArrange = toArrangeNote(pricing.lines);
  return (
    <Card padding className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Proposta</p>
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground break-words">{proposal.eventTitle || 'Seu evento'}</h1>
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

      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        Válida até {dateBR.format(new Date(proposal.validUntil))}
      </p>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Para confirmar ou ajustar a proposta, fale com a equipe.</p>
        <WhatsAppLink text={buildProposalReplyText({ eventTitle: proposal.eventTitle, eventDate: proposal.eventDate })} />
      </div>
    </Card>
  );
}

export default function PublicProposalPage() {
  const [view, setView] = useState<ViewState>({ kind: 'loading' });

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
        }).then((data): ViewState => (data.state === 'open' ? { kind: 'open', proposal: data } : { kind: 'closed' }))
      : Promise.resolve({ kind: 'invalid' });
    next.catch(stateForError).then((state) => {
      if (active) setView(state);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <ProposalShell>
      {view.kind === 'loading' && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <BrandLoader size={96} label="Abrindo a proposta..." />
        </div>
      )}
      {view.kind === 'open' && <OpenProposalView proposal={view.proposal} />}
      {view.kind !== 'loading' && view.kind !== 'open' && (
        <NoticeCard
          message={MESSAGES[view.kind]}
          whatsappText={view.kind === 'closed' ? 'Olá! Quero falar sobre a minha reserva já confirmada.' : PROPOSAL_HELP_TEXT}
        />
      )}
    </ProposalShell>
  );
}
