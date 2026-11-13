import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { ArrowLeft, ArrowRight, Check, Send } from 'lucide-react';
import { SEO } from '../../components/SEO';
import { ClientPage } from '../../components/client/ClientPage';
import { Alert, Button, Card, Input, Textarea } from '../../components/ui/StandardComponents';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useFormDraft } from '../../hooks/useFormDraft';
import { api } from '../../services/api';
import { logger } from '../../utils/logger';
import { quoteSuccessMessage } from '../../utils/quoteSubmission';
import { brasiliaDateISO } from '../../utils/brasiliaTime';
import {
  BRIEFING_STEPS,
  BRIEFING_TERMS,
  DJ_OPTIONS,
  EMPTY_BRIEFING,
  ENVIRONMENTS,
  EVENT_CREW_OPTIONS,
  EVENT_TYPES,
  GUEST_RANGES,
  NEED_BAND,
  NEED_DJ,
  NEEDS,
  VOLTAGES,
  YES_NO_UNKNOWN,
  briefingPrefill,
  buildBriefingPayload,
  formatCep,
  isCompleteCep,
  lookupCep,
  stepErrors,
  venueSummary,
  type BriefingAnswers,
  type BriefingErrors,
} from '../../utils/briefing';

const DRAFT_KEY = 'briefing-draft';
const STEP_INTROS = [
  'Quase tudo aqui é só tocar numa opção.',
  'Se ainda não fechou o local, sem problema.',
  'Pode marcar mais de uma opção.',
  'Tudo aqui é opcional. O que você souber já ajuda a acertar o orçamento.',
  'Com estes dados enviamos o orçamento e criamos seu acesso para acompanhar o pedido, sem precisar de senha agora.',
];

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p role="alert" className="mt-2 text-sm font-medium text-destructive">
      {message}
    </p>
  ) : null;

interface ChoiceProps {
  legend: string;
  options: readonly string[];
  selected: string | string[];
  onSelect: (option: string) => void;
  error?: string;
  columns?: string;
  /** Auditoria do orçamento (12/11/2026), E11: texto de ajuda da pergunta, ligado ao grupo (aria-describedby). */
  hint?: string;
}

// Botões grandes, fáceis de tocar no celular. O mesmo componente serve para escolha única e múltipla.
const Choice = ({ legend, options, selected, onSelect, error, columns = 'grid-cols-2', hint }: ChoiceProps) => {
  const hintId = useId();
  return (
    <fieldset aria-describedby={hint ? hintId : undefined}>
      <legend className="mb-3 text-sm font-semibold text-foreground">{legend}</legend>
      <div className={`grid gap-2 ${columns}`}>
        {options.map((option) => {
          const isSelected = Array.isArray(selected) ? selected.includes(option) : selected === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(option)}
              className={`flex min-h-12 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              <span>{option}</span>
              {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {hint && (
        <p id={hintId} className="mt-2 text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      <FieldError message={error} />
    </fieldset>
  );
};

export const BriefingPage: React.FC = () => {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { user, setAuthenticatedUser } = useAuth();
  const { addNotification } = useNotifications();
  const { save: saveDraft, load: loadDraft, clear: clearDraft } = useFormDraft<{ step: number; answers: Partial<BriefingAnswers> }>(DRAFT_KEY);

  const [answers, setAnswers] = useState<BriefingAnswers>(EMPTY_BRIEFING);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<BriefingErrors>({});
  const [draftChecked, setDraftChecked] = useState(false);
  const [restored, setRestored] = useState(false);
  const [minDate, setMinDate] = useState<string | undefined>(undefined);
  const [manualAddress, setManualAddress] = useState(false);
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'notFound'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  // A mesma resposta enviada de novo (internet caiu no meio) repete a chave: o servidor não duplica.
  const submission = useRef<{ answers: string; key: string } | null>(null);

  const update = (patch: Partial<BriefingAnswers>) => {
    setAnswers((current) => ({ ...current, ...patch }));
    setErrors({});
  };
  const pick = (field: keyof BriefingAnswers, option: string) => update({ [field]: answers[field] === option ? '' : option });
  const toggleNeed = (need: string) =>
    update({ needs: answers.needs.includes(need) ? answers.needs.filter((item) => item !== need) : [...answers.needs, need] });

  // Só no navegador: no servidor não há rascunho. A data mínima é hoje em Brasília, onde o evento acontece (auditoria do
  // orçamento, 12/11/2026, fuso; antes era o dia no aparelho de quem preenche).
  useEffect(() => {
    setMinDate(brasiliaDateISO());
    const draft = loadDraft();
    if (draft) {
      setAnswers((current) => ({ ...current, ...draft.values.answers }));
      setStep(draft.values.step);
      setRestored(true);
    }
    setDraftChecked(true);
  }, [loadDraft]);

  // Auditoria do orçamento (12/11/2026), O27: respostas que vieram no endereço (teste da Home, página de painel de LED
  // por cidade) entram por cima do rascunho, no primeiro passo, para a pessoa conferir; depois o endereço fica limpo,
  // e recarregar a página não volta a trocar o que ela mudou.
  useEffect(() => {
    if (!draftChecked) return;
    const prefill = briefingPrefill(search);
    if (Object.keys(prefill).length === 0) return;
    setAnswers((current) => ({
      ...current,
      ...prefill,
      needs: prefill.needs ? [...new Set([...current.needs, ...prefill.needs])] : current.needs,
    }));
    setStep(0);
    navigate(pathname, { replace: true });
  }, [draftChecked, search, pathname, navigate]);

  // Nome, telefone e e-mail ficam fora do rascunho: o aparelho pode ser compartilhado.
  useEffect(() => {
    if (!draftChecked || (!answers.eventType && !answers.eventDate)) return;
    const draftAnswers: Partial<BriefingAnswers> = { ...answers };
    delete draftAnswers.name;
    delete draftAnswers.phone;
    delete draftAnswers.email;
    delete draftAnswers.accepted;
    saveDraft({ step, answers: draftAnswers });
  }, [answers, step, draftChecked, saveDraft]);

  useEffect(() => {
    if (!user) return;
    setAnswers((current) => ({ ...current, name: current.name || user.name || '', phone: current.phone || user.phone || '' }));
  }, [user]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const cep = answers.zipCode;
  useEffect(() => {
    if (!isCompleteCep(cep)) {
      setCepStatus('idle');
      return;
    }
    const controller = new AbortController();
    setCepStatus('loading');
    void lookupCep(cep, controller.signal).then((address) => {
      if (controller.signal.aborted) return;
      setManualAddress(true);
      if (!address) {
        setCepStatus('notFound');
        return;
      }
      setCepStatus('idle');
      setAnswers((current) => ({
        ...current,
        street: address.street || current.street,
        neighborhood: address.neighborhood || current.neighborhood,
        city: address.city || current.city,
        state: address.state || current.state,
      }));
    });
    return () => controller.abort();
  }, [cep]);

  const startOver = () => {
    clearDraft();
    setAnswers(EMPTY_BRIEFING);
    setStep(0);
    setErrors({});
    setRestored(false);
    setManualAddress(false);
  };

  const validateStep = () => {
    const found = stepErrors(step, answers, { loggedIn: Boolean(user?.id) });
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const submit = async () => {
    setServerError(null);
    setIsSubmitting(true);
    const answersKey = JSON.stringify(answers);
    if (submission.current?.answers !== answersKey) {
      submission.current = { answers: answersKey, key: uuidv4() };
    }
    try {
      const payload = buildBriefingPayload(answers, { loggedIn: Boolean(user?.id), acceptedAt: new Date() });
      const response = await api.post(user?.id ? '/bookings' : '/bookings/guest', payload, {
        headers: { 'Idempotency-Key': submission.current.key },
      });
      // api.ts já desembrulha { success, data }; ver a mesma leitura em QuoteRequestPage.
      const data = response?.data?.data ?? response?.data;
      const booking = data?.booking ?? data ?? null;
      if (!user?.id && data?.user) setAuthenticatedUser(data.user);
      clearDraft();
      addNotification({ type: 'success', title: 'Pedido enviado!', message: quoteSuccessMessage(data) });
      navigate(booking?.id ? `/orcamento-sucesso/${booking.id}` : '/orcamento-sucesso', {
        state: {
          booking,
          formData: { name: answers.name, phone: answers.phone, venue: payload.location, city: payload.city, state: payload.state },
          cartItems: answers.needs.map((name) => ({ name })),
          briefingAccount: user?.id ? undefined : data?.existingAccount ? 'existing' : 'created',
        },
      });
    } catch (err: unknown) {
      logger.error('Erro ao enviar o briefing', 'BriefingPage', err);
      const message = (axios.isAxiosError(err) && err.response?.data?.message) || 'Não foi possível enviar agora. Suas respostas continuam aqui: tente de novo em instantes.';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const next = () => {
    if (!validateStep()) return;
    if (step === BRIEFING_STEPS.length - 1) {
      void submit();
      return;
    }
    setStep(step + 1);
  };

  const hasBand = answers.needs.includes(NEED_BAND);
  const hasDj = answers.needs.includes(NEED_DJ);
  const outdoors = answers.environment === 'Ao ar livre';
  const detailsAnswered = Boolean(answers.eventCrew || answers.voltage || answers.setupTime || answers.soundLimit || answers.rainCover || answers.bandInstruments || answers.bandRider || answers.djOption);
  const isLastStep = step === BRIEFING_STEPS.length - 1;
  const showAddress = answers.venueKnown === 'yes' && (manualAddress || isCompleteCep(answers.zipCode));

  return (
    <ClientPage
      width="2xl"
      title="Conte como vai ser o seu evento"
      description="São 5 passos rápidos, cerca de 2 minutos. Com isso preparamos um orçamento certo para você."
    >
      <SEO
        title="Conte como vai ser o seu evento"
        description="Responda poucas perguntas sobre o seu evento e receba o orçamento de som, luz e palco da X Produções."
      />

      <Card className="p-4 shadow-xl sm:p-8">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>Passo {step + 1} de {BRIEFING_STEPS.length}</span>
            {restored && (
              <button type="button" onClick={startOver} className="font-medium text-primary underline underline-offset-2">
                Recomeçar
              </button>
            )}
          </div>
          <div
            role="progressbar"
            aria-label="Progresso do briefing"
            aria-valuemin={1}
            aria-valuemax={BRIEFING_STEPS.length}
            aria-valuenow={step + 1}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / BRIEFING_STEPS.length) * 100}%` }} />
          </div>
        </div>

        {restored && step > 0 && (
          <p role="status" className="mb-4 text-sm text-muted-foreground">Guardamos suas respostas: pode continuar de onde parou.</p>
        )}

        <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold text-foreground outline-none">
          {BRIEFING_STEPS[step]}
        </h2>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">{STEP_INTROS[step]}</p>

        <div className="space-y-6">
          {step === 0 && (
            <>
              <Choice legend="Que tipo de evento é?" options={EVENT_TYPES} selected={answers.eventType} onSelect={(option) => pick('eventType', option)} error={errors.eventType} />
              <Input
                label="Qual é a data?"
                type="date"
                min={minDate}
                value={answers.eventDate}
                onChange={(event) => update({ eventDate: event.target.value })}
                error={errors.eventDate}
              />
              {!answers.timeUnknown && (
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Começa às" type="time" value={answers.startTime} onChange={(event) => update({ startTime: event.target.value })} error={errors.startTime} />
                  <Input label="Termina às" type="time" value={answers.endTime} onChange={(event) => update({ endTime: event.target.value })} />
                  <p className="col-span-2 text-xs text-muted-foreground">Horário de Brasília.</p>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={answers.timeUnknown} onChange={(event) => update({ timeUnknown: event.target.checked })} />
                Ainda não sei o horário
              </label>
              <Choice legend="Quantos convidados, mais ou menos?" options={GUEST_RANGES} selected={answers.guests} onSelect={(option) => pick('guests', option)} error={errors.guests} />
            </>
          )}

          {step === 1 && (
            <>
              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-foreground">Já sabe onde vai ser?</legend>
                <div className="grid grid-cols-2 gap-2">
                  {([['yes', 'Já sei o local'], ['no', 'Ainda não sei']] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={answers.venueKnown === value}
                      onClick={() => update({ venueKnown: value })}
                      className={`min-h-12 rounded-xl border px-3 py-2 text-sm font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        answers.venueKnown === value ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <FieldError message={errors.venueKnown} />
              </fieldset>

              {answers.venueKnown === 'yes' && (
                <>
                  <Input label="Nome do local (opcional)" placeholder="Ex.: Espaço Kalahari" value={answers.venue} onChange={(event) => update({ venue: event.target.value })} />
                  <div>
                    <Input
                      label="CEP"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      placeholder="00000-000"
                      value={answers.zipCode}
                      onChange={(event) => update({ zipCode: formatCep(event.target.value) })}
                    />
                    {cepStatus === 'loading' && <p role="status" className="mt-2 text-sm text-muted-foreground">Buscando o endereço...</p>}
                    {cepStatus === 'notFound' && <p role="status" className="mt-2 text-sm text-muted-foreground">Não achamos esse CEP. Preencha o endereço abaixo.</p>}
                    {!showAddress && (
                      <button type="button" onClick={() => setManualAddress(true)} className="mt-2 text-sm font-medium text-primary underline underline-offset-2">
                        Não sei o CEP
                      </button>
                    )}
                  </div>
                  {showAddress && (
                    <>
                      <Input label="Rua" autoComplete="address-line1" value={answers.street} onChange={(event) => update({ street: event.target.value })} error={errors.street} />
                      <div className="grid grid-cols-2 gap-3">
                        <Input label="Número" value={answers.addressNumber} onChange={(event) => update({ addressNumber: event.target.value })} error={errors.addressNumber} />
                        <Input label="Complemento (opcional)" value={answers.addressComplement} onChange={(event) => update({ addressComplement: event.target.value })} />
                      </div>
                      <Input label="Bairro" value={answers.neighborhood} onChange={(event) => update({ neighborhood: event.target.value })} error={errors.neighborhood} />
                    </>
                  )}
                </>
              )}

              {(answers.venueKnown === 'no' || showAddress) && (
                <div className="grid grid-cols-[1fr_5rem] gap-3">
                  <Input label="Cidade" autoComplete="address-level2" value={answers.city} onChange={(event) => update({ city: event.target.value })} error={errors.city} />
                  <Input label="UF" maxLength={2} value={answers.state} onChange={(event) => update({ state: event.target.value.toUpperCase() })} error={errors.state} />
                </div>
              )}

              {answers.venueKnown !== '' && (
                <>
                  <Choice legend="Como é o espaço?" options={ENVIRONMENTS} selected={answers.environment} onSelect={(option) => pick('environment', option)} />
                  {answers.venueKnown === 'yes' && (
                    <>
                      <Choice legend="Tem escada no caminho até o espaço?" options={YES_NO_UNKNOWN} selected={answers.stairs} onSelect={(option) => pick('stairs', option)} columns="grid-cols-3" />
                      <Choice legend="Dá para parar perto para carregar e descarregar?" options={YES_NO_UNKNOWN} selected={answers.parking} onSelect={(option) => pick('parking', option)} columns="grid-cols-3" />
                    </>
                  )}
                </>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <Choice legend="O que o seu evento precisa?" options={NEEDS} selected={answers.needs} onSelect={toggleNeed} error={errors.needs} />
              {hasBand && (
                <Input label="Quantas pessoas na banda? (opcional)" inputMode="numeric" value={answers.bandSize} onChange={(event) => update({ bandSize: event.target.value })} />
              )}
              <Textarea
                label="Quer contar mais alguma coisa? (opcional)"
                rows={3}
                maxLength={1500}
                placeholder="Ex.: a entrada dos noivos vai ter música ao vivo."
                value={answers.moreInfo}
                onChange={(event) => update({ moreInfo: event.target.value })}
              />
            </>
          )}

          {step === 3 && (
            <>
              {/* Auditoria do orçamento (12/11/2026), E11: montar e buscar depois ou técnico durante todo o evento. */}
              <Choice
                legend="Montamos e buscamos depois, ou um técnico fica durante todo o evento?"
                options={EVENT_CREW_OPTIONS}
                selected={answers.eventCrew}
                onSelect={(option) => pick('eventCrew', option)}
                columns="grid-cols-1 sm:grid-cols-3"
                hint="O técnico entra na proposta como item, pelas horas do evento, quando não vem no kit."
              />
              <Choice legend="As tomadas do local são de qual tensão?" options={VOLTAGES} selected={answers.voltage} onSelect={(option) => pick('voltage', option)} columns="grid-cols-3" />
              <Input label="A partir de que horas podemos montar?" type="time" value={answers.setupTime} onChange={(event) => update({ setupTime: event.target.value })} />
              <Choice legend="O local tem horário limite para som?" options={YES_NO_UNKNOWN} selected={answers.soundLimit} onSelect={(option) => pick('soundLimit', option)} columns="grid-cols-3" />
              {outdoors && (
                <Choice legend="Tem proteção para os equipamentos se chover?" options={YES_NO_UNKNOWN} selected={answers.rainCover} onSelect={(option) => pick('rainCover', option)} columns="grid-cols-3" />
              )}
              {hasBand && (
                <>
                  <Choice legend="A banda leva os próprios instrumentos?" options={YES_NO_UNKNOWN} selected={answers.bandInstruments} onSelect={(option) => pick('bandInstruments', option)} columns="grid-cols-3" />
                  <Choice legend="A banda tem rider técnico?" options={YES_NO_UNKNOWN} selected={answers.bandRider} onSelect={(option) => pick('bandRider', option)} columns="grid-cols-3" />
                </>
              )}
              {hasDj && (
                <Choice legend="Sobre o DJ:" options={DJ_OPTIONS} selected={answers.djOption} onSelect={(option) => pick('djOption', option)} columns="grid-cols-1" />
              )}
            </>
          )}

          {step === 4 && (
            <>
              <Input label="Seu nome" autoComplete="name" value={answers.name} onChange={(event) => update({ name: event.target.value })} error={errors.name} />
              <Input label="WhatsApp com DDD" type="tel" autoComplete="tel" placeholder="(31) 98888-7777" value={answers.phone} onChange={(event) => update({ phone: event.target.value })} error={errors.phone} />
              {!user?.id && (
                <Input label="E-mail" type="email" autoComplete="email" placeholder="voce@exemplo.com" value={answers.email} onChange={(event) => update({ email: event.target.value })} error={errors.email} />
              )}

              <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="font-semibold text-foreground">Confira o resumo</span>
                  <button type="button" onClick={() => setStep(0)} className="font-medium text-primary underline underline-offset-2">
                    Alterar
                  </button>
                </div>
                <ul className="space-y-1 break-words text-muted-foreground">
                  <li>{answers.eventType} em {answers.eventDate.split('-').reverse().join('/')}{answers.timeUnknown ? ', horário a confirmar' : `, das ${answers.startTime} às ${answers.endTime}`}</li>
                  <li>{venueSummary(answers)}</li>
                  <li>{answers.needs.join(', ')}</li>
                </ul>
              </div>

              <div>
                <label className="flex items-start gap-2 text-sm text-foreground">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-primary" checked={answers.accepted} onChange={(event) => update({ accepted: event.target.checked })} />
                  <span>
                    {BRIEFING_TERMS} Veja os <Link to="/termos" target="_blank" className="font-medium text-primary underline underline-offset-2">Termos</Link> e a <Link to="/privacidade" target="_blank" className="font-medium text-primary underline underline-offset-2">Política de Privacidade</Link>.
                  </span>
                </label>
                <FieldError message={errors.accepted} />
              </div>

              {serverError && <Alert variant="error">{serverError}</Alert>}
            </>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button type="button" variant="ghost" onClick={() => { setErrors({}); setStep(step - 1); }} leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
              Voltar
            </Button>
          ) : <span />}
          <Button
            type="button"
            onClick={next}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            rightIcon={isLastStep ? <Send className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          >
            {isLastStep ? 'Enviar e receber o orçamento' : step === 3 && !detailsAnswered ? 'Pular esta etapa' : 'Continuar'}
          </Button>
        </div>
      </Card>
    </ClientPage>
  );
};
