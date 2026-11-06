import { useState, useEffect, useMemo, useCallback, useRef, type ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Trash2, 
  Edit2, 
  Plus, 
  Download, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Truck, 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  Users, 
  Zap,
  ChevronRight,
  ExternalLink,
  Camera,
  Layers,
  Award,
  ShieldCheck,
  CreditCard,
  Paperclip,
  Package
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPrice } from '@/utils/formatPrice';
import { bookingPricing, PRICING_LINE_TYPE_LABEL, type BookingPricingLine } from '@/utils/bookingPricing';
import { formatBookingPaymentStatus } from '@/utils/typeSafeFormatters';
import { bookingStatusLabel, bookingStatusVariant, deliveryStatusLabel, DELIVERY_STATUS_OPTIONS } from '@/utils/bookingStatus';
import { COLLABORATOR_ROLE_OPTIONS } from '@/utils/collaboratorRoles';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useCollaborators } from '@/hooks/useCollaborators';
import { AdminBookingForm } from '@/components/forms/AdminBookingForm';
import { isToday } from 'date-fns';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { useAuth } from '../../contexts/AuthContext';
import { WhatsAppConfirmationModal } from '../../components/modals/WhatsAppConfirmationModal';
import { useNotifications } from '../../contexts/NotificationContext';
import { EventManagement } from '../../components/modals/EventManagement';
import { bookingAPI, api } from '../../services/api';
import { createAndClickAnchor } from '../../utils/dom';
import { SUPPORT_EMAIL } from '../../data/site';
import { formatBookingCode } from '../../utils/bookingCode';
import { bookingEmail, bookingPhone, toWhatsAppNumber } from '../../utils/bookingContact';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { BookingCollaborators } from '../../components/bookings/BookingCollaborators';
import { BookingFinancialSummary } from '../../components/bookings/BookingFinancialSummary';
import { 
  Button, 
  Card, 
  Badge, 
  Grid, 
  Modal, 
  ConfirmModal, 
  Alert,
  Input,
  Select 
} from '@/components/ui/StandardComponents';
import type {
  Booking,
  BookingDetails as BaseBookingDetails,
  Equipment,
  Kit,
  Service,
} from '@/types/types';

type BookingKitEntry = Kit | { id?: string; name?: string; kit?: Kit; items?: unknown[] };

interface BookingEventCollaborator {
  id?: string;
  collaboratorId?: string;
  role?: string;
  startTime?: string;
  endTime?: string;
  hourlyRate?: number;
  fixedRate?: number;
  totalHours?: number;
  totalPayment?: number;
  discount?: number;
  status?: string;
  notes?: string;
  collaborator?: {
    id?: string;
    name?: string;
    phone?: string;
    avatar?: string;
    user?: {
      id?: string;
      name?: string;
      email?: string;
      avatarUrl?: string;
    };
  };
  payments?: unknown[];
}

type BookingDetails = BaseBookingDetails & {
  client?: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
    companyName?: string;
    user?: {
      id?: string;
      name?: string;
      email?: string;
      avatarUrl?: string;
    };
  };
  clientName?: string;
  clientContact?: string;
  clientEmail?: string;
  paymentStatus?: string;
  internalNotes?: string;
  attachments?: Array<{
    id?: string;
    url?: string;
    filename?: string;
    mimeType?: string;
    createdAt?: string;
  }>;
  kit?: Kit;
  kits?: BookingKitEntry[];
  equipments?: Equipment[];
  services?: Service[];
  totalPrice?: number | string;
  discount?: number;
  eventLocation?: string;
  location?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  addressNumber?: string;
  addressComplement?: string;
  eventDuration?: number;
  estimatedDuration?: string;
  createdAt?: string;
  eventCollaborators?: BookingEventCollaborator[];
};

export const BookingDetailPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const { addNotification } = useNotifications();

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for modals
  const [isWppModalOpen, setWppModalOpen] = useState(false);
  const [wppMessage, setWppMessage] = useState('');
  const [wppContact, setWppContact] = useState('');
  const [actionToConfirm, setActionToConfirm] = useState<(() => Promise<void>) | null>(null);
  
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isEventModalOpen, setEventModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isEditDirty, setEditDirty] = useState(false);
  const { guardClose, isConfirmOpen: isDiscardOpen, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard(isEditDirty);
  const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [actionLoading, setActionLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  
  // Confirmation form states
  const [confirmPrice, setConfirmPrice] = useState('');
  const [confirmCollaboratorId, setConfirmCollaboratorId] = useState('');
  const [confirmRole, setConfirmRole] = useState('ASSISTANT');
  // Achado (revisão antes do deploy): "Confirmar reserva" e "Alocar equipe" buscavam
  // /admin/collaborators, rota que não existe (404 — a lista abria sempre vazia). O hook da tela de
  // Colaboradores já busca a rota real e põe em `name` o nome que vem dentro de `user`; sem isso o
  // EventManagement quebraria em `collaborator.name.toLowerCase()`.
  const { collaborators: availableCollaborators, fetchCollaborators: fetchAvailableCollaborators } = useCollaborators();

  const fetchBooking = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await bookingAPI.getById(id);
            setBooking(res.data as BookingDetails);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar a reserva.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const handleExportBooking = () => {
    if (!booking) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(booking, null, 2));
    createAndClickAnchor({ href: dataStr, download: `booking_${booking.id?.substring(0, 8)}.json` });
    addNotification({ type: 'info', title: 'Exportação', message: 'Arquivo JSON da reserva baixado.' });
  };

  const handleDeleteBooking = async () => {
    if (!booking?.id) return;
    try {
      setActionLoading(true);
      await bookingAPI.delete(booking.id);
      addNotification({ type: 'success', title: 'Reserva excluída', message: 'A reserva foi excluída.' });
      navigate('/admin/reservas');
        } catch {
      addNotification({ type: 'error', title: 'Erro ao excluir', message: 'Não foi possível excluir a reserva.' });
    } finally {
      setActionLoading(false);
      setDeleteModalOpen(false);
    }
  };

  const handleStatusChange = async (bookingId: string, value: string) => {
    try {
      setActionLoading(true);
      // "A caminho" é status de entrega (DeliveryStatus), não de reserva.
      if (value === 'ON_THE_WAY') await bookingAPI.updateDeliveryStatus(bookingId, value);
      else await bookingAPI.updateStatus(bookingId, value);
      await fetchBooking();
      addNotification({ type: 'success', title: 'Status atualizado', message: 'O status da reserva foi atualizado.' });
        } catch (error: unknown) {
      // Mostra o motivo vindo do backend (ex.: 409 de conflito de equipamento) quando houver.
      const err = error as { response?: { data?: { error?: string; message?: string } } };
      addNotification({ type: 'error', title: 'Erro ao atualizar', message: err.response?.data?.message || err.response?.data?.error || 'Não foi possível atualizar o status.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmWithDetails = async () => {
    if (!booking?.id) return;
    try {
      setActionLoading(true);
            const payload: { totalPrice?: number; collaborators?: Array<{ collaboratorId: string; role: string }> } = {};
      if (confirmPrice) payload.totalPrice = Number(confirmPrice);
      if (confirmCollaboratorId) {
        payload.collaborators = [
          {
            collaboratorId: confirmCollaboratorId,
            role: confirmRole || 'ASSISTANT',
          },
        ];
      }
      await bookingAPI.confirmWithDetails(booking.id, payload);
      await fetchBooking();
      setConfirmModalOpen(false);
      addNotification({ type: 'success', title: 'Reserva confirmada', message: 'Valor e equipe salvos.' });
        } catch {
      addNotification({ type: 'error', title: 'Erro ao confirmar', message: 'Não foi possível confirmar a reserva.' });
    } finally {
      setActionLoading(false);
    }
  };

  const prepareWhatsAppMessage = (
    action: 'confirm' | 'cancel' | 'complete' | 'on_the_way' | 'arrived' | 'setup_complete' | 'thank_you'
  ) => {
    // Contato da reserva antes do cadastro, já com DDI: sem o 55, o wa.me abria outro país (31 é a
    // Holanda). Ver utils/bookingContact.
    const contact = booking ? toWhatsAppNumber(bookingPhone(booking)) : null;
    if (!contact) {
      addNotification({ type: 'warning', title: 'Sem telefone', message: 'O cliente não tem um telefone válido para o WhatsApp. Mude o status pela lista de Reservas.' });
      return;
    }

    let message = '';
    const name = booking?.client?.name || booking?.clientName || 'Cliente';
    const bId = formatBookingCode(booking?.id);

    switch (action) {
      case 'confirm':
        message = `Olá, ${name}! Sua reserva #${bId} foi CONFIRMADA. Nossa equipe já está preparada para o seu evento!`;
        setActionToConfirm(() => () => booking?.id ? handleStatusChange(booking.id, 'CONFIRMED') : Promise.resolve());
        break;
      case 'cancel':
        message = `Olá, ${name}. Informamos que sua reserva #${bId} foi CANCELADA em nosso sistema. Qualquer dúvida, estamos à disposição.`;
        setActionToConfirm(() => () => booking?.id ? handleStatusChange(booking.id, 'CANCELLED') : Promise.resolve());
        break;
      case 'on_the_way':
        message = `Olá, ${name}! Nossa equipe operacional já está A CAMINHO para o evento #${bId}. Até breve!`;
        setActionToConfirm(() => () => booking?.id ? handleStatusChange(booking.id, 'ON_THE_WAY') : Promise.resolve());
        break;
      case 'complete':
        message = `Evento #${bId} concluído com sucesso! Obrigado por confiar em nossa tecnologia e equipe. Até a próxima!`;
        setActionToConfirm(() => () => booking?.id ? handleStatusChange(booking.id, 'COMPLETED') : Promise.resolve());
        break;
      default:
        message = `Olá, ${name}! Entrando em contato sobre o evento #${bId}.`;
        setActionToConfirm(() => async () => Promise.resolve());
    }

    setWppMessage(message);
    setWppContact(contact);
    setWppModalOpen(true);
  };

  // ─── PDF / WhatsApp helpers ────────────────────────────────────────────────
  const buildWhatsappText = (b: typeof booking): string => {
    if (!b) return '';
    const name = b.client?.name || b.clientName || 'cliente';
    const progressUrl = typeof window !== 'undefined' ? `${window.location.origin}/cliente/painel` : 'https://xproducoeseeventos.com.br/cliente/painel';
    const registrationUrl = typeof window !== 'undefined' ? `${window.location.origin}/cadastro` : 'https://xproducoeseeventos.com.br/cadastro';
    return [
      `Olá, ${name}! Segue a proposta comercial do seu evento.`,
      `Total: ${formatPrice(b.totalPrice || 0)}.`,
      `Acompanhe sua reserva em: ${progressUrl}`,
      `Ainda não tem cadastro? Crie aqui: ${registrationUrl}`,
    ].join(' ');
  };

  const generateBookingPdf = async (): Promise<void> => {
    if (!booking) return;

    // ── Paleta de cores da marca ─────────────────────────────────────────────
    const C_DARK:  [number, number, number] = [23,  37,  84];   // #172554 azul escuro
    const C_BLUE:  [number, number, number] = [37,  99,  235];  // #2563eb azul primário
    const C_LIGHT: [number, number, number] = [239, 246, 255];  // #eff6ff azul muito claro
    const C_MUTED: [number, number, number] = [100, 116, 139];  // #64748b cinza
    const C_TEXT:  [number, number, number] = [30,  30,  30];   // #1e1e1e texto
    const C_WHITE: [number, number, number] = [255, 255, 255];
    const C_RED:   [number, number, number] = [220, 38,  38];   // #dc2626 para desconto
    const C_CARD:  [number, number, number] = [248, 250, 252];  // #f8fafc fundo card

    const MARGIN = 14;
    const PAGE_W = 210;
    const PAGE_H = 297;
    const dataEmissao = new Date().toLocaleDateString('pt-BR');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // ── Logo embutido (base64) ───────────────────────────────────────────────
    const LOGO_DATA = "data:image/png;base64,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";

    // ── Cabeçalho ────────────────────────────────────────────────────────────
    doc.setFillColor(...C_DARK);
    doc.rect(0, 0, PAGE_W, 33, 'F');

    const logoData = LOGO_DATA;
    if (logoData) {
      doc.addImage(logoData, 'PNG', MARGIN, 5, 46, 23);
    }

    doc.setTextColor(...C_WHITE);
    doc.setFontSize(19);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPOSTA COMERCIAL', 72, 16);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Emitida em: ${dataEmissao}   |   Validade: 7 dias   |   Ref: #${formatBookingCode(booking.id).toUpperCase()}`, 72, 23);

    // ── Responsável ──────────────────────────────────────────────────────────
    let curY = 42;
    doc.setTextColor(...C_BLUE);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Responsavel: ${user?.name || 'Equipe X Producoes'}`, MARGIN, curY);

    // ── Seção Cliente ────────────────────────────────────────────────────────
    curY += 8;
    doc.setFillColor(...C_DARK);
    doc.rect(MARGIN, curY, PAGE_W - MARGIN * 2, 6, 'F');
    doc.setTextColor(...C_WHITE);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE', MARGIN + 3, curY + 4.2);

    curY += 9;
    const clientName = booking.client?.name || booking.clientName || 'Nao informado';
    const clientPhone = bookingPhone(booking) || '-';
    const clientEmail = bookingEmail(booking) || '-';
    doc.setFontSize(9);
    doc.setTextColor(...C_TEXT);
    doc.setFont('helvetica', 'bold');
    doc.text('Nome:', MARGIN, curY);
    doc.setFont('helvetica', 'normal');
    doc.text(clientName, MARGIN + 14, curY);
    curY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Tel/WhatsApp:', MARGIN, curY);
    doc.setFont('helvetica', 'normal');
    doc.text(clientPhone, MARGIN + 26, curY);
    doc.setFont('helvetica', 'bold');
    doc.text('E-mail:', 100, curY);
    doc.setFont('helvetica', 'normal');
    doc.text(clientEmail, 112, curY);

    // ── Seção Evento ─────────────────────────────────────────────────────────
    curY += 10;
    doc.setFillColor(...C_DARK);
    doc.rect(MARGIN, curY, PAGE_W - MARGIN * 2, 6, 'F');
    doc.setTextColor(...C_WHITE);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('EVENTO', MARGIN + 3, curY + 4.2);

    curY += 9;
    const duracao = booking.eventDuration || 4;
    const eventLabel = booking.location || booking.eventLocation || '-';
    const startDate = new Date(booking.eventDate).toLocaleString('pt-BR');
    const endDate = booking.eventEndDate ? new Date(booking.eventEndDate).toLocaleString('pt-BR') : '-';
    const fullAddress = [booking.street, booking.addressNumber, booking.neighborhood, booking.city, booking.state, booking.zipCode].filter(Boolean).join(', ');

    doc.setFontSize(9);
    doc.setTextColor(...C_TEXT);
    doc.setFont('helvetica', 'bold');
    doc.text('Local:', MARGIN, curY);
    doc.setFont('helvetica', 'normal');
    doc.text(eventLabel, MARGIN + 12, curY);
    doc.setFont('helvetica', 'bold');
    doc.text('Duracao:', 110, curY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${duracao}h`, 125, curY);
    curY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Inicio:', MARGIN, curY);
    doc.setFont('helvetica', 'normal');
    doc.text(startDate, MARGIN + 12, curY);
    doc.setFont('helvetica', 'bold');
    doc.text('Termino:', 110, curY);
    doc.setFont('helvetica', 'normal');
    doc.text(endDate, 125, curY);

    if (fullAddress) {
      curY += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('Endereco:', MARGIN, curY);
      doc.setFont('helvetica', 'normal');
      const addrLines = doc.splitTextToSize(fullAddress, 148);
      doc.text(addrLines, MARGIN + 20, curY);
      curY += (addrLines.length - 1) * 4.5;
    }

    // ── Itens da proposta ─────────────────────────────────────────────────────
    // D8a e P16 (aprovadas em 02/11/2026): as linhas e o valor final vêm da reserva (pricing da API), os
    // mesmos da página do cliente e do PDF da área do cliente. Antes este PDF, que vai ao cliente pelo
    // "PDF + WhatsApp", recalculava pelo catálogo × (eventDuration || 4): serviço multiplicado por horas,
    // equipamento e kit por campos que não existem no cadastro (R$ 0), desconto de um campo inexistente e
    // os cachês da equipe como linhas do cliente. Reserva antiga sem itens gravados lista só os nomes.
    const pricing = bookingPricing(booking);
    const itemRows: string[][] = [];
    const itemImages: string[] = [];

    const fetchItemImage = async (url: string): Promise<string | null> => {
      if (!url) return null;
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('img'));
          reader.readAsDataURL(blob);
        });
      } catch { return null; }
    };

    const imageOf = (line: BookingPricingLine): string =>
      (line.equipmentId ? booking.equipments?.find((e) => e.id === line.equipmentId)?.imageUrl : undefined)
      || (line.serviceId ? booking.services?.find((s) => s.id === line.serviceId)?.imageUrl : undefined)
      || (line.kitId && booking.kit?.id === line.kitId ? booking.kit.imageUrl : undefined)
      || '';

    for (const line of pricing.lines) {
      itemRows.push(['', line.description, PRICING_LINE_TYPE_LABEL[line.type] ?? 'Item', String(line.quantity), formatPrice(line.unitPrice), formatPrice(line.discount), formatPrice(line.total)]);
      itemImages.push(imageOf(line));
    }
    if (itemRows.length === 0) {
      const addName = (name: string, type: string, image?: string) => {
        itemRows.push(['', name, type, '-', '-', '-', 'Incluído']);
        itemImages.push(image || '');
      };
      for (const k of booking.kits || (booking.kit ? [booking.kit] : [])) {
        const kit = ('kit' in k ? k.kit : undefined) ?? (k as Kit);
        addName(kit.name || 'Kit', 'Kit', kit.imageUrl);
      }
      for (const e of booking.equipments || []) addName(e.name || 'Equipamento', 'Equipamento', e.imageUrl);
      for (const s of booking.services || []) addName(s.name || 'Serviço', 'Serviço', s.imageUrl);
    }

    const loadedImages = await Promise.all(itemImages.map(fetchItemImage));

    // ── Tabela de itens ───────────────────────────────────────────────────────
    const tableStartY = curY + 8;
    autoTable(doc, {
      startY: tableStartY,
      head: [['', 'Item / Descricao', 'Tipo', 'Qtd', 'Unitario', 'Desconto', 'Total']],
      body: itemRows.length > 0
        ? itemRows
        : [['', '(conforme contrato)', '', '-', '-', '-', formatPrice(pricing.total)]],
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: C_TEXT },
      headStyles: { fillColor: C_DARK, textColor: C_WHITE, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: C_LIGHT },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 58 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 23, halign: 'right' },
        5: { cellWidth: 23, halign: 'right' },
        6: { cellWidth: 24, halign: 'right' },
      },
      didDrawCell: (data) => {
        const img = loadedImages[data.row.index];
        if (data.column.index === 0 && typeof img === 'string' && data.section === 'body') {
          doc.addImage(img, 'PNG', data.cell.x + 1, data.cell.y + 1, 8, 8);
        }
      },
    });

    const tableEndY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? tableStartY + 20;

    // ── Resumo financeiro (caixa à direita) ──────────────────────────────────
    // Subtotal, cupom e ajuste só quando há o que explicar; o valor final é o da reserva.
    const summaryRows: Array<[string, string, boolean]> = [];
    if (pricing.couponDiscount || pricing.adjustment !== 0) {
      summaryRows.push(['Subtotal dos itens:', formatPrice(pricing.itemsSubtotal), false]);
    }
    if (pricing.couponDiscount) {
      const code = pricing.couponDiscount.code ? ` (${pricing.couponDiscount.code})` : '';
      summaryRows.push([`Desconto${code}:`, `- ${formatPrice(pricing.couponDiscount.amount)}`, true]);
    }
    if (pricing.adjustment !== 0) {
      summaryRows.push(['Ajuste no valor final:', `${pricing.adjustment < 0 ? '-' : '+'} ${formatPrice(Math.abs(pricing.adjustment))}`, pricing.adjustment < 0]);
    }

    const boxX = PAGE_W - MARGIN - 86;
    const boxW = 86;
    let finY = tableEndY + 5;

    doc.setFillColor(...C_CARD);
    doc.setDrawColor(...C_BLUE);
    doc.setLineWidth(0.4);
    doc.rect(boxX, finY, boxW, summaryRows.length * 6 + (summaryRows.length > 0 ? 3 : 0) + 14, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    for (const [label, value, red] of summaryRows) {
      finY += 6;
      doc.setTextColor(...(red ? C_RED : C_TEXT));
      doc.text(label, boxX + 4, finY);
      doc.text(value, boxX + boxW - 4, finY, { align: 'right' });
    }

    if (summaryRows.length > 0) {
      finY += 3;
      doc.setDrawColor(...C_MUTED);
      doc.setLineWidth(0.2);
      doc.line(boxX + 4, finY + 1, boxX + boxW - 4, finY + 1);
    }

    finY += 5;
    doc.setFillColor(...C_BLUE);
    doc.rect(boxX, finY - 1, boxW, 9, 'F');
    doc.setTextColor(...C_WHITE);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('VALOR FINAL DA PROPOSTA:', boxX + 4, finY + 5.5);
    doc.text(formatPrice(pricing.total), boxX + boxW - 4, finY + 5.5, { align: 'right' });

    // ── Observações (à esquerda do resumo financeiro) ─────────────────────────
    if (booking.notes?.trim()) {
      const obsLines = doc.splitTextToSize(`Obs: ${booking.notes.trim()}`, 82);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...C_MUTED);
      doc.text(obsLines, MARGIN, tableEndY + 8);
    }

    // ── Rodapé institucional ──────────────────────────────────────────────────
    const footerH = 30;
    const footerY = PAGE_H - footerH - 3;

    doc.setFillColor(...C_DARK);
    doc.rect(0, footerY, PAGE_W, footerH + 3, 'F');

    let fy = footerY + 7;
    doc.setTextColor(...C_WHITE);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('X Producoes & Eventos', MARGIN, fy);

    fy += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Tel/WhatsApp: (31) 98925-2272', MARGIN, fy);
    doc.text(`E-mail: ${SUPPORT_EMAIL}`, 95, fy);

    fy += 5;
    doc.setTextColor(167, 202, 255);
    doc.textWithLink('Instagram: @x_producoeseventos', MARGIN, fy, { url: 'https://www.instagram.com/x_producoeseventos' });
    doc.textWithLink('Facebook: /XProducoeseEventos', 95, fy, { url: 'https://www.facebook.com/XProducoeseEventos/?locale=pt_BR' });

    fy += 5;
    doc.setTextColor(...C_WHITE);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.text('Agradecemos a preferencia! Estamos a disposicao para qualquer duvida ou ajuste nesta proposta.', MARGIN, fy);

    fy += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`Atenciosamente, ${user?.name || 'Equipe X Producoes'}`, MARGIN, fy);

    doc.setTextColor(167, 202, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Emitido em ${dataEmissao}`, PAGE_W - MARGIN, fy, { align: 'right' });

    const filenameClient = clientName.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    doc.save(`proposta-${filenameClient}-${booking.id?.substring(0, 8)}.pdf`);
  };

  const handleDownloadBookingPdf = async () => {
    try {
      setGeneratingPdf(true);
      await generateBookingPdf();
      addNotification({ type: 'success', title: 'PDF pronto', message: 'Arquivo gerado com sucesso.' });
    } catch (err: unknown) {
      addNotification({ type: 'error', title: 'Erro no PDF', message: err instanceof Error ? err.message : 'Não foi possível gerar o PDF.' });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadAndWhatsApp = async () => {
    const normalizedPhone = booking ? toWhatsAppNumber(bookingPhone(booking)) : null;
    if (!normalizedPhone) {
      addNotification({ type: 'error', title: 'WhatsApp inválido', message: 'O cliente não tem um telefone válido cadastrado.' });
      return;
    }
    try {
      setSendingWhatsApp(true);
      await generateBookingPdf();
      const waUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(buildWhatsappText(booking))}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      addNotification({ type: 'success', title: 'WhatsApp aberto', message: 'PDF baixado. Anexe-o na conversa do WhatsApp.' });
    } catch (err: unknown) {
      addNotification({ type: 'error', title: 'Erro', message: err instanceof Error ? err.message : 'Não foi possível abrir o WhatsApp.' });
    } finally {
      setSendingWhatsApp(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────────

  // Anexos: o upload ficava inline no JSX; a lixeira de cada anexo não tinha ação (o backend já
  // tem DELETE /bookings/:id/attachments/:attachmentId).
  const handleUploadAttachments = async (files: FileList | null) => {
    if (!booking?.id || !files || !files.length) return;
    try {
      setUploading(true);
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const fd = new FormData();
        fd.append('image', f);
        fd.append('folder', 'bookings');
        const uploadResp = await api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        const imageUrl = String(uploadResp.data?.imageUrl || uploadResp.data);
        await api.post(`/bookings/${booking.id}/attachments`, { url: imageUrl, filename: f.name, mimeType: f.type });
      }
      await fetchBooking();
      addNotification({ type: 'success', title: 'Anexos enviados', message: 'Os arquivos foram anexados à reserva.' });
    } catch {
      addNotification({ type: 'error', title: 'Erro no envio', message: 'Não foi possível enviar o arquivo.' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async () => {
    if (!booking?.id || !attachmentToDelete) return;
    try {
      setActionLoading(true);
      await api.delete(`/bookings/${booking.id}/attachments/${attachmentToDelete}`);
      await fetchBooking();
      addNotification({ type: 'success', title: 'Anexo excluído', message: 'O anexo foi removido da reserva.' });
    } catch {
      addNotification({ type: 'error', title: 'Erro ao excluir', message: 'Não foi possível excluir o anexo.' });
    } finally {
      setActionLoading(false);
      setAttachmentToDelete(null);
    }
  };

  const requiredServices = useMemo(() => {
    if (!booking) return [];
    const services = new Set<string>();
        const process = (items: unknown[]) => items.forEach(item => {
        if (!item || typeof item !== 'object') return;
        const i = item as { service?: { name?: string }; itemType?: string; name?: string };
        if (i.service?.name) services.add(i.service.name);
        else if (i.itemType === 'SERVICE' && i.name) services.add(i.name);
    });
    if (booking.kit?.items) process(booking.kit.items);
        if (booking.kits) booking.kits.forEach((k) => process(k.items || ('kit' in k ? k.kit?.items : undefined) || []));
    if (booking.services) process(booking.services);
    return Array.from(services);
  }, [booking]);

  // Dados do formulário de edição com referência ESTÁVEL. Achado (revisão): `initialData={{ ...booking }}`
  // criava um objeto novo a cada render; o AdminBookingForm recarrega e faz reset() quando initialData
  // muda, e o onDirtyChange da 1ª tecla re-renderizava a página — o que a pessoa digitava sumia.
  // (Fica antes dos returns antecipados: hook não pode ser condicional.)
  const editInitialData = useMemo(
    () => (booking ? ({ ...booking, totalPrice: Number(booking.totalPrice || 0) } as unknown as Booking) : null),
    [booking]
  );

  // Título e breadcrumb constantes (antes: "Análise de Contrato" → "Anomalia de Sistema" → "Protocolo #…").
  const PAGE_TITLE = 'Detalhes da Reserva';
  const BREADCRUMBS = [
    { name: 'Admin', href: '/admin/painel' },
    { name: 'Reservas', href: '/admin/reservas' },
    { name: 'Detalhes' },
  ];

  if (loading && !booking) {
    return (
      <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-700">
          <BrandLoader size="xl" label="Carregando reserva…" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !booking) {
    return (
      <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="max-w-xl mx-auto space-y-4 py-10">
          <Alert
            variant="error"
            title="Reserva não encontrada"
            description={error || 'Não existe reserva com este código.'}
            action={<Button variant="outline" size="sm" onClick={fetchBooking}>Tentar de novo</Button>}
          />
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/reservas')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Voltar para reservas
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const bookingCode = booking.id?.startsWith('XP-') ? booking.id : `#${formatBookingCode(booking.id)}`;
  const status = booking.status || 'PENDING';
  const canConfirm = status === 'DRAFT' || status === 'PENDING';
  const isClosed = status === 'CANCELLED' || status === 'REFUNDED';
  const deliveryIndex = DELIVERY_STATUS_OPTIONS.findIndex((o) => o.value === (booking.deliveryStatus || 'PENDING'));
  const eventDate = booking.eventDate ? new Date(booking.eventDate) : null;
  const clientName = booking.client?.name || booking.client?.user?.name || booking.clientName || 'Cliente sem nome';
  // O mesmo contato que os botões de WhatsApp e o PDF usam (ver utils/bookingContact).
  const clientPhone = bookingPhone(booking);
  const clientEmail = bookingEmail(booking);

  return (
    <AdminLayout title={PAGE_TITLE} breadcrumbs={BREADCRUMBS}>
      <div className="space-y-8">
        {/* Cabeçalho */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0">
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => navigate('/admin/reservas')}
              aria-label="Voltar para reservas"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 space-y-3">
              <h2 className="text-xl font-bold text-foreground">Reserva {bookingCode}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={bookingStatusVariant(status)}>{bookingStatusLabel(status)}</Badge>
                <Badge variant="outline">Entrega: {deliveryStatusLabel(booking.deliveryStatus || 'PENDING')}</Badge>
                <Badge variant="ghost">Pagamento: {formatBookingPaymentStatus(booking.paymentStatus)}</Badge>
              </div>

              {/* Andamento da entrega. Antes era uma "linha do tempo" de booking.status que misturava
                  status de entrega (A caminho, No local) com o da reserva e não tinha Rascunho/Em andamento. */}
              {!isClosed && (
                <ol className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full" aria-label="Andamento da entrega">
                  {DELIVERY_STATUS_OPTIONS.map((step, idx) => {
                    const isCurrent = idx === deliveryIndex;
                    const isPast = idx < deliveryIndex;
                    return (
                      <li key={step.value} className="flex items-center shrink-0" aria-current={isCurrent ? 'step' : undefined}>
                        <span
                          className={`px-2.5 py-1 rounded-full border text-xs font-medium whitespace-nowrap ${
                            isCurrent
                              ? 'bg-primary border-primary text-primary-foreground'
                              : isPast
                                ? 'bg-primary/10 border-primary/20 text-primary'
                                : 'bg-muted border-border text-muted-foreground'
                          }`}
                        >
                          {step.label}
                        </span>
                        {idx < DELIVERY_STATUS_OPTIONS.length - 1 && <span className="w-3 h-px bg-border" aria-hidden="true" />}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadBookingPdf} isLoading={generatingPdf} leftIcon={<FileText className="h-4 w-4" />}>
              Baixar PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadAndWhatsApp} isLoading={sendingWhatsApp} leftIcon={<MessageSquare className="h-4 w-4" />}>
              PDF + WhatsApp
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportBooking} leftIcon={<Download className="h-4 w-4" />}>
              Exportar JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/reservas/calendario')} leftIcon={<Calendar className="h-4 w-4" />}>
              Ver na agenda
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)} leftIcon={<Edit2 className="h-4 w-4" />}>
              Editar
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteModalOpen(true)} leftIcon={<Trash2 className="h-4 w-4" />}>
              Excluir
            </Button>
          </div>
        </div>

        {/* Ações de status */}
        <Grid columns={{ sm: 1, md: 2 }} gap={6}>
          <Card className="p-6 border-primary/20 bg-primary/5">
            <h3 className="text-xs font-medium text-primary uppercase tracking-wider mb-4">Confirmação</h3>
            {canConfirm ? (
              <div className="space-y-3">
                <Button
                  fullWidth
                  size="sm"
                  onClick={() => { setConfirmPrice(String(booking.totalPrice || '')); fetchAvailableCollaborators().then(() => setConfirmModalOpen(true)); }}
                  leftIcon={<ShieldCheck className="h-4 w-4" />}
                >
                  Confirmar reserva
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  size="sm"
                  className="border-success/40 text-success hover:bg-success/10"
                  onClick={() => prepareWhatsAppMessage('confirm')}
                  leftIcon={<MessageSquare className="h-4 w-4" />}
                >
                  Confirmar e avisar pelo WhatsApp
                </Button>
              </div>
            ) : (
              // Antes mandava usar o Editar, que nunca gravou o status (e agora nem o mostra).
              <p className="text-sm text-muted-foreground">
                Reserva {bookingStatusLabel(status).toLowerCase()}. Para mudar o status, use os botões de Logística ou a lista de Reservas.
              </p>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Logística</h3>
            <div className="space-y-2">
              <Button variant="outline" size="sm" fullWidth className="justify-start" onClick={() => prepareWhatsAppMessage('on_the_way')} leftIcon={<Truck className="h-4 w-4 text-info" />}>
                Avisar: equipe a caminho
              </Button>
              <Button variant="outline" size="sm" fullWidth className="justify-start" onClick={() => handleStatusChange(booking.id!, 'COMPLETED')} leftIcon={<CheckCircle2 className="h-4 w-4 text-success" />}>
                Marcar como concluída
              </Button>
              <Button variant="outline" size="sm" fullWidth className="justify-start text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => prepareWhatsAppMessage('cancel')} leftIcon={<XCircle className="h-4 w-4" />}>
                Cancelar reserva
              </Button>
            </div>
          </Card>
        </Grid>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna principal */}
          <div className="lg:col-span-2 space-y-8 min-w-0">
            {/* Resumo do evento e cliente */}
            <Card className="p-6 sm:p-8">
              <div className="flex flex-col md:flex-row gap-8 justify-between">
                <div className="space-y-6 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <MapPin size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Local</p>
                      <p className="text-sm font-semibold text-foreground break-words">{booking.location || booking.eventLocation || 'Local não informado'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Data e horário</p>
                      <p className="text-sm font-semibold text-foreground">
                        {eventDate
                          ? `${eventDate.toLocaleDateString('pt-BR')} às ${eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                          : 'Data não informada'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Antes: "Duração Estimada: 4h" inventado quando não havia duração. */}
                    {booking.estimatedDuration && (
                      <Badge variant="outline">Duração estimada: {booking.estimatedDuration}</Badge>
                    )}
                    {eventDate && isToday(eventDate) && <Badge variant="success">Evento hoje</Badge>}
                  </div>
                </div>

                <div className="w-full md:w-auto md:min-w-[280px] p-6 rounded-2xl bg-muted/40 border border-border">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 text-center">Cliente</h3>
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <User size={30} />
                    </div>
                    <div className="min-w-0 w-full">
                      <p className="text-lg font-bold text-foreground break-words">{clientName}</p>
                      <div className="flex flex-col gap-1.5 mt-2">
                        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Phone size={14} className="text-primary shrink-0" /> {clientPhone || 'Sem telefone'}
                        </p>
                        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground break-all">
                          <Mail size={14} className="text-primary shrink-0" /> {clientEmail || 'Sem e-mail'}
                        </p>
                      </div>
                    </div>
                    {booking.client?.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        fullWidth
                        onClick={() => navigate(`/admin/clientes/${booking.client?.id}`)}
                        rightIcon={<ChevronRight size={14} />}
                      >
                        Ver cliente
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Itens */}
            <Card className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <Layers className="text-primary h-6 w-6" />
                <h3 className="text-lg font-bold text-foreground">Itens da reserva</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border pb-2">Kits</h4>
                  <div className="space-y-3">
                    {((booking.kits && booking.kits.length > 0) || booking.kit) ? (
                      (booking.kits && booking.kits.length > 0 ? booking.kits : (booking.kit ? [booking.kit] : [])).map((k, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border">
                          <div className="h-10 w-10 shrink-0 rounded-xl bg-card border border-border flex items-center justify-center">
                            <Package className="text-muted-foreground" size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{('kit' in k ? (k.name || k.kit?.name) : k.name) || 'Kit sem nome'}</p>
                            {k.id && <p className="text-xs text-muted-foreground font-mono">#{k.id.substring(0, 8)}</p>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum kit nesta reserva.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border pb-2">Serviços</h4>
                  <div className="space-y-2">
                    {requiredServices.length > 0 ? (
                      requiredServices.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl border border-border">
                          <Zap size={14} className="text-primary shrink-0" />
                          <span className="text-sm font-semibold text-foreground">{s}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum serviço nesta reserva.</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Equipe */}
            <Card className="p-0 overflow-hidden">
              <div className="p-6 sm:p-8 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Award className="text-primary h-6 w-6" />
                  <h3 className="text-lg font-bold text-foreground">Equipe</h3>
                </div>
                {/* Este fluxo grava por /confirm-details, que também CONFIRMA a reserva — o rótulo diz isso. */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchAvailableCollaborators().then(() => setEventModalOpen(true))}
                  leftIcon={<Users size={16} />}
                >
                  Alocar equipe e confirmar
                </Button>
              </div>
              <div className="p-6 sm:p-8 bg-muted/10">
                <BookingCollaborators
                  bookingId={booking.id!}
                  eventDate={booking.eventDate}
                  requiredServices={requiredServices}
                />
              </div>
            </Card>

            {/* Anexos */}
            <Card className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <Paperclip className="text-primary h-6 w-6" />
                  <h3 className="text-lg font-bold text-foreground">Anexos e comprovantes</h3>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  aria-hidden="true"
                  tabIndex={-1}
                  onChange={(e) => handleUploadAttachments(e.target.files)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  leftIcon={<Plus size={14} />}
                >
                  Anexar arquivo
                </Button>
              </div>

              {booking.attachments && booking.attachments.length > 0 ? (
                <Grid columns={{ sm: 2, md: 3, lg: 4 }} gap={4}>
                  {booking.attachments.map((a) => (
                    <div key={a.id} className="relative group overflow-hidden rounded-2xl border border-border aspect-[4/3] bg-muted/30">
                      <img src={a.url} alt={a.filename || 'Anexo'} className="w-full h-full object-cover" />
                      {/* Sobre foto: scrim escuro + texto branco (exceção do guia). Visível no toque e no foco. */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-end justify-between gap-2 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <p className="text-xs font-medium text-white truncate">{a.filename || 'Anexo'}</p>
                        <div className="flex gap-2 shrink-0">
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            title="Ver anexo em nova aba"
                            aria-label={`Abrir ${a.filename || 'anexo'} em nova aba`}
                            className="h-9 w-9 rounded-xl bg-white/20 hover:bg-white/40 flex items-center justify-center text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <ExternalLink size={16} />
                          </a>
                          {a.id && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => setAttachmentToDelete(a.id!)}
                              aria-label={`Excluir ${a.filename || 'anexo'}`}
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </Grid>
              ) : (
                <div className="bg-muted/30 rounded-2xl border-2 border-dashed border-border py-12 text-center">
                  <Camera className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhum anexo nesta reserva.</p>
                </div>
              )}
            </Card>
          </div>

          {/* Coluna lateral */}
          <div className="space-y-8 min-w-0">
            {user?.role === 'ADMIN' && (
              <Card className="p-0 overflow-hidden">
                <div className="p-6 bg-primary text-primary-foreground">
                  <div className="flex items-center gap-2 mb-2 opacity-90">
                    <CreditCard size={18} />
                    <h3 className="text-xs font-medium uppercase tracking-wider">Valor da reserva</h3>
                  </div>
                  <p className="text-3xl font-bold break-words">{formatPrice(Number(booking.totalPrice || 0))}</p>
                  <p className="mt-3 inline-flex items-center rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-2.5 py-0.5 text-xs font-semibold">
                    Pagamento: {formatBookingPaymentStatus(booking.paymentStatus)}
                  </p>
                </div>
                <div className="p-4 sm:p-6">
                  <BookingFinancialSummary booking={booking} />
                </div>
              </Card>
            )}

            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Clock className="text-muted-foreground h-5 w-5" />
                <h3 className="text-base font-bold text-foreground">Histórico</h3>
              </div>

              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="h-2 w-2 mt-1.5 rounded-full bg-success shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Reserva criada</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.createdAt ? new Date(booking.createdAt).toLocaleString('pt-BR') : 'Data não registrada'}
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="h-2 w-2 mt-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Status atual</p>
                    <p className="text-sm text-muted-foreground">{bookingStatusLabel(status)}</p>
                  </div>
                </li>
              </ol>

              {/* Respostas da página /briefing: o pedido chega sem itens do catálogo, e é daqui que sai a proposta. */}
              {booking.specialRequests?.trim() && (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 text-primary">
                    <FileText size={16} />
                    <h4 className="text-xs font-medium uppercase tracking-wider">Briefing do cliente</h4>
                  </div>
                  <p className="text-sm text-foreground mt-3 leading-relaxed whitespace-pre-line break-words">
                    {booking.specialRequests}
                  </p>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText size={16} />
                  <h4 className="text-xs font-medium uppercase tracking-wider">Observações</h4>
                </div>
                <p className="text-sm text-foreground mt-3 leading-relaxed whitespace-pre-line">
                  {booking.notes || 'Sem observações.'}
                </p>
              </div>

              {/* Observações internas (ex.: histórico importado das agendas — equipe, valor
                  estimado, texto original). Não havia onde vê-las no painel. */}
              {user?.role === 'ADMIN' && booking.internalNotes?.trim() && (
                <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText size={16} />
                    <h4 className="text-xs font-medium uppercase tracking-wider">Observações internas</h4>
                  </div>
                  <p className="text-sm text-foreground mt-3 leading-relaxed whitespace-pre-line">
                    {booking.internalNotes}
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      <WhatsAppConfirmationModal
        isOpen={isWppModalOpen}
        onClose={() => setWppModalOpen(false)}
        onConfirm={async () => {
          if (actionToConfirm) await actionToConfirm();
          setWppModalOpen(false);
          setActionToConfirm(null);
        }}
        message={wppMessage}
        contactNumber={wppContact}
        isSending={actionLoading}
      />

      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirmar reserva"
        size="sm"
      >
        <div className="space-y-6 pt-4">
          <Alert variant="info" title="Confira o valor" description="Revise o valor final do serviço antes de confirmar e alocar a equipe." />
          <div className="space-y-4">
            <Input
              label="Valor total do serviço (R$)"
              type="number"
              step="0.01"
              value={confirmPrice}
              onChange={(e) => setConfirmPrice(e.target.value)}
              placeholder="0,00"
            />
            <Select
              label="Colaborador responsável (opcional)"
              value={confirmCollaboratorId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setConfirmCollaboratorId(e.target.value)}
              options={[
                { value: '', label: 'Não atribuir agora' },
                ...availableCollaborators.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
            {confirmCollaboratorId && (
              <Select
                label="Função"
                value={confirmRole}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setConfirmRole(e.target.value)}
                options={COLLABORATOR_ROLE_OPTIONS}
              />
            )}
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={handleConfirmWithDetails} isLoading={actionLoading} fullWidth size="sm">
              Confirmar reserva
            </Button>
            <Button variant="outline" onClick={() => setConfirmModalOpen(false)} fullWidth size="sm">Cancelar</Button>
          </div>
        </div>
      </Modal>

      {isEventModalOpen && (
        <EventManagement
          event={{
            id: booking.id!,
            title: booking.kit?.name || clientName || 'Reserva',
            startDate: booking.eventDate,
            startTime: new Date(booking.eventDate).toISOString(),
            endTime: booking.eventEndDate || undefined,
            location: booking.location || booking.eventLocation || '',
          }}
          collaborators={availableCollaborators}
          onSave={async (assignments) => {
            if (!booking?.id) return;
            try {
              setActionLoading(true);
              // D3 (aprovada em 02/11/2026): a escala não inventa função nem valor. A função vem da janela
              // (a do colaborador ou a escolhida); sem valor por hora, valor e total não vão (antes iam 0).
              // E o custo da equipe não vira o preço da reserva: antes, reserva sem valor era confirmada com
              // o preço = soma dos cachês estimados. O preço fica como está (define-se em "Confirmar
              // reserva" ou em "Editar"); o servidor só troca o valor quando recebe totalPrice.
              const payload = assignments.map((a) => ({
                collaboratorId: a.collaboratorId,
                role: a.role,
                totalHours: a.estimatedHours,
                ...(a.hourlyRate != null ? { hourlyRate: a.hourlyRate, totalPayment: a.hourlyRate * a.estimatedHours } : {}),
              }));
              await bookingAPI.confirmWithDetails(booking.id, { collaborators: payload });
              await fetchBooking();
              setEventModalOpen(false);
              addNotification({ type: 'success', title: 'Equipe salva', message: 'Equipe alocada e reserva confirmada.' });
            } catch {
              addNotification({ type: 'error', title: 'Erro ao salvar equipe', message: 'Não foi possível salvar a equipe.' });
            } finally {
              setActionLoading(false);
            }
          }}
          onClose={() => setEventModalOpen(false)}
        />
      )}

      {/* Editar: antes navegava para /admin/reservas/:id/editar, rota que não existe. */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => guardClose(() => setEditModalOpen(false))}
        title="Editar reserva"
        size="full"
        className="max-h-[90vh] max-w-5xl"
      >
        <div className="min-w-0">
          <AdminBookingForm
            initialData={editInitialData}
            onSuccess={() => { setEditModalOpen(false); fetchBooking(); }}
            onDirtyChange={setEditDirty}
            onCancel={() => guardClose(() => setEditModalOpen(false))}
          />
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isDiscardOpen}
        onClose={cancelDiscard}
        onConfirm={confirmDiscard}
        title="Descartar alterações?"
        message="Você preencheu dados que ainda não foram salvos. Deseja descartar essas alterações?"
        variant="warning"
        confirmText="Descartar"
        cancelText="Continuar editando"
      />

      <ConfirmModal
        isOpen={!!attachmentToDelete}
        onClose={() => setAttachmentToDelete(null)}
        onConfirm={handleDeleteAttachment}
        title="Excluir anexo?"
        message="O arquivo deixará de aparecer nesta reserva."
        variant="danger"
        isLoading={actionLoading}
        confirmText="Excluir"
        cancelText="Cancelar"
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteBooking}
        title="Excluir reserva?"
        message="Esta ação não pode ser desfeita. A reserva, os valores e a equipe alocada serão removidos."
        variant="danger"
        isLoading={actionLoading}
        confirmText="Excluir"
        cancelText="Cancelar"
      />
    </AdminLayout>
  );
};

export default BookingDetailPage;
