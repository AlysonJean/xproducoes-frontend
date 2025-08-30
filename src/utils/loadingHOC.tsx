/**
 * 🔄 Higher Order Component (HOC) para adicionar loading automático a qualquer componente.
 * Uso:
 *   export default withLoading(MeuComponente);
 * Aceita prop isLoading e exibe o componente <Loading /> enquanto isLoading for true.
 * Permite passar props extras para o componente de loading via loadingProps.
 */

import React, { ForwardedRef } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';

// HOC para adicionar loading automático
export function withLoading<P extends Record<string, unknown>>(
  WrappedComponent: React.ComponentType<P>,
  loadingProps?: Partial<React.ComponentProps<typeof LoadingSpinner>>
): React.ForwardRefExoticComponent<
  React.PropsWithoutRef<P & { isLoading?: boolean }> & React.RefAttributes<HTMLElement>
> {
  return React.forwardRef<HTMLElement, P & { isLoading?: boolean }>(
    (props, ref: ForwardedRef<HTMLElement>) => {
      const { isLoading, ...restProps } = props;
      if (isLoading) {
        return <LoadingSpinner {...loadingProps} />;
      }
      return <WrappedComponent {...(restProps as unknown as P)} ref={ref} />;
    }
  );
}
