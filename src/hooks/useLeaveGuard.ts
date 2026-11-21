import { useEffect, useRef } from 'react';

// Teste de ponta a ponta (21/11/2026): sair do "Montar orçamento" sem salvar não avisava nada, e as linhas montadas
// sumiam. Com algo não salvo (active), este hook segura a saída da página:
// - recarregar ou fechar a aba: o aviso do próprio navegador;
// - clique num link do site (menu, caminho no topo): o link não abre e onLeave recebe o endereço, para a página
//   perguntar (useUnsavedChangesGuard) e seguir com navigate(to) se a pessoa confirmar.
// O "voltar" do navegador não passa por aqui: o site usa o BrowserRouter, e o useBlocker do React Router só existe com
// o roteador de dados. A navegação feita pelo código (navigate depois de salvar) também não passa.
export function useLeaveGuard(active: boolean, onLeave: (to: string) => void) {
  const onLeaveRef = useRef(onLeave);
  useEffect(() => {
    onLeaveRef.current = onLeave;
  });

  useEffect(() => {
    if (!active) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Navegadores antigos (Chrome/Edge antes da 119) só mostram o aviso com returnValue preenchido.
      event.returnValue = true;
    };
    // Na captura, no document: roda antes do onClick do <Link> (o React escuta na raiz do app, dentro do document).
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if ((anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Âncora na mesma página (#seção) não sai dela.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      onLeaveRef.current(`${url.pathname}${url.search}${url.hash}`);
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', click, true);
    };
  }, [active]);
}
