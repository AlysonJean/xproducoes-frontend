import { useCallback, useRef, useState } from 'react';

// Achado (relato do usuário): fechar um modal de criação/edição (clique fora, Esc, ou o
// próprio botão "Cancelar") sempre descartava o formulário na hora, sem confirmação — um
// clique acidental apagava um preenchimento inteiro. Este hook centraliza a lógica de "só
// feche de verdade se não houver alteração não salva, senão pergunte antes" para ser
// reaproveitado por todas as páginas de gestão do admin, em vez de duplicar em cada uma.
export function useUnsavedChangesGuard(isDirty: boolean) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const pendingCloseRef = useRef<(() => void) | null>(null);

  const guardClose = useCallback(
    (actuallyClose: () => void) => {
      if (isDirty) {
        pendingCloseRef.current = actuallyClose;
        setIsConfirmOpen(true);
      } else {
        actuallyClose();
      }
    },
    [isDirty]
  );

  const confirmDiscard = useCallback(() => {
    setIsConfirmOpen(false);
    pendingCloseRef.current?.();
    pendingCloseRef.current = null;
  }, []);

  const cancelDiscard = useCallback(() => {
    setIsConfirmOpen(false);
    pendingCloseRef.current = null;
  }, []);

  return { guardClose, isConfirmOpen, confirmDiscard, cancelDiscard };
}
