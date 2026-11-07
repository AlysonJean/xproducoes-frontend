// P17 (aprovada em 02/11/2026): "Política de reserva e cancelamento", montada agora e publicada só depois que o
// dono e um advogado aprovarem o texto. Esta é a chave única da publicação: com RESERVATION_POLICY_PUBLISHED
// false, a página é um rascunho (aviso no topo, noindex, fora do sitemap e sem link no site); com true, o aviso
// sai, a página pode ser indexada, entra no sitemap e ganha o link no rodapé, ao lado das outras páginas legais.
// O texto das seções está em reservationPolicyContent.ts. Este arquivo não importa nada de propósito: o
// rodapé, as rotas (App.tsx) e o gerador do sitemap (scripts/generateSitemap.ts, que roda com tsx no build da
// Vercel, fora do Vite) o leem. A P15 parte 2 ("Li e aceito a política") usa a versão e o endereço daqui.

/** Versão do texto: muda a cada revisão, para o aceite da P15 guardar qual texto o cliente leu. */
export const RESERVATION_POLICY_VERSION = '2026-11';

/** Data da última revisão do texto (como LAST_UPDATED dos Termos). Atualize junto com a versão. */
export const RESERVATION_POLICY_UPDATED_AT = '07/11/2026';

/**
 * Só vira true quando o dono e o advogado aprovarem o texto e nenhuma seção estiver marcada "Texto proposto, a
 * confirmar" (um teste barra a publicação com seção pendente).
 */
export const RESERVATION_POLICY_PUBLISHED: boolean = false;

/** Endereço da página, no padrão das outras páginas legais (/termos, /privacidade): em português, sem acento. */
export const RESERVATION_POLICY_PATH = '/politica-de-reserva';

export const RESERVATION_POLICY_TITLE = 'Política de reserva e cancelamento';

/** O aviso do topo enquanto a página não está publicada. */
export const RESERVATION_POLICY_DRAFT_NOTICE = 'Rascunho em revisão: este texto ainda não vale como política da X Produções.';

/** A marca das seções que o dono ainda não respondeu (texto sugerido, para ele e o advogado decidirem). */
export const RESERVATION_POLICY_PENDING_LABEL = 'Texto proposto, a confirmar';
