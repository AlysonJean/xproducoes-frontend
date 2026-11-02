/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FACEBOOK_APP_ID: string;
  readonly VITE_GOOGLE_ANALYTICS_ID: string;
  readonly MODE: string;
  // adicione mais variáveis de ambiente conforme necessário
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
    __TV_DEBUG?: boolean;
    __sponsorsLoaded?: number;
}

// Campo que renderer/+onRenderHtml.tsx acrescenta ao pageContext do Vike
// (https://vike.dev/pageContext#typescript): NotFoundPage apareceu no SSR, então api/ssr.js
// (produção) e server.ts (dev) respondem 404.
declare namespace Vike {
  interface PageContext {
    notFoundRendered?: boolean;
  }
}
