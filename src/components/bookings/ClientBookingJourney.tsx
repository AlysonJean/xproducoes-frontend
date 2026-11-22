import { CheckCircle2, Circle } from 'lucide-react';
import { Card } from '../ui/StandardComponents';
import { cn } from '../../utils/cn';
import { clientJourney } from '../../utils/bookingStatus';
import type { ProposalSummaryView } from '../../utils/bookingStatus';

// Onda 3 da auditoria do status da reserva: na área do cliente, o andamento da reserva em etapas e o próximo passo dele
// (antes, só o selo do status, que mudava de nome sem dizer o que vinha depois).
export function ClientBookingJourney({
  booking,
}: {
  booking: { status?: string | null; paymentStatus?: string | null; proposal?: ProposalSummaryView | null; eventDate?: string | null; review?: unknown };
}) {
  const journey = clientJourney(booking);
  if (!journey) return null;
  // A etapa atual (a primeira ainda a fazer), para o leitor de tela.
  const current = journey.steps.findIndex((step) => !step.done);
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-foreground">Andamento da reserva</h2>
      {/* role="list": sem o marcador (list-style: none), o VoiceOver do Safari deixa de anunciar a lista. */}
      <ol role="list" className="mt-4 flex flex-wrap gap-2" aria-label="Etapas da reserva">
        {journey.steps.map((step, index) => (
          <li
            key={step.label}
            aria-current={index === current ? 'step' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1 text-sm',
              step.done ? 'border-success/40 bg-success/10 text-success' : 'border-border text-muted-foreground',
            )}
          >
            {step.done ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Circle className="h-4 w-4" aria-hidden="true" />}
            <span>{step.label}</span>
            <span className="sr-only">{step.done ? '(feito)' : '(a fazer)'}</span>
          </li>
        ))}
      </ol>
      {journey.nextStep && (
        <p className="mt-4 text-sm text-foreground">
          <strong>Próximo passo:</strong> {journey.nextStep}
        </p>
      )}
    </Card>
  );
}
