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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gtag: (...args: any[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataLayer: any[];
}
