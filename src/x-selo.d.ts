// Decisão de Alyson (20/11/2026), selo de assinatura: tipo da tag <x-selo> usada no rodapé (src/components/Footer.tsx).
// A tag é um web component definido pelo script do selo, carregado no <head> (renderer/+onRenderHtml.tsx).
import 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'x-selo': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        site?: string;
        tema?: 'auto' | 'claro' | 'escuro';
        variante?: 'completo' | 'compacto' | 'icone';
      };
    }
  }
}
