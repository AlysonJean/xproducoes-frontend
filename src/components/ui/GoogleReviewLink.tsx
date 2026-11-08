import { Star } from 'lucide-react';

// P20 (aprovada em 02/11/2026): convite para avaliar no Google, com o link do Perfil da Empresa que o servidor manda
// no GET /settings (GOOGLE_REVIEW_LINK). Sem link (perfil ainda não criado), não aparece nada.
export function GoogleReviewLink({ url, className }: { url?: string | null; className?: string }) {
  if (!url || !url.startsWith('https://')) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline ${className ?? ''}`}
    >
      <Star className="h-4 w-4" aria-hidden="true" />
      Avalie a X Produções no Google
    </a>
  );
}
