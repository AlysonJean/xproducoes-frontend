import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/StandardComponents';
import { cn } from '@/utils/cn';
import { formatDocument, formatCpf, isValidCnpj, isValidCpf, onlyDigits } from '@/utils/document';
import { lookupCep } from '@/utils/briefing';
import type { ProposalPrefill } from '@/types/contract';
import { BRAZIL_STATES, formatPhone, normalizePhone, validatePartyForm, type PartyForm, type PartyFormErrors } from './contractHelpers';

// Aceite online (13/11/2026), passo 1: os dados de quem contrata. Texto de 16 px (também nos campos: abaixo disso o
// celular aproxima a tela ao tocar no campo). Cada erro fica ligado ao seu campo (aria-describedby) e o foco vai para
// o primeiro campo com erro, do site ou do servidor (fieldErrors).
// Revisão de 14/11/2026 (teste de 13/11 na produção): o telefone aceita o +55 do preenchimento automático e ganha a
// máscara ao sair do campo; o CEP vem primeiro e completa rua, bairro, cidade e estado (ViaCEP, como no briefing).

const inputClass = (hasError: boolean) =>
  cn(
    'h-12 w-full rounded-lg border-2 bg-card px-4 text-base text-foreground transition-colors',
    'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    hasError ? 'border-destructive' : 'border-border hover:border-primary/50',
  );

interface FieldProps {
  name: keyof PartyForm;
  label: string;
  value: string;
  error?: string;
  hint?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: string;
  inputMode?: 'text' | 'numeric' | 'email' | 'tel';
  autoComplete?: string;
  optional?: boolean;
}

function TextField({ name, label, value, error, hint, onChange, onBlur, type = 'text', inputMode, autoComplete, optional }: FieldProps) {
  const id = `contrato-${name}`;
  const describedBy = [hint ? `${id}-dica` : null, error ? `${id}-erro` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-base font-medium text-foreground">
        {label}
        {optional && <span className="font-normal text-muted-foreground"> (opcional)</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={inputClass(Boolean(error))}
      />
      {hint && (
        <p id={`${id}-dica`} className="text-base text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-erro`} className="text-base text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

interface ChoiceProps<T extends string> {
  name: keyof PartyForm;
  legend: string;
  value: T | '';
  options: Array<{ value: T; label: string; description?: string }>;
  error?: string;
  onChange: (value: T) => void;
}

function ChoiceGroup<T extends string>({ name, legend, value, options, error, onChange }: ChoiceProps<T>) {
  const errorId = `contrato-${name}-erro`;
  return (
    <fieldset className="space-y-2" aria-describedby={error ? errorId : undefined}>
      <legend className="mb-2 text-base font-semibold text-foreground">{legend}</legend>
      {options.map((option, idx) => {
        const id = `contrato-${name}-${option.value}`;
        return (
          <label
            key={option.value}
            htmlFor={id}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 text-base',
              value === option.value ? 'border-primary bg-primary/5' : 'border-border',
            )}
          >
            <input
              id={id}
              type="radio"
              name={`contrato-${name}`}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              // O foco do erro vai para a primeira opção do grupo.
              data-field={idx === 0 ? name : undefined}
              aria-invalid={error ? true : undefined}
              className="mt-1 h-5 w-5 shrink-0 accent-primary"
            />
            <span>
              <span className="block font-medium text-foreground">{option.label}</span>
              {option.description && <span className="block text-muted-foreground">{option.description}</span>}
            </span>
          </label>
        );
      })}
      {error && (
        <p id={errorId} className="text-base text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}

// A ordem em que o foco procura o primeiro campo com erro (a ordem da tela).
const FIELD_ORDER: Array<keyof PartyForm> = [
  'personType', 'name', 'document', 'representativeName', 'representativeCpf', 'representativeRole', 'powers',
  'email', 'phone', 'zipCode', 'street', 'number', 'complement', 'neighborhood', 'city', 'state', 'purpose',
];

export interface ContractPartyStepProps {
  form: PartyForm;
  onChange: (form: PartyForm) => void;
  /** Manda ao servidor; devolve os erros por campo que ele apontar (ou nada). */
  onSubmit: (form: PartyForm) => Promise<PartyFormErrors | void>;
  submitting: boolean;
  /** Aviso geral (link vencido, proposta já aceita...), mostrado acima do botão. */
  alert?: ReactNode;
  /**
   * O contato da reserva (prefill): o nome passa para "quem aceita pela empresa" ao escolher "Empresa"; o e-mail e o
   * telefone aparecem só mascarados, com "Usar outro".
   */
  prefill?: ProposalPrefill | null;
}

/** O contato da reserva, mascarado, no lugar do campo; "Usar outro" abre o campo. */
function BookingContact({ label, hint, note, otherLabel, onOther }: { label: string; hint: string; note?: string; otherLabel: string; onOther: () => void }) {
  return (
    <div className="space-y-1.5">
      <p className="block text-base font-medium text-foreground">{label}</p>
      <p className="rounded-lg border-2 border-border bg-muted/40 px-4 py-3 text-base">
        <span className="break-all font-mono">{hint}</span> <span className="text-muted-foreground">(o da reserva)</span>
      </p>
      {note && <p className="text-base text-muted-foreground">{note}</p>}
      <Button type="button" variant="ghost" size="sm" onClick={onOther} className="text-base normal-case tracking-normal">
        {otherLabel}
      </Button>
    </div>
  );
}

const EMAIL_NOTE = 'O código de confirmação e a cópia do contrato vão para este e-mail.';

export function ContractPartyStep({ form, onChange, onSubmit, submitting, alert, prefill }: ContractPartyStepProps) {
  const prefillName = prefill?.name;
  const emailHint = prefill?.emailHint ?? null;
  const phoneHint = prefill?.phoneHint ?? null;
  const [errors, setErrors] = useState<PartyFormErrors>({});
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'notFound'>('idle');
  const formRef = useRef<HTMLFormElement>(null);
  // O formulário e o onChange de agora, para a resposta do CEP (que chega depois) não desfazer o que foi digitado.
  const latestForm = useRef(form);
  const latestOnChange = useRef(onChange);
  const cepLookup = useRef<AbortController | null>(null);
  // O campo que recebe o foco depois do próximo desenho (o primeiro com erro, ou o que acabou de abrir).
  const pendingFocus = useRef<keyof PartyForm | null>(null);
  const pj = form.personType === 'PJ';

  useEffect(() => {
    latestForm.current = form;
    latestOnChange.current = onChange;
    const field = pendingFocus.current;
    if (field) {
      pendingFocus.current = null;
      formRef.current?.querySelector<HTMLElement>(`#contrato-${field}, [data-field="${field}"]`)?.focus();
    }
  });
  useEffect(() => () => cepLookup.current?.abort(), []);

  const set = <K extends keyof PartyForm>(key: K, value: PartyForm[K]) => {
    onChange({ ...form, [key]: value });
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const focusFirst = (found: PartyFormErrors) => {
    const first = FIELD_ORDER.find((key) => found[key]);
    if (first) pendingFocus.current = first;
  };

  /** "Usar outro e-mail/telefone": abre o campo vazio, com o foco nele; "usar o da reserva" volta ao mascarado. */
  const chooseBooking = (field: 'email' | 'phone', value: boolean) => {
    const flag = field === 'email' ? 'useBookingEmail' : 'useBookingPhone';
    onChange({ ...form, [flag]: value, [field]: '' });
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (!value) pendingFocus.current = field;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validatePartyForm(form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      focusFirst(found);
      return;
    }
    setErrors({});
    // A busca do CEP ainda no ar não mexe mais no formulário que foi para o servidor.
    cepLookup.current?.abort();
    setCepStatus('idle');
    const fromServer = await onSubmit(form);
    if (fromServer && Object.keys(fromServer).length > 0) {
      // O e-mail ou o telefone da reserva não serviram (a reserva não tem, ou não é válido): o campo abre para digitar.
      const reopenEmail = Boolean(fromServer.email) && form.useBookingEmail;
      const reopenPhone = Boolean(fromServer.phone) && form.useBookingPhone;
      if (reopenEmail || reopenPhone) {
        onChange({
          ...form,
          useBookingEmail: form.useBookingEmail && !reopenEmail,
          useBookingPhone: form.useBookingPhone && !reopenPhone,
        });
      }
      setErrors(fromServer);
      focusFirst(fromServer);
    }
  };

  // CEP: com os 8 números, a rua, o bairro, a cidade e o estado vêm do ViaCEP (o que ele não trouxer fica como está); sem
  // resposta, a pessoa preenche à mão. Só quando o CEP muda: voltar do passo 2 não desfaz o que foi corrigido.
  const changeZip = (value: string) => {
    const zip = onlyDigits(value);
    const changed = zip !== onlyDigits(form.zipCode);
    const typed = { ...form, zipCode: value };
    latestForm.current = typed;
    onChange(typed);
    if (errors.zipCode) setErrors((current) => ({ ...current, zipCode: undefined }));
    if (!changed) return;
    cepLookup.current?.abort();
    if (zip.length !== 8) {
      setCepStatus('idle');
      return;
    }
    const controller = new AbortController();
    cepLookup.current = controller;
    setCepStatus('loading');
    // O endereço como estava ao pedir: a resposta só preenche o campo que ninguém mexeu enquanto ela vinha.
    const before = { street: typed.street, neighborhood: typed.neighborhood, city: typed.city, state: typed.state };
    // Sem resposta em 8 s: a pessoa preenche à mão.
    const timer = window.setTimeout(() => {
      if (cepLookup.current !== controller) return;
      controller.abort();
      setCepStatus('notFound');
    }, 8000);
    void lookupCep(zip, controller.signal).then((address) => {
      window.clearTimeout(timer);
      if (controller.signal.aborted) return;
      if (!address) {
        setCepStatus('notFound');
        return;
      }
      setCepStatus('idle');
      const current = latestForm.current;
      const keep = (field: keyof typeof before, value: string) => (value && current[field] === before[field] ? value : current[field]);
      const filled = {
        ...current,
        street: keep('street', address.street),
        neighborhood: keep('neighborhood', address.neighborhood),
        city: keep('city', address.city),
        state: keep('state', (BRAZIL_STATES as readonly string[]).includes(address.state) ? address.state : ''),
      };
      latestForm.current = filled;
      latestOnChange.current(filled);
      setErrors((found) => ({
        ...found,
        street: filled.street ? undefined : found.street,
        neighborhood: filled.neighborhood ? undefined : found.neighborhood,
        city: filled.city ? undefined : found.city,
        state: filled.state ? undefined : found.state,
      }));
    });
  };

  // Telefone com a máscara ao sair do campo, quando fecha DDD e número.
  const tidyPhone = () => {
    const digits = normalizePhone(form.phone);
    if (digits.length === 10 || digits.length === 11) set('phone', formatPhone(form.phone));
  };

  // CPF/CNPJ com a pontuação ao sair do campo, quando a conta fecha.
  const tidyDocument = () => {
    if (pj ? isValidCnpj(form.document) : isValidCpf(form.document)) set('document', formatDocument(form.document));
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="flex gap-3 rounded-lg border-2 border-primary/40 bg-primary/5 p-4 text-base font-semibold text-foreground">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <p>Estes dados são necessários para emitir e cumprir o contrato.</p>
      </div>

      <ChoiceGroup
        name="personType"
        legend="Quem contrata"
        value={form.personType}
        options={[
          { value: 'PF', label: 'Pessoa física' },
          { value: 'PJ', label: 'Empresa (pessoa jurídica)' },
        ]}
        error={errors.personType}
        onChange={(value) => {
          // O nome da reserva é o de uma pessoa: em "Empresa" ele passa para "quem aceita pela empresa" (a razão social
          // fica para preencher); de volta a "Pessoa física", volta.
          const fromPrefill = prefillName?.trim();
          if (value === 'PJ' && fromPrefill && form.name.trim() === fromPrefill && !form.representativeName.trim()) {
            onChange({ ...form, personType: value, name: '', representativeName: form.name });
          } else if (value === 'PF' && fromPrefill && !form.name.trim() && form.representativeName.trim() === fromPrefill) {
            onChange({ ...form, personType: value, name: form.representativeName, representativeName: '' });
          } else {
            onChange({ ...form, personType: value });
          }
          setErrors({});
        }}
      />

      <TextField
        name="name"
        label={pj ? 'Razão social' : 'Nome completo'}
        value={form.name}
        error={errors.name}
        onChange={(v) => set('name', v)}
        autoComplete={pj ? 'organization' : 'name'}
      />
      <TextField
        name="document"
        label={pj ? 'CNPJ' : 'CPF'}
        value={form.document}
        error={errors.document}
        onChange={(v) => set('document', v)}
        onBlur={tidyDocument}
        inputMode={pj ? 'text' : 'numeric'}
      />

      {pj && (
        <fieldset className="space-y-4 rounded-lg border-2 border-border p-4">
          <legend className="px-1 text-base font-semibold text-foreground">Quem aceita pela empresa</legend>
          <TextField
            name="representativeName"
            label="Nome completo de quem aceita"
            value={form.representativeName}
            error={errors.representativeName}
            onChange={(v) => set('representativeName', v)}
            autoComplete="name"
          />
          <TextField
            name="representativeCpf"
            label="CPF de quem aceita"
            value={form.representativeCpf}
            error={errors.representativeCpf}
            onChange={(v) => set('representativeCpf', v)}
            onBlur={() => isValidCpf(form.representativeCpf) && set('representativeCpf', formatCpf(form.representativeCpf))}
            inputMode="numeric"
          />
          <TextField
            name="representativeRole"
            label="Cargo"
            value={form.representativeRole}
            error={errors.representativeRole}
            onChange={(v) => set('representativeRole', v)}
            autoComplete="organization-title"
          />
          <div className="space-y-1.5">
            <label htmlFor="contrato-powers" className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-base text-foreground">
              <input
                id="contrato-powers"
                type="checkbox"
                checked={form.powers}
                onChange={(e) => set('powers', e.target.checked)}
                aria-invalid={errors.powers ? true : undefined}
                aria-describedby={errors.powers ? 'contrato-powers-erro' : undefined}
                className="mt-1 h-5 w-5 shrink-0 accent-primary"
              />
              <span>Declaro que tenho poderes para representar a empresa e aceitar este contrato em nome dela.</span>
            </label>
            {errors.powers && (
              <p id="contrato-powers-erro" className="text-base text-destructive">
                {errors.powers}
              </p>
            )}
          </div>
        </fieldset>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {form.useBookingEmail && emailHint ? (
          <BookingContact label="E-mail" hint={emailHint} note={EMAIL_NOTE} otherLabel="Usar outro e-mail" onOther={() => chooseBooking('email', false)} />
        ) : (
          <div className="space-y-1.5">
            <TextField
              name="email"
              label="E-mail"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={form.email}
              error={errors.email}
              hint={EMAIL_NOTE}
              onChange={(v) => set('email', v)}
            />
            {emailHint && (
              <Button type="button" variant="ghost" size="sm" onClick={() => chooseBooking('email', true)} className="text-base normal-case tracking-normal">
                Usar o e-mail da reserva ({emailHint})
              </Button>
            )}
          </div>
        )}
        {form.useBookingPhone && phoneHint ? (
          <BookingContact label="Telefone com DDD" hint={phoneHint} otherLabel="Usar outro telefone" onOther={() => chooseBooking('phone', false)} />
        ) : (
          <div className="space-y-1.5">
            <TextField
              name="phone"
              label="Telefone com DDD"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              error={errors.phone}
              onChange={(v) => set('phone', v)}
              onBlur={tidyPhone}
            />
            {phoneHint && (
              <Button type="button" variant="ghost" size="sm" onClick={() => chooseBooking('phone', true)} className="text-base normal-case tracking-normal">
                Usar o telefone da reserva ({phoneHint})
              </Button>
            )}
          </div>
        )}
      </div>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-base font-semibold text-foreground">{pj ? 'Endereço da empresa' : 'Seu endereço'}</legend>
        {/* A ordem na tela é a do Tab e a do foco no primeiro erro (FIELD_ORDER). */}
        <div className="sm:max-w-xs">
          <TextField
            name="zipCode"
            label="CEP"
            inputMode="numeric"
            autoComplete="postal-code"
            value={form.zipCode}
            error={errors.zipCode}
            hint="Com o CEP, a rua, o bairro e a cidade vêm sozinhos."
            onChange={changeZip}
          />
          {/* Sempre na página (só o texto muda): o leitor de tela anuncia a mudança. */}
          <p role="status" className="mt-1.5 text-base text-muted-foreground">
            {cepStatus === 'loading' ? 'Buscando o endereço pelo CEP...' : cepStatus === 'notFound' ? 'Não achamos o endereço deste CEP. Preencha à mão.' : ''}
          </p>
        </div>
        <TextField
          name="street"
          label="Rua"
          autoComplete="address-line1"
          value={form.street}
          error={errors.street}
          onChange={(v) => set('street', v)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="number"
            label="Número"
            value={form.number}
            error={errors.number}
            onChange={(v) => set('number', v)}
          />
          <TextField
            name="complement"
            label="Complemento"
            optional
            autoComplete="address-line2"
            value={form.complement}
            error={errors.complement}
            onChange={(v) => set('complement', v)}
          />
        </div>
        <TextField
          name="neighborhood"
          label="Bairro"
          value={form.neighborhood}
          error={errors.neighborhood}
          onChange={(v) => set('neighborhood', v)}
        />
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <TextField
            name="city"
            label="Cidade"
            autoComplete="address-level2"
            value={form.city}
            error={errors.city}
            onChange={(v) => set('city', v)}
          />
          <div className="space-y-1.5">
            <label htmlFor="contrato-state" className="block text-base font-medium text-foreground">
              Estado
            </label>
            <select
              id="contrato-state"
              value={form.state}
              onChange={(e) => set('state', e.target.value)}
              autoComplete="address-level1"
              aria-invalid={errors.state ? true : undefined}
              aria-describedby={errors.state ? 'contrato-state-erro' : undefined}
              className={inputClass(Boolean(errors.state))}
            >
              <option value="">UF</option>
              {BRAZIL_STATES.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
            {errors.state && (
              <p id="contrato-state-erro" className="text-base text-destructive">
                {errors.state}
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <ChoiceGroup
        name="purpose"
        legend="Você contrata para o seu próprio evento ou para revender/produzir o evento de outra pessoa?"
        value={form.purpose}
        options={[
          {
            value: 'OWN_EVENT',
            label: 'Para o meu próprio evento',
            description: 'Pessoa física, ou empresa que contrata para um evento dela.',
          },
          {
            value: 'RESALE',
            label: 'Para revender ou produzir o evento de outra pessoa',
            description: 'Produtora, agência, cerimonial, buffet ou casa de eventos.',
          },
        ]}
        error={errors.purpose}
        onChange={(value) => set('purpose', value)}
      />

      {alert}

      <Button type="submit" size="lg" fullWidth isLoading={submitting}>
        {submitting ? 'Preparando o contrato...' : 'Continuar'}
      </Button>
    </form>
  );
}
