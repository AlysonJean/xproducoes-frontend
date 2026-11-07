import { Helmet } from 'react-helmet-async';
import { PageLayout } from '../components/layouts/PageLayout';
import { Alert } from '../components/ui/Alert';
import {
  RESERVATION_POLICY_DRAFT_NOTICE,
  RESERVATION_POLICY_PENDING_LABEL,
  RESERVATION_POLICY_PUBLISHED,
  RESERVATION_POLICY_TITLE,
  RESERVATION_POLICY_UPDATED_AT,
  RESERVATION_POLICY_VERSION,
} from '../data/reservationPolicy';
import { RESERVATION_POLICY_SECTIONS, type ReservationPolicyBlock } from '../data/reservationPolicyContent';

// P17 (aprovada em 02/11/2026): página "Política de reserva e cancelamento", montada como os Termos e a
// Privacidade e escrita a partir de src/data/reservationPolicyContent.ts. Enquanto RESERVATION_POLICY_PUBLISHED for
// false, é um rascunho para o dono e o advogado lerem: aviso no topo e noindex (o SSR põe a meta no HTML); o
// sitemap e o rodapé não a citam. Publicada, o aviso e o noindex saem. A trilha (breadcrumbs) vem pronta: sem ela,
// a trilha padrão criaria um link da página para ela mesma, com o rótulo sem acento ("Politica de reserva").

// A marca do que o dono ainda não respondeu: a seção inteira ou só um parágrafo (a frase da montagem do kit).
const PendingMark = ({ className = '' }: { className?: string }) => (
  <p className={`inline-block rounded-md border border-warning/50 bg-warning/10 px-2 py-1 text-sm font-medium text-foreground ${className}`}>
    {RESERVATION_POLICY_PENDING_LABEL}
  </p>
);

const Block = ({ block }: { block: ReservationPolicyBlock }) => {
  if (block.kind === 'paragraph') {
    const text = <p className="text-muted-foreground leading-relaxed">{block.text}</p>;
    if (!block.pendingConfirmation) return text;
    return (
      <div className="space-y-2 rounded-md border border-dashed border-warning/50 p-3">
        <PendingMark />
        {text}
      </div>
    );
  }
  const items = block.items.map((item) => <li key={item}>{item}</li>);
  const listClass = 'list-inside space-y-2 text-muted-foreground ml-4';
  return block.ordered ? (
    <ol className={`list-decimal ${listClass}`}>{items}</ol>
  ) : (
    <ul className={`list-disc ${listClass}`}>{items}</ul>
  );
};

export const ReservationPolicyPage = () => (
  <PageLayout
    title={RESERVATION_POLICY_TITLE}
    description={`Versão ${RESERVATION_POLICY_VERSION}, atualizada em ${RESERVATION_POLICY_UPDATED_AT}.`}
    breadcrumbs={[{ label: RESERVATION_POLICY_TITLE }]}
  >
    {!RESERVATION_POLICY_PUBLISHED && (
      <>
        <Helmet>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="max-w-4xl mx-auto">
          <Alert variant="warning" title={RESERVATION_POLICY_DRAFT_NOTICE} />
        </div>
      </>
    )}
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-xl p-8 space-y-8 border border-border">
        {RESERVATION_POLICY_SECTIONS.map((section, index) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-titulo`}>
            <h2 id={`${section.id}-titulo`} className="text-2xl font-semibold text-foreground mb-4">
              {index + 1}. {section.title}
            </h2>
            {section.pendingConfirmation && <PendingMark className="mb-4" />}
            <div className="space-y-4">
              {section.blocks.map((block, blockIndex) => (
                <Block key={blockIndex} block={block} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  </PageLayout>
);
