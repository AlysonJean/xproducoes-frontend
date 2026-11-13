import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatBookingTotal, formatPrice } from './formatPrice';
import { bookingPricing, formatPricingLineTotal, PRICING_LINE_TYPE_LABEL, serviceMinutesText, toArrangeNote } from './bookingPricing';
import { bookingEmail, bookingPhone } from './bookingContact';
import { clientProposalValidityText, proposalExpiredForClient, type ProposalSummaryView } from './bookingStatus';
import { formatBrasiliaDate } from './whatsapp';
import type { BookingDetails } from '../types/types';

// Achado (auditoria de produto): o gerador de proposta em PDF (jsPDF + branding) só existia
// no lado admin (AdminQuickProposalPage), para propostas montadas manualmente durante uma
// ligação. O cliente não tinha nenhuma forma de baixar um PDF formal do próprio orçamento já
// existente — reaproveita o mesmo padrão visual, mas lendo de um BookingDetails real.
async function loadLogoAsDataUrl(): Promise<string | null> {
  try {
    const response = await fetch('/xproducoes-logo.png');
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Falha ao converter logo em base64'));
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Auditoria do orçamento (12/11/2026): o que os dois PDFs da proposta (este, da área do cliente, e o do painel, na
// ficha) e a ficha do painel mostram igual.

const validDate = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// D13: data e hora no horário de Brasília (o do evento), qualquer que seja o fuso do aparelho de quem baixa o PDF.
const brasiliaDateTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

/** "10/01/2027 18:00" no horário de Brasília; '-' sem data válida. */
export function formatBrasiliaDateTime(value?: string | Date | null): string {
  const date = validDate(value);
  return date ? brasiliaDateTime.format(date).replace(', ', ' ') : '-';
}

/**
 * D11: a duração do evento tirada do início e do término ("5 h", "4 h 30 min"), não do eventDuration gravado (que
 * ficava velho depois de mudar as datas) nem dos "4 h" inventados. '-' sem as duas datas ou com término antes do início.
 */
export function eventDurationText(start?: string | Date | null, end?: string | Date | null): string {
  const from = validDate(start);
  const to = validDate(end);
  if (!from || !to) return '-';
  const minutes = Math.round((to.getTime() - from.getTime()) / 60_000);
  return minutes > 0 ? serviceMinutesText(minutes) : '-';
}

/**
 * O10/C5/D5: a validade da proposta é a do resumo que a API manda (booking.proposal.validUntil: a do link, do e-mail e
 * do WhatsApp, no fim do dia de Brasília e nunca depois da véspera do evento), não "7 dias" contados do dia em que o PDF
 * foi baixado. Só na reserva pendente com proposta enviada e validade; sem isso, null (o PDF não fala de validade).
 * expired: a mesma regra da área do cliente (proposalExpiredForClient).
 */
export function proposalValidity(
  booking: { status?: string | null; proposal?: ProposalSummaryView | null },
  now: number = Date.now(),
): { date: string; expired: boolean } | null {
  const until = booking.proposal?.sentAt ? validDate(booking.proposal.validUntil) : null;
  if (booking.status !== 'PENDING' || !until) return null;
  return { date: formatBrasiliaDate(until), expired: proposalExpiredForClient(booking, now) };
}

export async function generateBookingProposalPdf(booking: BookingDetails): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logoDataUrl = await loadLogoAsDataUrl();

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 14, 10, 42, 14);
  }

  doc.setFontSize(16);
  doc.text('Proposta Comercial', 14, 32);

  doc.setFontSize(10);
  doc.text(`Gerada em: ${formatBrasiliaDateTime(new Date())}`, 14, 38);
  doc.text(`Reserva: #${booking.id}`, 14, 43);
  // Auditoria do orçamento (12/11/2026), O10/C5/D5: a validade real, a mesma do link e da área do cliente
  // (clientProposalValidityText); vencida, o cliente pede outra.
  const validity = clientProposalValidityText(booking);
  if (validity) {
    doc.text(validity, 14, 48);
  }

  const clientName = booking.client?.user?.name || booking.client?.name || booking.clientName || 'Cliente';
  // Achado (auditoria ponta a ponta): o telefone e o e-mail do cadastro vinham antes dos informados na
  // reserva, o contrário do servidor e do PDF do painel. Mesma regra de utils/bookingContact (a API não
  // manda client.email: o e-mail do cadastro é o da conta, client.user.email).
  const clientPhone = bookingPhone(booking) || '-';
  const clientEmail = bookingEmail(booking) || '-';

  doc.setFontSize(11);
  doc.text('Cliente', 14, 52);
  doc.setFontSize(10);
  doc.text(`Nome: ${clientName}`, 14, 57);
  doc.text(`WhatsApp: ${clientPhone}`, 14, 62);
  doc.text(`Email: ${clientEmail}`, 14, 67);

  doc.setFontSize(11);
  doc.text('Evento', 14, 77);
  doc.setFontSize(10);
  doc.text(`Título: ${booking.eventTitle || 'Evento'}`, 14, 82);
  // Auditoria do orçamento (12/11/2026), D13 e D11: início e término no horário de Brasília e a duração pelas datas.
  doc.text(`Início: ${formatBrasiliaDateTime(booking.eventDate)}`, 14, 87);
  doc.text(`Término: ${formatBrasiliaDateTime(booking.eventEndDate)}`, 14, 92);
  doc.text(`Duração: ${eventDurationText(booking.eventDate, booking.eventEndDate)}`, 110, 92);
  doc.text(`Local: ${booking.location || booking.eventLocation || '-'}`, 14, 97);

  const fullAddress = [booking.street, booking.addressNumber, booking.neighborhood, booking.city, booking.state, booking.zipCode]
    .filter(Boolean)
    .join(', ');
  const addressLines = doc.splitTextToSize(`Endereço: ${fullAddress || '-'}`, 180);
  doc.text(addressLines, 14, 102);

  // D8a e P16 (aprovadas em 02/11/2026): as linhas e o total são os da reserva (pricing da API), os mesmos
  // da página do cliente e do PDF do painel. Antes este PDF listava os preços de HOJE do catálogo (o
  // equipamento por hora) e o total não batia com as linhas. Reserva antiga sem itens gravados lista só os
  // nomes: o preço combinado é o Total.
  const pricing = bookingPricing(booking);
  const rows: string[][] = pricing.lines.map((line) => [
    `${line.quantity > 1 ? `${line.quantity}× ` : ''}${line.description}`,
    PRICING_LINE_TYPE_LABEL[line.type] ?? 'Item',
    // Auditoria do orçamento (12/11/2026), O21: frete ou pedágio sem preço sai "a combinar" / "à parte".
    formatPricingLineTotal(line),
  ]);
  if (rows.length === 0) {
    if (booking.kit) rows.push([booking.kit.name || 'Kit', 'Kit', 'Incluído no total']);
    (booking.equipments || []).forEach((eq) => rows.push([eq.name, 'Equipamento', 'Incluído no total']));
    (booking.services || []).forEach((s) => rows.push([s.name, 'Serviço', 'Incluído no total']));
  }

  autoTable(doc, {
    startY: 112,
    head: [['Item', 'Tipo', 'Valor']],
    body: rows,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [25, 118, 210] },
  });

  const tableEndY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 120;
  let y = tableEndY + 10;

  // Subtotal, cupom e ajuste só quando há o que explicar; o Total é o valor final da reserva.
  const subtotal = pricing.lines.length > 0 ? pricing.itemsSubtotal : pricing.total + (pricing.couponDiscount?.amount ?? 0);
  doc.setFontSize(10);
  if (pricing.couponDiscount || pricing.adjustment !== 0) {
    doc.text(`Subtotal: ${formatPrice(subtotal)}`, 14, y);
    y += 6;
    if (pricing.couponDiscount) {
      doc.text(`Desconto${pricing.couponDiscount.code ? ` (${pricing.couponDiscount.code})` : ''}: - ${formatPrice(pricing.couponDiscount.amount)}`, 14, y);
      y += 6;
    }
    if (pricing.adjustment !== 0) {
      doc.text(`Ajuste no valor final: ${pricing.adjustment < 0 ? '-' : '+'} ${formatPrice(Math.abs(pricing.adjustment))}`, 14, y);
      y += 6;
    }
    y += 2;
  }

  // Auditoria do orçamento (12/11/2026), O3: pedido ainda sem valor sai "Em preparação", não "R$ 0,00".
  doc.setFontSize(12);
  doc.text(`Total: ${formatBookingTotal(pricing.total)}`, 14, y);
  y += 10;
  // O21: com frete a combinar ou pedágio à parte, o total não os inclui.
  const toArrangeText = toArrangeNote(pricing.lines);
  if (toArrangeText) {
    doc.setFontSize(10);
    doc.text(toArrangeText, 14, y - 4);
    y += 4;
  }

  doc.setFontSize(10);
  const notesText = booking.notes?.trim() ? booking.notes.trim() : 'Sem observações.';
  const notesLines = doc.splitTextToSize(`Observações: ${notesText}`, 180);
  doc.text(notesLines, 14, y);

  const filenameClient = clientName.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
  doc.save(`proposta-${filenameClient || 'cliente'}-${booking.id}.pdf`);
}
