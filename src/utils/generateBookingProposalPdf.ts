import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPrice } from './formatPrice';
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
  const clientPhone = booking.client?.phone || booking.clientContact || '-';
  const clientEmail = booking.client?.email || booking.client?.user?.email || booking.clientEmail || '-';

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

  const rows: string[][] = [];
  if (booking.kit) {
    rows.push([booking.kit.name || 'Kit', 'KIT', formatPrice(booking.kit.price ?? 0)]);
  }
  (booking.equipments || []).forEach((eq) => {
    rows.push([eq.name, 'EQUIPAMENTO', `${formatPrice(eq.pricePerHour ?? 0)}/h`]);
  });
  (booking.services || []).forEach((s) => {
    rows.push([s.name, 'SERVIÇO', formatPrice(s.price ?? 0)]);
  });

  autoTable(doc, {
    startY: 112,
    head: [['Item', 'Tipo', 'Valor']],
    body: rows,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [25, 118, 210] },
  });

  const tableEndY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 120;
  let y = tableEndY + 10;

  const totalPrice = Number(booking.totalPrice || 0);
  const discountAmount = Number(booking.discountAmount || 0);

  doc.setFontSize(10);
  if (discountAmount > 0) {
    doc.text(`Subtotal: ${formatPrice(totalPrice + discountAmount)}`, 14, y);
    y += 6;
    doc.text(`Desconto${booking.coupon?.code ? ` (${booking.coupon.code})` : ''}: - ${formatPrice(discountAmount)}`, 14, y);
    y += 8;
  }

  doc.setFontSize(12);
  doc.text(`Total: ${formatPrice(totalPrice)}`, 14, y);
  y += 10;

  doc.setFontSize(10);
  const notesText = booking.notes?.trim() ? booking.notes.trim() : 'Sem observações.';
  const notesLines = doc.splitTextToSize(`Observações: ${notesText}`, 180);
  doc.text(notesLines, 14, y);

  const filenameClient = clientName.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
  doc.save(`proposta-${filenameClient || 'cliente'}-${booking.id}.pdf`);
}
