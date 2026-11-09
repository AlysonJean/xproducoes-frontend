import { apiFetch } from '../services/api';

// D21 (aprovada em 02/11/2026): comprovantes e anexos da reserva ficam privados. O arquivo sobe por
// POST /bookings/:id/attachments/upload (campo 'file'); a reserva lista só nome, tipo e data; para abrir, a tela pede
// à API um link que vale 5 minutos (GET /bookings/:id/attachments/:attachmentId/file). Vale para o comprovante do
// cliente, os "Anexos e comprovantes" da ficha e o comprovante do formulário da reserva no painel.

export const ATTACHMENT_ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf';
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_RULE_TEXT = 'JPG, PNG, WebP ou PDF até 10 MB';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const ACCEPTED_EXTENSION = /\.(jpe?g|png|webp|pdf)$/i;

export interface BookingAttachmentInfo {
  id: string;
  filename?: string | null;
  mimeType?: string | null;
  createdAt?: string;
}

/** Confere tipo e tamanho antes de enviar (o servidor confere de novo, pelo conteúdo). null = pode enviar. */
export function attachmentFileProblem(file: File): string | null {
  if (file.size > ATTACHMENT_MAX_BYTES) return `Arquivo muito grande. Envie ${ATTACHMENT_RULE_TEXT}.`;
  if (!ACCEPTED_TYPES.has(file.type) && !ACCEPTED_EXTENSION.test(file.name)) {
    return `Tipo de arquivo não aceito. Envie ${ATTACHMENT_RULE_TEXT}.`;
  }
  return null;
}

export function uploadBookingAttachment(bookingId: string, file: File): Promise<BookingAttachmentInfo> {
  const body = new FormData();
  body.append('file', file);
  return apiFetch<BookingAttachmentInfo>(`/bookings/${encodeURIComponent(bookingId)}/attachments/upload`, {
    method: 'POST',
    body,
  });
}

/** Mensagem para a tela quando o envio falha (o apiFetch põe o status HTTP no erro). */
export function attachmentUploadErrorMessage(error: unknown): string {
  const status = (error as { status?: number } | null)?.status;
  const message = error instanceof Error ? error.message : '';
  // O teto de envios por conta (3 por hora) responde "Upload limit exceeded"; o limite por IP, outra mensagem.
  if (/limit exceeded/i.test(message)) return 'Limite de envios atingido. Tente de novo em 1 hora.';
  if (status === 429) return 'Muitos envios em pouco tempo. Aguarde alguns minutos e tente de novo.';
  if (status === 413) return `Arquivo muito grande. Envie ${ATTACHMENT_RULE_TEXT}.`;
  if (status === 400 && message) return message;
  return 'Não foi possível enviar o arquivo. Tente novamente.';
}

export const bookingAttachmentFilePath = (bookingId: string, attachmentId: string) =>
  `/bookings/${encodeURIComponent(bookingId)}/attachments/${encodeURIComponent(attachmentId)}/file`;

/**
 * Abre (ou baixa) o arquivo. A janela nasce no clique, antes de qualquer espera: aberta depois de um await, o
 * navegador a bloquearia. Ela recebe o link de 5 minutos que a API devolve (o apiFetch renova a sessão vencida).
 * Sem janela (bloqueio de pop-up), a própria aba vai para o link.
 */
export async function openBookingAttachment(path: string, options: { download?: boolean } = {}): Promise<void> {
  const win = window.open('about:blank', '_blank');
  try {
    const { url } = await apiFetch<{ url: string; expiresAt: string | null }>(options.download ? `${path}?download=1` : path);
    if (win) {
      win.opener = null;
      win.location.href = url;
    } else {
      window.location.assign(url);
    }
  } catch (error) {
    win?.close();
    throw error;
  }
}
