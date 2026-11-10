// Pedido do dono de 09/11/2026 (Instagram): as fotos e os vídeos publicados em @x_producoeseventos aparecem no site
// sozinhos, para ele publicar uma vez só. O servidor importa as publicações pela API oficial do Instagram e guarda
// cópias das imagens no Cloudinary; o site lê GET /instagram/posts. Aqui ficam as regras que o site aplica ao que
// chega: o endereço do player do Instagram, o resumo da legenda e a data.

/** Publicação como a rota pública GET /instagram/posts devolve (backend, item insta-be). */
export interface PublicInstagramPost {
  id: string;
  mediaType: string;
  caption: string | null;
  permalink: string;
  postedAt: string;
  imageUrl: string | null;
  isPinned: boolean;
  isVideo: boolean;
}

export interface PublicInstagramFeed {
  posts: PublicInstagramPost[];
  username: string | null;
}

const INSTAGRAM_HOSTS = new Set(['www.instagram.com', 'instagram.com']);
// /p/<código>/, /reel/<código>/ ou /tv/<código>/, com ou sem o nome da conta antes. Só o tipo e o código seguem
// para o endereço montado; o resto (conta, parâmetros como ?utm_source) fica de fora.
const PERMALINK_PATH = /^\/(?:[A-Za-z0-9._]{1,30}\/)?(p|reel|tv)\/([A-Za-z0-9_-]{1,64})\/?$/;

/**
 * Endereço de uma publicação do Instagram, só se ele for mesmo do Instagram (https, www.instagram.com ou
 * instagram.com, caminho /p/, /reel/ ou /tv/ com o código da publicação). Qualquer outra coisa volta null: o site não
 * cria link nem player a partir de um endereço de outro lugar, mesmo que ele chegue pelo nosso servidor.
 */
function parseInstagramPermalink(permalink: string | null | undefined): { kind: string; shortcode: string } | null {
  if (typeof permalink !== 'string' || permalink.length > 300) return null;
  let url: URL;
  try {
    url = new URL(permalink);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !INSTAGRAM_HOSTS.has(url.hostname)) return null;
  if (url.username || url.password || url.port) return null;
  const match = PERMALINK_PATH.exec(url.pathname);
  if (!match) return null;
  return { kind: match[1], shortcode: match[2] };
}

/** Link "Ver no Instagram": o endereço da publicação, já conferido; null se não for do Instagram. */
export function safeInstagramPermalink(permalink: string | null | undefined): string | null {
  const parsed = parseInstagramPermalink(permalink);
  return parsed ? `https://www.instagram.com/${parsed.kind}/${parsed.shortcode}/` : null;
}

/**
 * Player oficial do Instagram (https://www.instagram.com/{p|reel|tv}/{código}/embed/), montado só a partir de um
 * endereço conferido. O vídeo não é baixado: música licenciada só toca dentro do Instagram.
 */
export function buildInstagramEmbedUrl(permalink: string | null | undefined): string | null {
  const parsed = parseInstagramPermalink(permalink);
  return parsed ? `https://www.instagram.com/${parsed.kind}/${parsed.shortcode}/embed/` : null;
}

/** Começo da legenda numa linha só, com no máximo `max` caracteres (emojis contam como 1) e reticências. */
export function summarizeCaption(caption: string | null | undefined, max = 120): string {
  const text = (caption ?? '').replace(/\s+/g, ' ').trim();
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  const cut = chars.slice(0, max).join('');
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace >= max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}…`;
}

const POST_DATE = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Data da publicação no horário de Brasília, como "8 de novembro de 2026"; vazio se a data não for válida. */
export function formatInstagramDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : POST_DATE.format(date);
}

/**
 * Imagem do feed: só a cópia que o servidor guarda no Cloudinary (https, res.cloudinary.com ou outro *.cloudinary.com,
 * os mesmos da CSP img-src). Revisão de 09/11/2026: a Política de Cookies promete que ver as fotos e as capas não envia
 * nada ao Instagram; com esta conferência a promessa vale pelo próprio site, mesmo se chegar outro endereço.
 */
function isCloudinaryImage(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2000) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'res.cloudinary.com' || url.hostname.endsWith('.cloudinary.com'));
  } catch {
    return false;
  }
}

/**
 * Lê a resposta da rota pública. Fica só o que o site consegue mostrar: com imagem do Cloudinary e com endereço do
 * Instagram conferido. Resposta em outro formato vira lista vazia (a seção some, sem aviso de erro no site público).
 */
export function readPublicInstagramFeed(data: unknown): PublicInstagramFeed {
  const body = (data && typeof data === 'object' ? data : {}) as { posts?: unknown; username?: unknown };
  const posts = Array.isArray(body.posts) ? body.posts : [];
  return {
    posts: posts.filter(
      (post): post is PublicInstagramPost =>
        !!post &&
        typeof post === 'object' &&
        typeof (post as PublicInstagramPost).id === 'string' &&
        isCloudinaryImage((post as PublicInstagramPost).imageUrl) &&
        safeInstagramPermalink((post as PublicInstagramPost).permalink) !== null
    ),
    username: typeof body.username === 'string' ? body.username : null,
  };
}
