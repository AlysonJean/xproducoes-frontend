/**
 * 🎨 Standard Components Bridge
 * Este arquivo atua como uma ponte (barrel file) para os componentes UI individualizados.
 * Isso permite manter a compatibilidade com importações existentes enquanto melhora o tree-shaking e a manutenção.
 *
 * react-refresh/only-export-components é suprimido porque um barrel file de `export *`/
 * re-exports não pode ser verificado estaticamente como "só componentes" — só afeta a
 * granularidade do Fast Refresh em dev, sem efeito em produção/correção.
 */
/* eslint-disable react-refresh/only-export-components */

// Tipos
export * from './StandardTypes';

// Componentes Core
export { Button, type ButtonProps } from './Button';
export { Input, type InputProps } from './Input';
export { Select, type SelectProps, type SelectOption } from './Select';
export { Textarea, type TextareaProps } from './Textarea';
export { Checkbox, type CheckboxProps } from './Checkbox';

// Layout e Estrutura
export { Grid } from './Grid';
export { Card, GlassCard } from './Cards';
export { Badge } from './Badge';
export { Skeleton, CardSkeleton, ListSkeleton } from './Skeleton';

// Modais
export { Modal } from './Modal';
export { ConfirmModal } from '../modals/ConfirmModal';
export { Alert } from './Alert';

// Formulários
export { Form, FormSection, FormActions } from './Form';

// Busca e Filtros
export { SearchAndFilters, FilterSelect } from './SearchAndFilters';
