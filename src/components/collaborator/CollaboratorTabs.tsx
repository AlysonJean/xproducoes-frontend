import React, { useRef } from 'react';
import { cn } from '../../utils/cn';

export interface CollaboratorTabItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Contador opcional ao lado do rótulo (ex.: tarefas pendentes). */
  count?: number;
}

interface CollaboratorTabsProps<T extends string> {
  tabs: ReadonlyArray<CollaboratorTabItem<T>>;
  active: T;
  onChange: (id: T) => void;
  /** Nome acessível da lista de abas. */
  ariaLabel: string;
  /** Prefixo único dos ids de aba/painel (liga a aba ao <CollaboratorTabPanel>). */
  idBase: string;
  className?: string;
}

/**
 * Abas do portal do colaborador.
 * Achado (auditoria do design system): Perfil, Configurações, Notificações e o Roteiro do evento
 * tinham cada um o seu conjunto de abas à mão — sem `role="tab"`/`aria-selected`, cores fixas
 * (`border-blue-500`, `bg-white`) e, no celular, estourando a largura da tela. Aqui: padrão WAI-ARIA
 * (setas/Home/End), tokens do tema e rolagem horizontal quando não cabe.
 */
export function CollaboratorTabs<T extends string>({
  tabs,
  active,
  onChange,
  ariaLabel,
  idBase,
  className,
}: CollaboratorTabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusTab = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    refs.current[next]?.focus();
    onChange(tabs[next].id);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); focusTab(index + 1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); focusTab(index - 1); }
    else if (event.key === 'Home') { event.preventDefault(); focusTab(0); }
    else if (event.key === 'End') { event.preventDefault(); focusTab(tabs.length - 1); }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex max-w-full gap-1 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className
      )}
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            ref={(el) => { refs.current[index] = el; }}
            type="button"
            role="tab"
            id={`${idBase}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${idBase}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              '-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
              selected
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {tab.label}
            {typeof tab.count === 'number' && tab.count > 0 && (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface CollaboratorTabPanelProps {
  idBase: string;
  id: string;
  children: React.ReactNode;
  className?: string;
}

export const CollaboratorTabPanel: React.FC<CollaboratorTabPanelProps> = ({ idBase, id, children, className }) => (
  <div
    role="tabpanel"
    id={`${idBase}-panel-${id}`}
    aria-labelledby={`${idBase}-tab-${id}`}
    tabIndex={0}
    className={cn('focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg', className)}
  >
    {children}
  </div>
);

export default CollaboratorTabs;
