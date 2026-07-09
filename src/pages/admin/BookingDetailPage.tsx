import { useState, useEffect, useMemo, useCallback, type ChangeEvent } from 'react';
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
  Settings,
  ShieldCheck,
  CreditCard,
  Paperclip,
  Package
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatPrice } from '@/utils/formatPrice';
import { isToday } from 'date-fns';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { useAuth } from '../../contexts/AuthContext';
import { WhatsAppConfirmationModal } from '../../components/modals/WhatsAppConfirmationModal';
import { useNotifications } from '../../contexts/NotificationContext';
import { EventManagement } from '../../components/modals/EventManagement';
import { bookingAPI, collaboratorsAPI, api } from '../../services/api';
import { createAndClickAnchor } from '../../utils/dom';
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
  BookingDetails as BaseBookingDetails,
  Equipment,
  Kit,
  Service,
  ICollaborator,
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
  
  const [actionLoading, setActionLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  
  // Confirmation form states
  const [confirmPrice, setConfirmPrice] = useState('');
  const [confirmCollaboratorId, setConfirmCollaboratorId] = useState('');
  const [confirmRole, setConfirmRole] = useState('ASSISTANT');
    const [availableCollaborators, setAvailableCollaborators] = useState<ICollaborator[]>([]);

  const fetchBooking = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await bookingAPI.getById(id);
            setBooking(res.data as BookingDetails);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao sincronizar detalhes do contrato.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const fetchAvailableCollaborators = async () => {
    try {
      const res = await collaboratorsAPI.getAll();
            const list: ICollaborator[] = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
            setAvailableCollaborators(list);
        } catch { /* ignore */ }
  };

  const handleExportBooking = () => {
    if (!booking) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(booking, null, 2));
    createAndClickAnchor({ href: dataStr, download: `booking_${booking.id?.substring(0, 8)}.json` });
    addNotification({ type: 'info', title: 'Exportação', message: 'Payload da reserva gerado com sucesso.' });
  };

  const handleDeleteBooking = async () => {
    if (!booking?.id) return;
    try {
      setActionLoading(true);
      await bookingAPI.delete(booking.id);
      addNotification({ type: 'success', title: 'Purga Concluída', message: 'Contrato removido do repositório ativo.' });
      navigate('/admin/reservas');
        } catch {
      addNotification({ type: 'error', title: 'Falha Crítica', message: 'Erro ao processar exclusão do contrato.' });
    } finally {
      setActionLoading(false);
      setDeleteModalOpen(false);
    }
  };

  const handleStatusChange = async (bookingId: string, value: string) => {
    try {
      setActionLoading(true);
      await bookingAPI.updateStatus(bookingId, value);
      await fetchBooking();
      addNotification({ type: 'success', title: 'Estado Sincronizado', message: 'Status operativo atualizado.' });
        } catch {
      addNotification({ type: 'error', title: 'Erro de Protocolo', message: 'Falha ao comunicar alteração de status.' });
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
      addNotification({ type: 'success', title: 'Contrato Ativado', message: 'Reserva validada e sincronizada.' });
        } catch {
      addNotification({ type: 'error', title: 'Falha na Ativação', message: 'Não foi possível confirmar os parâmetros financeiros.' });
    } finally {
      setActionLoading(false);
    }
  };

  const prepareWhatsAppMessage = (
    action: 'confirm' | 'cancel' | 'complete' | 'on_the_way' | 'arrived' | 'setup_complete' | 'thank_you'
  ) => {
    const contact = booking?.client?.phone || booking?.clientContact;
    if (!contact) {
      addNotification({ type: 'warning', title: 'Contato Ausente', message: 'O cliente não possui terminal móvel associado.' });
      return;
    }

    let message = '';
    const name = booking?.client?.name || booking?.clientName || 'Cliente';
    const bId = booking?.id?.substring(0, 8);

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
    setWppContact(contact.replace(/\D/g, ''));
    setWppModalOpen(true);
  };

  // ─── PDF / WhatsApp helpers ────────────────────────────────────────────────
  const normalizeWhatsAppNumber = (raw: string): string | null => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return null;
    if (digits.startsWith('55') && digits.length >= 12) return digits;
    if (digits.length === 10 || digits.length === 11) return `55${digits}`;
    if (digits.length >= 12) return digits;
    return null;
  };

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
    doc.text(`Emitida em: ${dataEmissao}   |   Validade: 7 dias   |   Ref: #${booking.id?.substring(0, 8).toUpperCase()}`, 72, 23);

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
    const clientPhone = booking.client?.phone || booking.clientContact || '-';
    const clientEmail = booking.client?.email || booking.clientEmail || '-';
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

    // ── Montagem da tabela de itens ───────────────────────────────────────────
    const itemRows: string[][] = [];
    const itemImages: string[] = [];
    let subtotalBruto = 0;
    let totalDescontos = 0;

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

    // Equipamentos → preço/hora × duração do evento
    for (const e of booking.equipments || []) {
      const qtd = duracao;
      const unitVal = Number(e.hourlyRate || 0) || Number(e.dailyPrice || 0);
      const subtotal = unitVal * qtd;
      const desc = Number(e.discount || 0);
      subtotalBruto += subtotal;
      totalDescontos += desc;
      itemRows.push(['', e.name || 'Equipamento', 'Equipamento', `${qtd}h`, formatPrice(unitVal), formatPrice(desc), formatPrice(subtotal - desc)]);
      itemImages.push(e.imageUrl || '');
    }

    // Kits → preço/hora × duração do evento
    for (const k of booking.kits || (booking.kit ? [booking.kit] : [])) {
      const kit = ('kit' in k ? k.kit : undefined) ?? (k as Kit);
      const qtd = duracao;
      const unitVal = Number(kit.hourlyRate || 0) || Number(kit.price || 0);
      const subtotal = unitVal * qtd;
      const desc = Number(kit.discount || 0);
      subtotalBruto += subtotal;
      totalDescontos += desc;
      itemRows.push(['', kit.name || 'Kit', 'Kit', `${qtd}h`, formatPrice(unitVal), formatPrice(desc), formatPrice(subtotal - desc)]);
      itemImages.push(kit.imageUrl || '');
    }

    // Serviços → preço/hora × duração do evento
    for (const s of booking.services || []) {
      const qtd = duracao;
      const unitVal = Number(s.hourlyRate || 0) || Number(s.price || 0);
      const subtotal = unitVal * qtd;
      const desc = Number(s.discount || 0);
      subtotalBruto += subtotal;
      totalDescontos += desc;
      itemRows.push(['', s.name || 'Servico', 'Servico', `${qtd}h`, formatPrice(unitVal), formatPrice(desc), formatPrice(subtotal - desc)]);
      itemImages.push(s.imageUrl || '');
    }

    // Colaboradores → valor/hora × horas contratadas
    for (const ec of booking.eventCollaborators || []) {
      const qtd = ec.totalHours || duracao;
      const unitVal = Number(ec.hourlyRate || 0) || Number(ec.fixedRate || 0);
      const subtotal = unitVal * qtd;
      const desc = Number(ec.discount || 0);
      subtotalBruto += subtotal;
      totalDescontos += desc;
      const cName = ec.collaborator?.name || ec.collaborator?.user?.name || 'Colaborador';
      itemRows.push(['', cName, ec.role || 'Assistente', `${qtd}h`, formatPrice(unitVal), formatPrice(desc), formatPrice(subtotal - desc)]);
      itemImages.push(ec.collaborator?.avatar || '');
    }

    const loadedImages = await Promise.all(itemImages.map(fetchItemImage));

    // ── Tabela de itens ───────────────────────────────────────────────────────
    const tableStartY = curY + 8;
    autoTable(doc, {
      startY: tableStartY,
      head: [['', 'Item / Descricao', 'Tipo', 'Qtd', 'Vlr/h', 'Desconto', 'Total']],
      body: itemRows.length > 0
        ? itemRows
        : [['', '(conforme contrato)', '', `${duracao}h`, '-', '-', formatPrice(booking.totalPrice || 0)]],
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
    const valorFinal = Number(booking.totalPrice || 0) || Math.max(0, subtotalBruto - totalDescontos);
    const descontoExibido = Number(booking.discount || 0) || totalDescontos;

    const boxX = PAGE_W - MARGIN - 86;
    const boxW = 86;
    let finY = tableEndY + 5;

    doc.setFillColor(...C_CARD);
    doc.setDrawColor(...C_BLUE);
    doc.setLineWidth(0.4);
    doc.rect(boxX, finY, boxW, 34, 'FD');

    finY += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C_TEXT);
    doc.text('Subtotal bruto:', boxX + 4, finY);
    doc.text(formatPrice(subtotalBruto), boxX + boxW - 4, finY, { align: 'right' });

    finY += 6;
    doc.setTextColor(...C_RED);
    doc.text('Desconto concedido ao cliente:', boxX + 4, finY);
    doc.text(`- ${formatPrice(descontoExibido)}`, boxX + boxW - 4, finY, { align: 'right' });

    finY += 3;
    doc.setDrawColor(...C_MUTED);
    doc.setLineWidth(0.2);
    doc.line(boxX + 4, finY + 1, boxX + boxW - 4, finY + 1);

    finY += 5;
    doc.setFillColor(...C_BLUE);
    doc.rect(boxX, finY - 1, boxW, 9, 'F');
    doc.setTextColor(...C_WHITE);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('VALOR FINAL DA PROPOSTA:', boxX + 4, finY + 5.5);
    doc.text(formatPrice(valorFinal), boxX + boxW - 4, finY + 5.5, { align: 'right' });

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
    doc.text('Email: suporte@xproducoeseventos.com.br', 95, fy);

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
      addNotification({ type: 'error', title: 'Falha no PDF', message: err instanceof Error ? err.message : 'Nao foi possivel gerar o PDF.' });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadAndWhatsApp = async () => {
    const rawPhone = booking?.client?.phone || booking?.clientContact || '';
    const normalizedPhone = normalizeWhatsAppNumber(rawPhone);
    if (!normalizedPhone) {
      addNotification({ type: 'error', title: 'WhatsApp invalido', message: 'O cliente nao possui telefone valido cadastrado.' });
      return;
    }
    try {
      setSendingWhatsApp(true);
      await generateBookingPdf();
      const waUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(buildWhatsappText(booking))}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      addNotification({ type: 'success', title: 'WhatsApp aberto', message: 'PDF baixado. Anexe-o na conversa do WhatsApp.' });
    } catch (err: unknown) {
      addNotification({ type: 'error', title: 'Falha', message: err instanceof Error ? err.message : 'Nao foi possivel abrir o WhatsApp.' });
    } finally {
      setSendingWhatsApp(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────────

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

  if (loading) {
    return (
      <AdminLayout title="Análise de Contrato" breadcrumbs={[{ name: 'Admin' }, { name: 'Reservas' }]}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-700">
          <BrandLoader size="xl" />
          <p className="mt-8 text-muted-foreground font-medium tracking-widest uppercase text-[10px] animate-pulse">
            Preparando documentação X Produções...
          </p>
        </div>
      </AdminLayout>
    );
  }

  if (error || !booking) {
    return (
      <AdminLayout title="Anomalia de Sistema" breadcrumbs={[{ name: 'Admin' }, { name: 'Reservas' }]}>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
           <Alert variant="error" title="Contrato Não Localizado" description={error || 'O identificador fornecido não corresponde a nenhum registro ativo.'} />
           <Button variant="outline" className="mt-6" onClick={() => navigate('/admin/reservas')}>Voltar ao Terminal</Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title={`Protocolo #${booking.id?.substring(0, 8)}`} 
      breadcrumbs={[{ name: 'Admin' }, { name: 'Reservas', href: '/admin/reservas' }, { name: 'Detalhes' }]}
    >
      <div className="space-y-8">
        {/* Modern Header Navigation */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => navigate('/admin/reservas')}>
               <ArrowLeft size={18} />
            </Button>
            <div>
              <div className="flex flex-col gap-4">
                <h2 className="text-xl font-black text-foreground uppercase tracking-tighter">Ficha Operacional</h2>
                
                {/* Visual Status Timeline */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide max-w-full">
                  {[
                    { key: 'PENDING', label: 'Lead', icon: Clock },
                    { key: 'CONFIRMED', label: 'Confirmado', icon: ShieldCheck },
                    { key: 'ON_THE_WAY', label: 'Em Trânsito', icon: Truck },
                    { key: 'ARRIVED', label: 'No Local', icon: MapPin },
                    { key: 'COMPLETED', label: 'Entrega', icon: CheckCircle2 }
                  ].map((step, idx, arr) => {
                    const isCurrent = booking.status === step.key;
                    // Logic for "past" steps
                    const statusOrder = ['PENDING', 'CONFIRMED', 'ON_THE_WAY', 'ARRIVED', 'COMPLETED'];
                    const currentIndex = statusOrder.indexOf(booking.status || 'PENDING');
                    const isPast = idx < currentIndex;
                    const isCancelled = booking.status === 'CANCELLED';

                    return (
                      <div key={step.key} className="flex items-center">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 whitespace-nowrap ${
                          isCurrent 
                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105 z-10' 
                            : isPast 
                              ? 'bg-primary/10 border-primary/20 text-primary' 
                              : 'bg-muted/50 border-border/50 text-muted-foreground opacity-50'
                        } ${isCancelled && 'grayscale opacity-30 cursor-not-allowed'}`}>
                          <step.icon size={12} className={isCurrent ? 'animate-pulse' : ''} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{step.label}</span>
                        </div>
                        {idx < arr.length - 1 && (
                          <div className={`w-4 h-[1px] ${isPast ? 'bg-primary/30' : 'bg-border/30'}`} />
                        )}
                      </div>
                    );
                  })}
                  
                  {booking.status === 'CANCELLED' && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 text-destructive animate-in zoom-in duration-300">
                      <XCircle size={12} />
                      <span className="text-[10px] font-black uppercase tracking-widest">CANCELADO</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-2">Visão detalhada de alocação e fluxogramas</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <Button variant="outline" onClick={handleDownloadBookingPdf} isLoading={generatingPdf} className="h-11 px-5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5">
               <FileText className="h-4 w-4 mr-2" /> Baixar PDF
             </Button>
             <Button variant="outline" onClick={handleDownloadAndWhatsApp} isLoading={sendingWhatsApp} className="h-11 px-5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5">
               <MessageSquare className="h-4 w-4 mr-2" /> PDF + WhatsApp
             </Button>
             <Button variant="outline" onClick={handleExportBooking} className="h-11 px-5 border-border/60 hover:bg-muted">
               <Download className="h-4 w-4 mr-2" /> JSON Payload
             </Button>
             <Button variant="outline" onClick={() => navigate(`/admin/reservas/${booking.id}/editar`)} className="h-11 px-5 border-border/60 hover:text-primary">
               <Edit2 className="h-4 w-4 mr-2" /> Ajustar Parâmetros
             </Button>
             <Button variant="destructive" onClick={() => setDeleteModalOpen(true)} className="h-11 px-5">
               <Trash2 className="h-4 w-4 mr-2" /> Purga Contratual
             </Button>
             <Button onClick={() => navigate('/admin/reservas/nova')} className="h-11 px-6 shadow-xl shadow-primary/20">
               <Plus className="h-5 w-5 mr-2" /> Novo Draft
             </Button>
          </div>
        </div>

        {/* Action Command Center */}
        <Grid columns={{ sm: 1, md: 3 }} gap={6}>
            <Card className="p-6 border-primary/20 bg-primary/5 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <ShieldCheck size={100} />
                </div>
                <div className="relative z-10">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Núcleo de Confirmação</p>
                    <div className="space-y-3">
                        {booking.status !== 'CONFIRMED' && (
                            <Button className="w-full h-12 font-black uppercase text-[10px] tracking-widest" onClick={() => { setConfirmPrice(String(booking.totalPrice || '')); fetchAvailableCollaborators().then(() => setConfirmModalOpen(true)); }}>
                                Validar & Ativar Reserva
                            </Button>
                        )}
                        <Button variant="outline" className="w-full h-12 font-black uppercase text-[10px] tracking-widest border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5" onClick={() => prepareWhatsAppMessage('confirm')}>
                            <MessageSquare className="mr-2 h-4 w-4" /> Notificar Via WhatsApp
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="p-6 border-border/60 bg-card flex flex-col justify-between">
                <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Fluxo Logístico</p>
                    <div className="space-y-2">
                        <Button variant="outline" className="w-full h-10 text-[9px] font-black uppercase text-left justify-start" onClick={() => prepareWhatsAppMessage('on_the_way')}>
                           <Truck className="mr-3 h-4 w-4 text-indigo-500" /> Reportar: Equipe a Caminho
                        </Button>
                        <Button variant="outline" className="w-full h-10 text-[9px] font-black uppercase text-left justify-start" onClick={() => handleStatusChange(booking.id!, 'COMPLETED')}>
                           <CheckCircle2 className="mr-3 h-4 w-4 text-emerald-500" /> Marcar: Missão Concluída
                        </Button>
                        <Button variant="outline" className="w-full h-10 text-[9px] font-black uppercase text-left justify-start text-destructive border-destructive/20 hover:bg-destructive/5" onClick={() => prepareWhatsAppMessage('cancel')}>
                           <XCircle className="mr-3 h-4 w-4" /> Protocolar: Cancelamento
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="p-6 border-border/60 bg-card flex flex-col justify-between">
                <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">Ações Rápidas</p>
                    <div className="space-y-2">
                        <Button variant="outline" className="w-full h-10 text-[9px] font-black uppercase text-left justify-start" onClick={handleDownloadBookingPdf} isLoading={generatingPdf}>
                           <FileText className="mr-3 h-4 w-4 text-emerald-500" /> Baixar PDF da Proposta
                        </Button>
                        <Button variant="outline" className="w-full h-10 text-[9px] font-black uppercase text-left justify-start" onClick={handleDownloadAndWhatsApp} isLoading={sendingWhatsApp}>
                           <MessageSquare className="mr-3 h-4 w-4 text-emerald-500" /> PDF + Abrir WhatsApp
                        </Button>
                        <Button variant="outline" className="w-full h-10 text-[9px] font-black uppercase text-left justify-start" onClick={() => handleExportBooking()}>
                           <Download className="mr-3 h-4 w-4 text-primary" /> Download Offline Payload
                        </Button>
                        <Button variant="outline" className="w-full h-10 text-[9px] font-black uppercase text-left justify-start" onClick={() => navigate('/admin/producao')}>
                           <Calendar className="mr-3 h-4 w-4 text-amber-500" /> Visualizar na Agenda Global
                        </Button>
                    </div>
                </div>
            </Card>
        </Grid>

        {/* Main Content Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Primary Analysis Column */}
            <div className="lg:col-span-2 space-y-8">
                {/* Visual Summary Card */}
                <Card className="p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                    <div className="relative z-10 flex flex-col md:flex-row gap-8 justify-between">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Localização Operacional</p>
                                    <p className="text-sm font-black text-foreground uppercase tracking-tight">{booking.location || booking.eventLocation || 'Terminal Não Especificado'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Janela de Tempo</p>
                                    <p className="text-sm font-black text-foreground uppercase tracking-tight">
                                        {new Date(booking.eventDate).toLocaleDateString()} — {new Date(booking.eventDate).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 pt-4">
                                <Badge variant="outline" className="bg-muted h-7 px-3 text-[10px] font-black uppercase border-border/60">
                                                                        Duração Estimada: {booking.estimatedDuration || '4h'}
                                </Badge>
                                {isToday(new Date(booking.eventDate)) && (
                                    <Badge variant="success" className="h-7 px-3 text-[10px] font-black uppercase animate-pulse">
                                        EVENTO HOJE
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="min-w-[280px] p-6 rounded-[2rem] bg-muted/40 border border-border/40 backdrop-blur-md">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 text-center">Perfil do Cliente</p>
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="h-16 w-16 rounded-[2rem] bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-xl">
                                    <User size={30} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-foreground tracking-tighter uppercase">{booking.client?.name || booking.clientName}</h3>
                                    <div className="flex flex-col gap-1.5 mt-2">
                                        <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-muted-foreground">
                                           <Phone size={12} className="text-primary" /> {booking.client?.phone || booking.clientContact || 'Sem terminal'}
                                        </div>
                                        <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-muted-foreground">
                                           <Mail size={12} className="text-primary" /> {booking.client?.email || booking.clientEmail || 'N/A'}
                                        </div>
                                    </div>
                                </div>
                                <Button size="sm" variant="outline" className="w-full mt-2 h-9 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-primary hover:text-white hover:border-transparent transition-all" onClick={() => navigate(`/admin/clientes`)}>
                                    Visualizar CRM <ChevronRight size={12} className="ml-1" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Technical Inventory Section */}
                <Card className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <Layers className="text-primary h-6 w-6" />
                            <h3 className="text-lg font-black text-foreground uppercase tracking-tighter">Engenharia de Recursos</h3>
                        </div>
                        <Badge variant="outline" className="bg-muted px-3 text-[10px] font-black">Escaneamento Completo</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border pb-2">Hardware & Combos</h4>
                            <div className="space-y-4">
                                {((booking.kits && booking.kits.length > 0) || booking.kit) ? (
                                                                        (booking.kits && booking.kits.length > 0 ? booking.kits : (booking.kit ? [booking.kit] : [])).map((k, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border/40 group hover:border-primary/30 transition-colors">
                                           <div className="h-10 w-10 rounded-xl bg-card border border-border overflow-hidden flex items-center justify-center">
                                              <Package className="text-muted-foreground/40" size={18} />
                                           </div>
                                           <div className="flex-1">
                                              <p className="text-xs font-black text-foreground uppercase tracking-tight">{('kit' in k ? (k.name || k.kit?.name) : k.name) || 'Módulo Customizado'}</p>
                                              <div className="flex items-center gap-2 mt-0.5">
                                                 <Badge variant="outline" className="text-[8px] h-4 font-black bg-primary/5 border-primary/10 text-primary">KIT-ACTIVE</Badge>
                                                 <span className="text-[9px] font-medium text-muted-foreground opacity-60">ID: {k.id?.substring(0,8) || 'AUTO'}</span>
                                              </div>
                                           </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[10px] font-bold text-muted-foreground italic">Nenhum combo hardware associado.</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border pb-2">Competências & Serviços</h4>
                            <div className="space-y-3">
                                {requiredServices.length > 0 ? (
                                    requiredServices.map((s, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-2xl border border-transparent hover:border-indigo-500/20 hover:bg-indigo-500/5 transition-all">
                                           <div className="flex items-center gap-3">
                                              <Zap size={14} className="text-indigo-500" />
                                              <span className="text-xs font-black text-foreground uppercase tracking-tight">{s}</span>
                                           </div>
                                           <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]" />
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[10px] font-bold text-muted-foreground italic">Padrão: Alocação Assistida</p>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Talent Allocation Hub */}
                <Card className="p-0 border-border/60 overflow-hidden shadow-xl">
                   <div className="p-8 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                         <Award className="text-indigo-500 h-6 w-6" />
                         <h3 className="text-lg font-black text-foreground uppercase tracking-tighter">Corpo Técnico Alocado</h3>
                      </div>
                      <Button variant="outline" onClick={() => fetchAvailableCollaborators().then(() => setEventModalOpen(true))} className="h-10 px-6 font-black uppercase text-[10px] tracking-widest bg-indigo-500/5 border-indigo-500/20 text-indigo-600 hover:bg-indigo-500 hover:text-white transition-all">
                         <Users size={16} className="mr-2" /> Gerenciar Alocação
                      </Button>
                   </div>
                   <div className="p-8 bg-muted/10">
                      <BookingCollaborators 
                        bookingId={booking.id!} 
                        eventDate={booking.eventDate}
                        requiredServices={requiredServices}
                      />
                   </div>
                </Card>

                {/* Assets & Files Registry */}
                <Card className="p-8">
                   <div className="flex items-center justify-between mb-8">
                       <div className="flex items-center gap-3">
                           <Paperclip className="text-amber-500 h-6 w-6" />
                           <h3 className="text-lg font-black text-foreground uppercase tracking-tighter">Repositório de Mídia & Comprovantes</h3>
                       </div>
                       <label className="cursor-pointer group">
                          <input type="file" multiple className="hidden" onChange={async (e) => {
                             const files = e.target.files;
                             if (!files || !files.length) return;
                             try {
                                setActionLoading(true);
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
                                addNotification({ type: 'success', title: 'Upload OK', message: 'Mídias sincronizadas com o contrato.' });
                             } catch {
                                addNotification({ type: 'error', title: 'Erro de Protocolo', message: 'Falha no upload para o servidor.' });
                             } finally {
                                setActionLoading(false);
                             }
                          }} />
                          <Badge variant="outline" className="bg-amber-500/5 border-amber-500/20 text-amber-600 hover:bg-amber-500 hover:text-white font-black uppercase py-1 p-3 cursor-pointer transition-all">
                             <Plus size={12} className="mr-2" /> Anexar Prova Digital
                          </Badge>
                       </label>
                   </div>

                   {booking.attachments && booking.attachments.length > 0 ? (
                       <Grid columns={{ sm: 2, md: 3, lg: 4 }} gap={4}>
                                                      {booking.attachments.map((a) => (
                               <div key={a.id} className="relative group overflow-hidden rounded-2xl border border-border/60 aspect-[4/3] bg-muted/30">
                                   <img src={a.url} alt={a.filename} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-4 text-center">
                                       <p className="text-[10px] font-black text-white uppercase truncate w-full px-4">{a.filename || 'Anexo'}</p>
                                       <div className="flex gap-2">
                                          <a href={a.url} target="_blank" rel="noreferrer" title="Ver anexo em nova aba" aria-label="Ver anexo em nova aba" className="h-9 w-9 rounded-xl bg-white/20 hover:bg-white/40 flex items-center justify-center text-white backdrop-blur-md transition-all">
                                             <ExternalLink size={16} />
                                          </a>
                                          <Button variant="destructive" size="icon" className="h-9 w-9 rounded-xl">
                                             <Trash2 size={16} />
                                          </Button>
                                       </div>
                                   </div>
                               </div>
                           ))}
                       </Grid>
                   ) : (
                       <div className="bg-muted/30 rounded-[2rem] border-2 border-dashed border-border/60 py-16 text-center">
                          <Camera className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nenhuma prova digital interceptada.</p>
                       </div>
                   )}
                </Card>
            </div>

            {/* Sidebar Command Column */}
            <div className="space-y-8">
                {/* Financial Summary Widget */}
                {user?.role === 'ADMIN' && (
                    <div className="bg-card border-border/60 shadow-2xl rounded-[2.5rem] overflow-hidden">
                        <div className="p-8 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
                            <div className="flex items-center gap-3 mb-2 opacity-80">
                                <CreditCard size={18} />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Fluxo Financeiro</p>
                            </div>
                            <h3 className="text-4xl font-black tracking-tighter">R$ {Number(booking.totalPrice || 0).toFixed(2)}</h3>
                            <div className="flex items-center gap-2 mt-4">
                                <Badge variant="outline" className="border-white/20 text-white bg-white/10 font-black h-5 uppercase text-[9px]">
                                   Pagamento: {booking.paymentStatus || 'Aguardando'}
                                </Badge>
                            </div>
                        </div>
                        <div className="p-8 bg-card">
                            <BookingFinancialSummary booking={booking} />
                            <div className="mt-8 pt-8 border-t border-border/50">
                                <Button className="w-full h-12 font-black uppercase text-[10px] tracking-widest bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20">
                                    Processar Faturamento
                                </Button>
                                <p className="text-[9px] font-medium text-muted-foreground text-center mt-4 italic">Auditoria financeira sincronizada em {(new Date()).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Audit & Metadata Timeline */}
                <Card className="p-8 space-y-8">
                    <div className="flex items-center gap-3">
                        <Settings className="text-muted-foreground h-5 w-5" />
                        <h3 className="text-sm font-black text-foreground uppercase tracking-tighter">Meta-Data Auditoria</h3>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1 shadow-[0_0_8px_rgba(16,185,129,1)]" />
                                <div className="w-px flex-1 bg-border my-2" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-foreground uppercase">Criação do Protocolo</p>
                                <p className="text-[9px] font-medium text-muted-foreground mt-1">{new Date(booking.createdAt || '').toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className="h-2 w-2 rounded-full bg-primary mt-1 shadow-[0_0_8px_rgba(var(--primary),1)]" />
                                <div className="w-px flex-1 bg-border my-2" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-foreground uppercase">Agendamento Identificado</p>
                                <p className="text-[9px] font-medium text-muted-foreground mt-1">Sincronizado via Calendário Global</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div className={`h-2 w-2 rounded-full mt-1 ${booking.status === 'CONFIRMED' ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]' : 'bg-muted'}`} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-foreground uppercase">Estado Operativo Atual</p>
                                <p className="text-[9px] font-medium text-muted-foreground mt-1">{booking.status || 'Draft'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-muted/30 border border-border/40">
                         <div className="flex items-center gap-3 text-muted-foreground">
                             <FileText size={16} />
                             <span className="text-[10px] font-black uppercase tracking-widest">Observações Técnicas</span>
                         </div>
                         <p className="text-[11px] font-medium text-foreground mt-3 leading-relaxed italic opacity-80">
                            {booking.notes || 'Sem anotações críticas de campo para este contrato.'}
                         </p>
                    </div>
                </Card>

                {/* Tactical Help Indicator */}
                <div className="p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/20 text-center">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-relaxed">
                        Sistema em Modo Administrativo Full-Privilege
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* Specialty Interface Modals */}
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
        title="Protocolo de Ativação Contratual"
        size="sm"
      >
        <div className="space-y-6 pt-4">
            <Alert variant="info" title="Revisão de Parâmetros" description="Valide o valor final do serviço antes de autorizar a alocação de equipe." />
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2 block">Custo Total do Serviço (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  className="h-12 bg-muted/30 border-border/60"
                  value={confirmPrice}
                  onChange={(e) => setConfirmPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2 block">Líder Operacional (Opcional)</label>
                <Select
                  className="h-12 bg-muted/30"
                  value={confirmCollaboratorId}
                                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setConfirmCollaboratorId(e.target.value)}
                  options={[
                    { value: '', label: 'Não Atribuir No Momento' },
                    ...availableCollaborators.map(c => ({ value: c.id, label: c.name }))
                  ]}
                />
              </div>
              {confirmCollaboratorId && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2 block">Função Primária</label>
                  <Select
                    className="h-12 bg-muted/30"
                    value={confirmRole}
                                        onChange={(e: ChangeEvent<HTMLSelectElement>) => setConfirmRole(e.target.value)}
                    options={[
                        { value: 'PHOTOGRAPHER', label: 'Fotógrafo Líder' },
                        { value: 'ASSISTANT', label: 'Assistente Operacional' },
                        { value: 'PRODUCER', label: 'Produtor Master' },
                    ]}
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 pt-6">
              <Button onClick={handleConfirmWithDetails} isLoading={actionLoading} className="w-full h-12 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20">
                Autorizar Protocolo
              </Button>
              <Button variant="outline" onClick={() => setConfirmModalOpen(false)} className="w-full h-12 font-black uppercase text-[10px] tracking-widest">Abortar</Button>
            </div>
        </div>
      </Modal>

      {isEventModalOpen && (
        <EventManagement
          event={{
            id: booking.id!,
            title: booking.kit?.name || booking.clientName || 'Evento Corporativo',
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
                                const payload = assignments.map((a) => ({
                   collaboratorId: a.collaboratorId,
                   role: a.role || 'PHOTOGRAPHER',
                   totalHours: a.estimatedHours || 0,
                   hourlyRate: a.hourlyRate || 0,
                   totalPayment: Number(a.hourlyRate || 0) * (a.estimatedHours || 0)
                }));
                let totalPrice = Number(booking.totalPrice ?? 0);
                                if (!totalPrice) totalPrice = payload.reduce((sum, c) => sum + Number(c.totalPayment || 0), 0);
                await bookingAPI.confirmWithDetails(booking.id, { totalPrice, collaborators: payload });
                await fetchBooking();
                setEventModalOpen(false);
                addNotification({ type: 'success', title: 'Equipe Sincronizada', message: 'Alocação técnica de campo concluída.' });
             } catch {
                addNotification({ type: 'error', title: 'Erro de Alocação', message: 'Falha ao salvar atribuições de equipe.' });
             } finally {
                setActionLoading(false);
             }
          }}
          onClose={() => setEventModalOpen(false)}
        />
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteBooking}
        title="Protocolo de Purga Contratual"
        message="Esta ação é IRREVERSÍVEL. Todos os dados financeiros e alocações de hardware vinculados a este identificador serão purgados do ecossistema ativo."
        variant="danger"
        isLoading={actionLoading}
        confirmText="Confirmar Purga"
        cancelText="Abortar Operação"
      />
    </AdminLayout>
  );
};

export default BookingDetailPage;
