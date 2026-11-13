import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/StandardComponents';
import { cn } from '@/utils/cn';
import { formatDocument, formatCpf, isValidCnpj, isValidCpf } from '@/utils/document';
import { BRAZIL_STATES, validatePartyForm, type PartyForm, type PartyFormErrors } from './contractHelpers';

// Aceite online (13/11/2026), passo 1: os dados de quem contrata. Texto de 16 px (também nos campos: abaixo disso o
// celular aproxima a tela ao tocar no campo). Cada erro fica ligado ao seu campo (aria-describedby) e o foco vai para
// o primeiro campo com erro, do site ou do servidor (fieldErrors).

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
}

export function ContractPartyStep({ form, onChange, onSubmit, submitting, alert }: ContractPartyStepProps) {
  const [errors, setErrors] = useState<PartyFormErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const pj = form.personType === 'PJ';

  const set = <K extends keyof PartyForm>(key: K, value: PartyForm[K]) => {
    onChange({ ...form, [key]: value });
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const focusFirst = (found: PartyFormErrors) => {
    const first = FIELD_ORDER.find((key) => found[key]);
    if (!first) return;
    const el = formRef.current?.querySelector<HTMLElement>(`#contrato-${first}, [data-field="${first}"]`);
    el?.focus();
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
    const fromServer = await onSubmit(form);
    if (fromServer && Object.keys(fromServer).length > 0) {
      setErrors(fromServer);
      focusFirst(fromServer);
    }
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
          onChange({ ...form, personType: value });
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
        <TextField
          name="email"
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={form.email}
          error={errors.email}
          hint="O código de confirmação e a cópia do contrato vão para este e-mail."
          onChange={(v) => set('email', v)}
        />
        <TextField
          name="phone"
          label="Telefone com DDD"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={form.phone}
          error={errors.phone}
          onChange={(v) => set('phone', v)}
        />
      </div>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-base font-semibold text-foreground">{pj ? 'Endereço da empresa' : 'Seu endereço'}</legend>
        {/* A ordem na tela é a do Tab e a do foco no primeiro erro (FIELD_ORDER). */}
        <div className="sm:max-w-[12rem]">
          <TextField
            name="zipCode"
            label="CEP"
            inputMode="numeric"
            autoComplete="postal-code"
            value={form.zipCode}
            error={errors.zipCode}
            onChange={(v) => set('zipCode', v)}
          />
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
