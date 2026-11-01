import React, { ReactNode, useEffect, useRef, useId, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  /** Classes do corpo (padrão `p-6`). Ex.: `p-0` para um modal com cabeçalho próprio de ponta a ponta. */
  bodyClassName?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  title?: string;
  /** Nome acessível para leitores de tela quando não há `title` visível. */
  ariaLabel?: string;
}

const modalSizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  full: 'max-w-[95vw] max-h-[95vh]',
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

// Achado (auditoria do design system): cada Modal aberto registrava o próprio Escape no document e
// zerava o `overflow` do body ao fechar. Com um modal dentro de outro (ex.: EventManagement →
// ConfirmModal de exclusão), um Escape fechava os DOIS, e fechar o de dentro destravava a rolagem
// da página com o de fora ainda aberto. Agora há uma pilha: só o modal do topo responde a Escape/Tab,
// e a rolagem só volta quando o último modal fecha (restaurando o valor que o body tinha antes).
const openModalStack: string[] = [];
let bodyOverflowBeforeLock: string | null = null;

function pushModal(id: string) {
  if (openModalStack.length === 0) {
    bodyOverflowBeforeLock = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  openModalStack.push(id);
}

function removeModal(id: string) {
  const index = openModalStack.lastIndexOf(id);
  if (index !== -1) openModalStack.splice(index, 1);
  if (openModalStack.length === 0 && bodyOverflowBeforeLock !== null) {
    document.body.style.overflow = bodyOverflowBeforeLock;
    bodyOverflowBeforeLock = null;
  }
}

const isTopModal = (id: string) => openModalStack[openModalStack.length - 1] === id;

// Portal só no cliente: no SSR (e durante a hidratação) o modal é renderizado no lugar, igual ao HTML
// do servidor; depois passa para o <body>. useSyncExternalStore é o jeito seguro de saber isso sem
// setState em efeito e sem divergência de hidratação.
const noopSubscribe = () => () => {};
const useIsClient = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  size = 'md',
  className,
  bodyClassName,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  title,
  ariaLabel,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const stackId = useId();
  const isClient = useIsClient();

  // onClose costuma ser uma arrow nova a cada render: guardado em ref para o listener de teclado não
  // ser re-registrado (re-registrar tirava e recolocava o modal na pilha, invertendo a ordem).
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);
  useEffect(() => {
    onCloseRef.current = onClose;
    closeOnEscapeRef.current = closeOnEscape;
  });

  // Pilha + Escape + trap de foco (Tab/Shift+Tab não devem escapar do modal para a página por trás
  // do overlay). Só depende de isOpen: o lugar na pilha é o da abertura.
  useEffect(() => {
    if (!isOpen) return;

    pushModal(stackId);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isTopModal(stackId)) return;

      if (e.key === 'Escape') {
        if (closeOnEscapeRef.current) onCloseRef.current();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      removeModal(stackId);
    };
  }, [isOpen, stackId]);

  // Foco: ao abrir, guarda o elemento que tinha foco (para restaurar ao fechar) e move o
  // foco para dentro do modal — sem isso, o foco do teclado/leitor de tela ficava "preso"
  // visualmente atrás do overlay, num elemento que nem está mais visível.
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedElement.current = document.activeElement as HTMLElement | null;

    const [firstFocusable] = getFocusableElements(dialogRef.current);
    (firstFocusable ?? dialogRef.current)?.focus();

    return () => {
      previouslyFocusedElement.current?.focus?.();
    };
  }, [isOpen, isClient]);

  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel || 'Janela modal' : undefined}
        tabIndex={-1}
        // cn (tailwind-merge): o className de quem chama vence o padrão (max-w-*, overflow, p-*).
        className={cn(
          'relative bg-card/60 backdrop-blur-xl text-card-foreground rounded-2xl shadow-2xl border border-border',
          'max-h-[92vh] overflow-y-auto overflow-x-hidden animate-in fade-in zoom-in-95 duration-300',
          modalSizes[size],
          'w-full mx-4',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-border">
            {title && (
              <h2 id={titleId} className="text-lg font-semibold text-foreground">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        <div className={cn('p-6', bodyClassName)}>
          {children}
        </div>
      </div>
    </div>
  );

  // Portal para o <body>: o modal deixa de herdar `transform`/`overflow` de ancestrais (um card com
  // hover:scale quebrava o `fixed`) e o modal aninhado fica depois do de fora no DOM — por cima.
  return isClient ? createPortal(content, document.body) : content;
};
