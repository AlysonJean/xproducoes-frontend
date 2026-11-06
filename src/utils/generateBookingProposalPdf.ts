import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPrice } from './formatPrice';
import { bookingPricing, PRICING_LINE_TYPE_LABEL } from './bookingPricing';
import { bookingEmail, bookingPhone } from './bookingContact';
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

function formatDateTime(value?: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR');
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
  doc.text(`Gerada em: ${new Date().toLocaleString('pt-BR')}`, 14, 38);
  doc.text(`Reserva: #${booking.id}`, 14, 43);

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
  doc.text(`Início: ${formatDateTime(booking.eventDate)}`, 14, 87);
  doc.text(`Término: ${formatDateTime(booking.eventEndDate)}`, 14, 92);
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
    formatPrice(line.total),
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

  doc.setFontSize(12);
  doc.text(`Total: ${formatPrice(pricing.total)}`, 14, y);
  y += 10;

  doc.setFontSize(10);
  const notesText = booking.notes?.trim() ? booking.notes.trim() : 'Sem observações.';
  const notesLines = doc.splitTextToSize(`Observações: ${notesText}`, 180);
  doc.text(notesLines, 14, y);

  const filenameClient = clientName.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
  doc.save(`proposta-${filenameClient || 'cliente'}-${booking.id}.pdf`);
}
