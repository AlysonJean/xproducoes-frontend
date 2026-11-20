import { useEffect, type RefObject } from 'react';

// Faixas fixas no pé da tela (aviso de cookies e "Instale o app"), 20/11/2026: as duas ficam por cima da página, e
// no fim dela cobriam o rodapé, com o CNPJ, os links das políticas e o selo "Desenvolvido por X Soluções Digitais".
// O aviso de cookies aparece para todo visitante novo, então o rodapé ficava escondido na primeira visita de todo
// mundo até a pessoa responder; o "Instale o app" fica até a pessoa fechar.
//
// Enquanto uma faixa aparece, o body ganha embaixo um espaço da altura dela, e o rodapé consegue subir acima da faixa.
// O espaço vai no body, e não num bloco ao lado da faixa, porque o "Instale o app" é montado no começo do <main>
// (App.tsx), não depois do rodapé. A altura é medida e acompanhada (ResizeObserver): a faixa muda de altura com a
// largura da tela (no celular os botões descem para a linha de baixo). As duas faixas ficam no mesmo lugar; se um dia
// aparecerem juntas, vale a maior altura.

const alturas = new Map<object, number>();

function aplicarEspaco(): void {
  const maior = Math.max(0, ...alturas.values());
  document.body.style.paddingBottom = maior > 0 ? `${maior}px` : '';
}

export function useEspacoFaixaFixa(ref: RefObject<HTMLElement | null>, ativa: boolean): void {
  useEffect(() => {
    const faixa = ref.current;
    if (!ativa || !faixa) return;

    const chave = {};
    const medir = () => {
      alturas.set(chave, Math.ceil(faixa.getBoundingClientRect().height));
      aplicarEspaco();
    };
    medir();
    // Navegadores sem ResizeObserver (e o jsdom dos testes) ficam com a altura medida ao aparecer.
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir);
    observador?.observe(faixa);

    return () => {
      observador?.disconnect();
      alturas.delete(chave);
      aplicarEspaco();
    };
  }, [ref, ativa]);
}
