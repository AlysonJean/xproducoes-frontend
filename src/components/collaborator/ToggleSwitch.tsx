import React, { useId } from 'react';
import { cn } from '../../utils/cn';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Rótulo visível — também é o nome acessível do interruptor. */
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * Interruptor do portal do colaborador.
 * Achado (auditoria do design system): 14 interruptores montados à mão em Notificações e
 * Configurações com `bg-gray-200 after:bg-white after:border-gray-300` — trilho claro fixo no tema
 * escuro e alvo de toque só do tamanho do trilho (24px). Aqui: tokens (`bg-input`,
 * `peer-checked:bg-primary`, `after:bg-background`), `role="switch"` e a linha inteira clicável
 * (mín. 44px de altura).
 */
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  icon,
  disabled = false,
  className,
}) => {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <label
      htmlFor={id}
      className={cn(
        'flex min-h-11 items-center justify-between gap-4 py-1',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        className
      )}
    >
      <span className="flex min-w-0 items-start gap-3">
        {icon && <span className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true">{icon}</span>}
        <span className="min-w-0">
          <span className="block text-sm font-medium text-foreground">{label}</span>
          {description && (
            <span id={descriptionId} className="block text-sm text-muted-foreground">
              {description}
            </span>
          )}
        </span>
      </span>
      <span className="relative inline-flex shrink-0 items-center">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-describedby={descriptionId}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            'relative h-6 w-11 rounded-full bg-input transition-colors',
            'peer-checked:bg-primary',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
            "after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-muted-foreground/40 after:bg-background after:shadow-sm after:transition-transform after:content-['']",
            'peer-checked:after:translate-x-5 peer-checked:after:border-transparent'
          )}
        />
      </span>
    </label>
  );
};

export default ToggleSwitch;
