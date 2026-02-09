/**
 * 🎨 Standard Components System - Sistema Unificado de Componentes
 * Baseado nas melhores práticas: shadcn/ui, Radix UI, Mantine e Ant Design
 * Centraliza todos os componentes de UI do projeto
 */

import React, { forwardRef, ReactNode } from 'react';
import { clsx } from 'clsx';
import { Loader2, Eye, EyeOff, AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

// ========================================
// TYPES - Sistema de tipos unificado
// ========================================

export type StandardVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'warning';
export type StandardSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type StandardStatus = 'default' | 'error' | 'success' | 'warning' | 'info';

// ========================================
// BUTTON COMPONENT - Componente base padronizado
// ========================================

interface StandardButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: StandardVariant;
  size?: StandardSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
}

const buttonVariants: Record<StandardVariant, string> = {
  primary: 'bg-gradient-to-br from-primary via-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white shadow-[0_4px_14px_0_rgb(var(--primary-rgb)/0.39)] hover:shadow-[0_6px_20px_rgba(var(--primary-rgb)/0.23)] active:scale-95 transition-all duration-300',
  secondary: 'bg-secondary hover:bg-secondary/90 text-secondary-foreground focus:ring-secondary active:scale-95 transition-all duration-300',
  outline: 'border-2 border-primary text-primary hover:bg-primary/5 hover:border-primary/80 focus:ring-primary active:scale-95 transition-all duration-300',
  ghost: 'text-primary hover:bg-primary/10 focus:ring-primary active:scale-95 transition-all duration-300',
  destructive: 'bg-gradient-to-br from-destructive to-destructive/80 hover:from-destructive hover:to-destructive text-destructive-foreground focus:ring-destructive transition-all duration-300',
  success: 'bg-gradient-to-br from-success to-success/80 hover:from-success hover:to-success text-success-foreground focus:ring-success shadow-md transition-all duration-300',
  warning: 'bg-gradient-to-br from-warning to-warning/80 hover:from-warning hover:to-warning text-warning-foreground focus:ring-warning shadow-md transition-all duration-300',
};

const buttonSizes: Record<StandardSize, string> = {
  xs: 'h-7 px-2 text-xs',
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-4 text-base',
  lg: 'h-10 px-6 text-lg',
  xl: 'h-12 px-8 text-xl',
};

export const Button = forwardRef<HTMLButtonElement, StandardButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, fullWidth, className, children, disabled, ...props }, ref) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
          buttonVariants[variant],
          buttonSizes[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!isLoading && leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ========================================
// CHECKBOX COMPONENT
// ========================================

interface StandardCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, StandardCheckboxProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const generatedId = React.useId();
    const checkboxId = id || generatedId;

    return (
      <div className="flex items-start space-x-2">
        <input
          type="checkbox"
          ref={ref}
          id={checkboxId}
          className={clsx(
            "h-4 w-4 rounded border-border text-primary ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        <div className="grid gap-1.5 leading-none">
          {label && (
            <label
              htmlFor={checkboxId}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {label}
            </label>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';

// ========================================
// INPUT COMPONENT - Sistema de input unificado
// ========================================

interface StandardInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  description?: string;
  helperText?: string;
  error?: string;
  success?: string;
  size?: StandardSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isLoading?: boolean;
  showPasswordToggle?: boolean;
}

const inputSizes: Record<StandardSize, string> = {
  xs: 'h-8 px-2 text-xs',
  sm: 'h-10 px-3 text-sm',
  md: 'h-12 px-4 text-sm font-medium',
  lg: 'h-14 px-5 text-base font-medium',
  xl: 'h-16 px-6 text-lg font-medium',
};

export const Input = forwardRef<HTMLInputElement, StandardInputProps>(
  ({ 
    label, 
    description, 
    helperText,
    error, 
    success, 
    size = 'md', 
    leftIcon, 
    rightIcon, 
    isLoading, 
    showPasswordToggle,
    className, 
    type = 'text',
    id,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const hasError = !!error;
    const hasSuccess = !!success;
    
    const inputType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={clsx(
              'w-full rounded-lg border-2 bg-card text-foreground transition-all duration-200',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'hover:border-primary/50',
              inputSizes[size],
              leftIcon && 'pl-10',
              (rightIcon || showPasswordToggle || isLoading) && 'pr-10',
              hasError && 'border-destructive focus:ring-destructive focus:border-destructive',
              hasSuccess && 'border-success focus:ring-success focus:border-success',
              !hasError && !hasSuccess && 'border-border',
              className
            )}
            aria-describedby={(() => {
              const v = [
                description ? `${inputId}-description` : null,
                helperText ? `${inputId}-helper` : null,
                error ? `${inputId}-error` : null,
                success ? `${inputId}-success` : null,
              ].filter(Boolean).join(' ');
              return v || undefined;
            })()}
            {...(hasError ? { 'aria-invalid': 'true' as const } : {})}
            {...props}
          />
          
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {showPasswordToggle && !isLoading && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}
            {rightIcon && !isLoading && !showPasswordToggle && rightIcon}
          </div>
        </div>
        
        {description && (
          <p id={`${inputId}-description`} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}

        {helperText && !error && !success && (
          <p id={`${inputId}-helper`} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
        
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
        
        {success && (
          <p id={`${inputId}-success`} className="text-sm text-success flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {success}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ========================================
// TEXTAREA COMPONENT
// ========================================

interface StandardTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = forwardRef<HTMLTextAreaElement, StandardTextareaProps>(
  ({ label, description, error, success, resize = 'vertical', className, id, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;
    const hasError = !!error;
    const hasSuccess = !!success;

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        
  <textarea
          ref={ref}
          id={textareaId}
          className={clsx(
            'w-full min-h-[80px] rounded-lg border-2 bg-card px-3 py-2 text-foreground transition-all duration-200',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'hover:border-primary/50',
            hasError && 'border-destructive focus:ring-destructive focus:border-destructive',
            hasSuccess && 'border-success focus:ring-success focus:border-success',
            !hasError && !hasSuccess && 'border-border',
            resize === 'none' && 'resize-none',
            resize === 'vertical' && 'resize-y',
            resize === 'horizontal' && 'resize-x',
            resize === 'both' && 'resize',
            className
          )}
          aria-describedby={(() => {
            const v = [
              description ? `${textareaId}-description` : null,
              error ? `${textareaId}-error` : null,
              success ? `${textareaId}-success` : null,
            ].filter(Boolean).join(' ');
            return v || undefined;
          })()}
          {...(hasError ? { 'aria-invalid': 'true' as const } : {})}
          {...props}
        />
        
        {description && (
          <p id={`${textareaId}-description`} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
        
        {error && (
          <p id={`${textareaId}-error`} className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
        
        {success && (
          <p id={`${textareaId}-success`} className="text-sm text-success flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {success}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// ========================================
// SELECT COMPONENT
// ========================================

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface StandardSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  size?: StandardSize;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, StandardSelectProps>(
  ({ label, description, error, success, size = 'md', options, placeholder, className, id, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;
    const hasError = !!error;
    const hasSuccess = !!success;

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        
  <select
          ref={ref}
          id={selectId}
          className={clsx(
            'w-full rounded-lg border-2 bg-card text-foreground transition-all duration-200 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'hover:border-primary/50',
            inputSizes[size],
            hasError && 'border-destructive focus:ring-destructive focus:border-destructive',
            hasSuccess && 'border-success focus:ring-success focus:border-success',
            !hasError && !hasSuccess && 'border-border',
            className
          )}
          aria-describedby={(() => {
            const v = [
              description ? `${selectId}-description` : null,
              error ? `${selectId}-error` : null,
              success ? `${selectId}-success` : null,
            ].filter(Boolean).join(' ');
            return v || undefined;
          })()}
          {...(hasError ? { 'aria-invalid': 'true' as const } : {})}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map(option => (
            <option key={option.value} value={option.value} disabled={option.disabled} className="bg-card text-foreground">
              {option.label}
            </option>
          ))}
        </select>
        
        {description && (
          <p id={`${selectId}-description`} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
        
        {error && (
          <p id={`${selectId}-error`} className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
        
        {success && (
          <p id={`${selectId}-success`} className="text-sm text-success flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {success}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// ========================================
// MODAL COMPONENT
// ========================================

interface StandardModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  title?: string;
}

const modalSizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-[95vw] max-h-[95vh]',
};

export const Modal: React.FC<StandardModalProps> = ({
  isOpen,
  onClose,
  children,
  size = 'md',
  className,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  title,
}) => {
  React.useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, closeOnEscape]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      
      {/* Modal */}
      <div
        className={clsx(
          'relative bg-card/60 backdrop-blur-xl text-card-foreground rounded-2xl shadow-2xl border border-white/20',
          'max-h-[92vh] overflow-y-auto overflow-x-hidden animate-in fade-in zoom-in duration-300',
          !className?.includes('max-w-') && modalSizes[size],
          'w-full mx-4',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-border">
            {title && (
              <h2 className="text-lg font-semibold text-foreground">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Fechar</span>
              </button>
            )}
          </div>
        )}
        
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// ========================================
// ALERT COMPONENT
// ========================================

interface StandardAlertProps {
  variant?: StandardStatus;
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  onClose?: () => void;
}

const alertVariants: Record<StandardStatus, { container: string; icon: ReactNode }> = {
  default: { 
    container: 'border-border bg-background text-foreground', 
    icon: <Info className="h-4 w-4" /> 
  },
  info: { 
    container: 'border-info/50 bg-info/10 text-info-foreground', 
    icon: <Info className="h-4 w-4" /> 
  },
  success: { 
    container: 'border-success/50 bg-success/10 text-success-foreground', 
    icon: <CheckCircle2 className="h-4 w-4" /> 
  },
  warning: { 
    container: 'border-warning/50 bg-warning/10 text-warning-foreground', 
    icon: <AlertTriangle className="h-4 w-4" /> 
  },
  error: { 
    container: 'border-destructive/50 bg-destructive/10 text-destructive-foreground', 
    icon: <AlertCircle className="h-4 w-4" /> 
  },
};

export const Alert: React.FC<StandardAlertProps> = ({ 
  variant = 'default', 
  title, 
  description, 
  children, 
  className, 
  onClose 
}) => {
  const alertConfig = alertVariants[variant];

  return (
    <div
      className={clsx(
        'relative w-full rounded-lg border p-4',
        alertConfig.container,
        className
      )}
      role="alert"
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {alertConfig.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          {title && (
            <h5 className="mb-1 font-medium leading-none tracking-tight">
              {title}
            </h5>
          )}
          
          {description && (
            <div className="text-sm opacity-90">
              {description}
            </div>
          )}
          
          {children}
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Fechar alerta"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// ========================================
// FORM COMPONENTS
// ========================================

interface StandardFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
}

export const Form: React.FC<StandardFormProps> = ({ children, className, ...props }) => {
  return (
    <form className={clsx('space-y-6', className)} {...props}>
      {children}
    </form>
  );
};

interface StandardFormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export const FormSection: React.FC<StandardFormSectionProps> = ({ 
  title, 
  description, 
  children, 
  className 
}) => {
  return (
    <div className={clsx('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-semibold text-foreground">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
      
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

interface StandardFormActionsProps {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export const FormActions: React.FC<StandardFormActionsProps> = ({ 
  children, 
  className, 
  align = 'right' 
}) => {
  return (
    <div 
      className={clsx(
        'flex gap-3 pt-4 border-t border-border',
        align === 'left' && 'justify-start',
        align === 'center' && 'justify-center',
        align === 'right' && 'justify-end',
        className
      )}
    >
      {children}
    </div>
  );
};

// ========================================
// SEARCH COMPONENT - Atualizado com sistema padronizado
// ========================================

interface SearchAndFiltersProps {
  searchQuery?: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  resultsCount?: number;
  itemLabel?: string;
  onClearFilters?: () => void;
  showClearFilters?: boolean;
  className?: string;
}

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filters,
  resultsCount,
  itemLabel = 'item',
  onClearFilters,
  showClearFilters = false,
  className = ''
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Bar */}
      <div className="relative max-w-2xl mx-auto group">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-14 pr-4 py-5 bg-card/40 backdrop-blur-md border border-white/20 rounded-2xl text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 shadow-xl group-hover:shadow-2xl group-hover:-translate-y-1"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-5">
            <svg className="h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground hover:text-foreground transition-colors duration-200"
              title="Limpar busca"
              aria-label="Limpar busca"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Additional Filters */}
      {filters && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex flex-wrap justify-center gap-4">
            {filters}
          </div>
        </div>
      )}

      {/* Results Summary */}
      {resultsCount !== undefined && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 text-center sm:text-left">
          <p className="text-muted-foreground text-lg font-medium">
            <span className="text-foreground font-semibold">{resultsCount}</span> {itemLabel}{resultsCount !== 1 ? 's' : ''} encontrado{resultsCount !== 1 ? 's' : ''}
          </p>
          
          {showClearFilters && onClearFilters && (
            <button 
              onClick={onClearFilters}
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors duration-200 bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-lg"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Standard Filter Select Component
interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
  label,
  value,
  onChange,
  options,
  className = ''
}) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    <label className="text-sm font-medium text-muted-foreground">{label}</label>
    <select 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-4 py-3 bg-card border-2 border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 cursor-pointer hover:border-primary/50"
      aria-label={label}
    >
      {options.map(option => (
        <option key={option.value} value={option.value} className="bg-card text-foreground">
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

// Standard Grid Component
interface GridProps {
  children: React.ReactNode;
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
    '3xl'?: number;
    '4xl'?: number;
    '5xl'?: number;
  };
  gap?: number;
  className?: string;
}

export const Grid: React.FC<GridProps> = ({
  children,
  columns = { sm: 1, md: 2, lg: 3, xl: 4, '2xl': 4, '3xl': 5, '4xl': 6, '5xl': 6 },
  gap = 6,
  className = ''
}) => {
  const gridClasses = [
    `grid`,
    `grid-cols-${columns.sm || 1}`,
    columns.md && `md:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`,
    columns.xl && `xl:grid-cols-${columns.xl}`,
    columns['2xl'] && `2xl:grid-cols-${columns['2xl']}`,
    columns['3xl'] && `3xl:grid-cols-${columns['3xl']}`,
    columns['4xl'] && `4xl:grid-cols-${columns['4xl']}`,
    columns['5xl'] && `5xl:grid-cols-${columns['5xl']}`,
    `gap-${gap}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
};

// ========================================
// CARD COMPONENT
// ========================================

interface StandardCardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export const Card: React.FC<StandardCardProps> = ({ 
  children, 
  className = '', 
  padding = false 
}) => {
  return (
    <div className={clsx(
      'rounded-lg border border-border bg-card text-card-foreground shadow-sm',
      padding && 'p-6',
      className
    )}>
      {children}
    </div>
  );
};

// ========================================
// BADGE COMPONENT
// ========================================

interface StandardBadgeProps {
  children: ReactNode;
  variant?: StandardVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const badgeVariants: Record<StandardVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/80',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
  success: 'bg-success text-success-foreground hover:bg-success/80',
  warning: 'bg-warning text-warning-foreground hover:bg-warning/80',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
};

const badgeSizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-sm',
};

export const Badge: React.FC<StandardBadgeProps> = ({ 
  children, 
  variant = 'secondary',
  size = 'md',
  className 
}) => {
  return (
    <span className={clsx(
      'inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      badgeVariants[variant],
      badgeSizes[size],
      className
    )}>
      {children}
    </span>
  );
};

// ========================================
// GLASS CARD COMPONENT
// ========================================

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className, hoverEffect = true }) => {
  return (
    <div className={clsx(
      'relative bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl overflow-hidden shadow-2xl',
      'transition-all duration-500',
      hoverEffect && 'hover:bg-white/15 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)]',
      className
    )}>
      {/* Subtle Glow inside */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 p-6">
        {children}
      </div>
    </div>
  );
};


// ========================================
// SKELETON COMPONENT
// ========================================

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div 
      className={clsx(
        "animate-pulse rounded-md bg-muted/40",
        className
      )} 
    />
  );
};

export const CardSkeleton: React.FC = () => (
  <div className="bg-card rounded-2xl overflow-hidden border border-border/50">
    <Skeleton className="aspect-[16/10] w-full rounded-none" />
    <div className="p-5 space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <div className="flex justify-between items-center pt-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  </div>
);

export const ListSkeleton: React.FC<{ cards?: number }> = ({ cards = 8 }) => (
  <Grid columns={{ sm: 1, md: 2, lg: 3, xl: 4 }} gap={8}>
    {Array.from({ length: cards }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </Grid>
);

