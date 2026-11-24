import { useState, useEffect, useMemo, useCallback, useRef, type ChangeEvent } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
import { formatBookingTotal, formatPrice } from '@/utils/formatPrice';
import { bookingPricing, formatPricingLineTotal, serviceMinutesText, toArrangeNote } from '@/utils/bookingPricing';
import { formatBookingPaymentStatus } from '@/utils/typeSafeFormatters';
import { bookingStatusLabel, bookingStatusVariant, deliveryStatusLabel, DELIVERY_STATUS_OPTIONS } from '@/utils/bookingStatus';
import { COLLABORATOR_ROLE_OPTIONS } from '@/utils/collaboratorRoles';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useCollaborators } from '@/hooks/useCollaborators';
import { schedulableCollaborators } from '@/utils/collaboratorAccess';
import { AdminBookingForm } from '@/components/forms/AdminBookingForm';
import { isToday } from 'date-fns';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { useAuth } from '../../contexts/AuthContext';
import { WhatsAppConfirmationModal } from '../../components/modals/WhatsAppConfirmationModal';
import { useNotifications } from '../../contexts/NotificationContext';
import { EventManagement } from '../../components/modals/EventManagement';
import { bookingAPI, api, quotePdfAPI } from '../../services/api';
import { createAndClickAnchor } from '../../utils/dom';
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_RULE_TEXT,
  attachmentFileProblem,
  attachmentUploadErrorMessage,
  bookingAttachmentFilePath,
  openBookingAttachment,
  uploadBookingAttachment,
} from '../../utils/bookingAttachments';
import { formatBookingCode } from '../../utils/bookingCode';
import { bookingEmail, bookingPhone, toWhatsAppNumber } from '../../utils/bookingContact';
import { formatBrasiliaDate } from '../../utils/whatsapp';
import { accessAnswers, answerInRequest, type AccessAnswer } from '../../utils/requestAnswers';
import {
  bookingCancelledWhatsAppText,
  bookingConfirmedWhatsAppText,
  crewOnTheWayWhatsAppText,
} from '../../utils/whatsappTemplates';
import { notifyClientPayload } from '../../utils/notifyClient';
import { NotifyClientCheckbox } from '../../components/bookings/NotifyClientCheckbox';
import { CancelChoices, MarkPaymentCheckbox } from '../../components/bookings/CancelChoices';
import { SendProposalPanel } from '../../components/bookings/SendProposalPanel';
import { itemsLockedReason, proposalForBookingPath } from '../../utils/proposalFromBooking';
import { refreshAdminSummary } from '../../stores/adminSummary';
import { ProposalHistory } from '../../components/bookings/ProposalHistory';
import { StageWhatsAppPanel } from '../../components/bookings/StageWhatsAppPanel';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { BookingCollaborators } from '../../components/bookings/BookingCollaborators';
import { BookingFinancialSummary } from '../../components/bookings/BookingFinancialSummary';
import { AdminContractCard } from '../../components/proposal/AdminContractCard';
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
  // D21: sem url. O arquivo é privado e abre por um link de 5 minutos (openBookingAttachment).
  attachments?: Array<{
    id?: string;
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
  // P14 parte 2: quem criou (pedido do cliente = conta de cliente), quando a avaliação foi pedida e o link de
  // avaliação do Google que a API manda ao admin (null sem GOOGLE_REVIEW_LINK).
  creator?: { role?: string | null } | null;
  reviewRequestSentAt?: string | null;
  reviewLink?: string | null;
};

// ── Auditoria do orçamento (12/11/2026) ─────────────────────────────────────────

// O25 (exibição): escada, local coberto, estacionamento e a hora da montagem, como o cliente respondeu (ver
// utils/requestAnswers: a resposta escrita no texto do pedido; no briefing, "Não informado" para a pergunta sem
// resposta; sem texto, o sim/não do cadastro).

const brasiliaTime = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const validDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** D13: "10/01/2027, das 18:00 às 23:00" (ou com a data do término, se for outro dia), no horário de Brasília. */
function eventWhenText(start?: string | null, end?: string | null): string | null {
  const from = validDate(start);
  if (!from) return null;
  const startText = `${formatBrasiliaDate(from)}, às ${brasiliaTime.format(from)}`;
  const to = validDate(end);
  if (!to || to <= from) return startText;
  const sameDay = formatBrasiliaDate(to) === formatBrasiliaDate(from);
  return sameDay
    ? `${formatBrasiliaDate(from)}, das ${brasiliaTime.format(from)} às ${brasiliaTime.format(to)}`
    : `${startText} até ${formatBrasiliaDate(to)}, às ${brasiliaTime.format(to)}`;
}

/**
 * D11: a duração do evento tirada do início e do término ("5 h", "4 h 30 min"), não do eventDuration gravado (que
 * ficava velho depois de mudar as datas). '-' sem as duas datas ou com término antes do início. Orçamento em PDF
 * (13/11/2026): veio de utils/generateBookingProposalPdf.ts, que saiu junto com o PDF montado no navegador.
 */
function eventDurationText(start?: string | null, end?: string | null): string {
  const from = validDate(start);
  const to = validDate(end);
  if (!from || !to) return '-';
  const minutes = Math.round((to.getTime() - from.getTime()) / 60_000);
  return minutes > 0 ? serviceMinutesText(minutes) : '-';
}

function venueAnswers(b: {
  specialRequests?: string | null;
  requiresStairs?: boolean | null;
  isCovered?: boolean | null;
  hasParking?: boolean | null;
  setupTime?: string | null;
  eventDate?: string | null;
}): { setup: string | null; rows: AccessAnswer[] } {
  const setupAt = validDate(b.setupTime);
  const eventAt = validDate(b.eventDate);
  const setup = setupAt
    ? (eventAt && formatBrasiliaDate(eventAt) === formatBrasiliaDate(setupAt)
        ? brasiliaTime.format(setupAt)
        : `${formatBrasiliaDate(setupAt)}, às ${brasiliaTime.format(setupAt)}`)
    : answerInRequest(b.specialRequests, 'Liberado para montar a partir de');
  return { setup, rows: accessAnswers(b) };
}

// P14 (aprovada em 02/11/2026), parte 2: as trocas de status da ficha que podem levar um aviso pelo WhatsApp. O
// WhatsApp é opcional (caixa na janela); sem telefone, a janela muda só o status.
// Onda 2 (D5): o dia de Brasília como AAAA-MM-DD, que dá para comparar como texto.
const brasiliaDayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });

// Auditoria do status (21/11/2026), M6: bookingAPI usa axios, que rejeita com o erro cru ("Request failed with status code
// 409"); o motivo do servidor vem em response.data (message na maioria das rotas, error no tratador geral).
const serverMessage = (error: unknown, fallback: string): string => {
  const data = (error as { response?: { data?: { message?: unknown; error?: unknown } } })?.response?.data;
  if (typeof data?.message === 'string' && data.message) return data.message;
  if (typeof data?.error === 'string' && data.error) return data.error;
  // Um erro que já traz o motivo (não o genérico do axios) também serve.
  if (error instanceof Error && error.message && !/^Request failed with status code/.test(error.message)) return error.message;
  return fallback;
};

type StatusAction = 'confirm' | 'cancel' | 'on_the_way';
const STATUS_ACTIONS: Record<StatusAction, { status: string; title: string; confirmText: string; variant: 'default' | 'danger' | 'success' }> = {
  confirm: { status: 'CONFIRMED', title: 'Confirmar a reserva?', confirmText: 'Confirmar', variant: 'success' },
  cancel: { status: 'CANCELLED', title: 'Cancelar a reserva?', confirmText: 'Cancelar reserva', variant: 'danger' },
  on_the_way: { status: 'ON_THE_WAY', title: 'Equipe a caminho?', confirmText: 'Marcar a caminho', variant: 'default' },
};

// Onda 2b da auditoria do status (D8): ": R$ 450,00 devolvidos em 20/11/2026", quando o reembolso foi registrado.
const refundDay = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });
function refundText(booking: { refundAmount?: number | string | null; refundedAt?: string | null }): string {
  const amount = Number(booking.refundAmount);
  if (booking.refundAmount === null || booking.refundAmount === undefined || !Number.isFinite(amount) || amount <= 0) return '';
  const when = booking.refundedAt ? new Date(booking.refundedAt) : null;
  const day = when && !Number.isNaN(when.getTime()) ? ` em ${refundDay.format(when)}` : '';
  return `: ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} devolvidos${day}`;
}

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
  const [wppContact, setWppContact] = useState<string | null>(null);
  const [wppAction, setWppAction] = useState<StatusAction>('confirm');
  // Onda 2 da auditoria do status: no cancelamento com contrato aceito, desistência (D9) ou cancelamento pela tabela;
  // na confirmação, "registrar o sinal como recebido" (D6). Lidos na hora da troca (a janela usa o estado atual).
  const [cancelMode, setCancelMode] = useState<'cancel' | 'withdraw'>('cancel');
  const [markPayment, setMarkPayment] = useState(true);
  // Revisão da onda 2: o aviso do cancelamento tem a caixa dele (antes era a mesma da confirmação: desmarcar no cancelar
  // e desistir deixava a confirmação seguinte sem o e-mail ao cliente).
  const [notifyOnCancel, setNotifyOnCancel] = useState(true);
  
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  // Auditoria completa (19/11/2026): "Marcar como concluída" gravava com um clique, em qualquer status. A conclusão manda
  // ao cliente o pedido de avaliação e cria a recompensa da indicação, e voltar o status não desfaz isso: agora pergunta
  // antes e só aparece com a reserva confirmada ou em andamento (o servidor recusa os outros status com 409).
  const [isCompleteModalOpen, setCompleteModalOpen] = useState(false);
  // Onda 2 da auditoria do status (D5): "Iniciar evento" pergunta antes.
  const [isStartModalOpen, setStartModalOpen] = useState(false);
  const [isEventModalOpen, setEventModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isEditDirty, setEditDirty] = useState(false);
  const { guardClose, isConfirmOpen: isDiscardOpen, confirmDiscard, cancelDiscard } = useUnsavedChangesGuard(isEditDirty);
  const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [actionLoading, setActionLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  // Auditoria do orçamento (12/11/2026), E8: "Enviar link pelo WhatsApp" aciona o botão de envio do cartão Confirmação
  // (o "Enviar proposta"/"Reenviar proposta" do SendProposalPanel, pela ref sendButtonRef): o mesmo envio (que registra
  // o envio e a validade), a mesma confirmação com frete a combinar e a mesma janela com "Abrir WhatsApp" e o texto
  // pronto (proposalWhatsAppText), sem uma segunda cópia dessa lógica aqui. Botão ocupado (enviando) não reage.
  const proposalSendButtonRef = useRef<HTMLButtonElement>(null);
  const triggerProposalSend = () => {
    proposalSendButtonRef.current?.click();
  };

  // Auditoria do orçamento (12/11/2026), E8, onda 2: a Proposta Rápida, depois de salvar, abre a ficha com
  // location.state = { sendProposal: true } (no lugar do antigo "PDF + WhatsApp"). A ficha rola até o "Enviar proposta"
  // e põe o foco no botão, sem enviar nada sozinha; o painel só existe em rascunho ou pendente (fora disso, nada acontece).
  // Depois o estado é limpo, para não repetir ao recarregar a página.
  const location = useLocation();
  const cameToSendProposal = Boolean((location.state as { sendProposal?: unknown } | null)?.sendProposal);
  useEffect(() => {
    if (!cameToSendProposal || !booking) return;
    const button = proposalSendButtonRef.current;
    if (button) {
      button.focus({ preventScroll: true });
      // Sem "behavior": a rolagem segue o CSS do site (suave; instantânea com "reduzir movimento" ligado).
      button.scrollIntoView?.({ block: 'center' });
    }
    navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { replace: true });
  }, [cameToSendProposal, booking, navigate, location.pathname, location.search, location.hash]);
  
  // Confirmation form states
  const [confirmPrice, setConfirmPrice] = useState('');
  const [confirmCollaboratorId, setConfirmCollaboratorId] = useState('');
  const [confirmRole, setConfirmRole] = useState('ASSISTANT');
  // D11 (aprovada em 02/11/2026): "Avisar o cliente por e-mail", marcada por padrão. É a mesma escolha no cartão
  // Confirmação (vale para "Confirmar e avisar pelo WhatsApp"), no modal "Confirmar reserva" e em "Alocar equipe e
  // confirmar".
  const [notifyClient, setNotifyClient] = useState(true);
  // D11: cada "Enviar proposta" recarrega os envios do cartão Histórico.
  const [proposalHistoryKey, setProposalHistoryKey] = useState(0);
  // Achado (revisão antes do deploy): "Confirmar reserva" e "Alocar equipe" buscavam
  // /admin/collaborators, rota que não existe (404 — a lista abria sempre vazia). O hook da tela de
  // Colaboradores já busca a rota real e põe em `name` o nome que vem dentro de `user`; sem isso o
  // EventManagement quebraria em `collaborator.name.toLowerCase()`.
  const { collaborators: teamCollaborators, fetchCollaborators: fetchAvailableCollaborators } = useCollaborators();
  // Decisão de Alyson (12/11/2026): quem está com o acesso desativado não aparece para escalar ("Confirmar reserva" e
  // "Alocar equipe e confirmar"); o servidor também recusa.
  const availableCollaborators = useMemo(() => schedulableCollaborators(teamCollaborators), [teamCollaborators]);

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
      // P3: a reserva excluída pode ser um pedido contado no menu e no cartão do painel.
      void refreshAdminSummary({ force: true });
      navigate('/admin/reservas');
        } catch {
      addNotification({ type: 'error', title: 'Erro ao excluir', message: 'Não foi possível excluir a reserva.' });
    } finally {
      setActionLoading(false);
      setDeleteModalOpen(false);
    }
  };

  // Onda 2 (D1): a confirmação devolve o aviso da pré-reserva (outra reserva com contrato aceito no mesmo equipamento).
  const warnPreReservation = (data: unknown) => {
    const warning = (data as { conflictWarning?: unknown } | null | undefined)?.conflictWarning;
    if (typeof warning === 'string' && warning) addNotification({ type: 'warning', title: 'Pré-reserva no mesmo equipamento', message: warning });
    // Onda 2 da auditoria de 19/11 (B5-05): o estoque do período, contando o conteúdo dos kits (só aviso).
    const stock = (data as { stockWarning?: unknown } | null | undefined)?.stockWarning;
    if (typeof stock === 'string' && stock) addNotification({ type: 'warning', title: 'Estoque no mesmo período', message: stock });
    // Onda 2b (B3): confirmar de novo na mesma data não repete o aviso ao cliente.
    if ((data as { confirmationNoticeSkipped?: unknown } | null | undefined)?.confirmationNoticeSkipped === true) {
      addNotification({ type: 'info', title: 'Aviso não repetido', message: 'O cliente já tinha recebido a confirmação desta data: o e-mail e o aviso no site não foram repetidos.' });
    }
  };

  // Devolve true quando a troca gravou (a janela do WhatsApp só abre o WhatsApp nesse caso, M7).
  const handleStatusChange = async (bookingId: string, value: string, reason?: string): Promise<boolean> => {
    try {
      setActionLoading(true);
      // "A caminho" é status de entrega (DeliveryStatus), não de reserva.
      if (value === 'ON_THE_WAY') await bookingAPI.updateDeliveryStatus(bookingId, value);
      // Auditoria do status (21/11/2026), C7: cancelar pela ficha leva o motivo (fica nas observações internas, com quem
      // cancelou no Histórico); antes ia pela troca de status, sem rastro. Onda 2: com contrato aceito, a desistência do
      // cliente (D9) vai pela rota da desistência; o cancelamento leva "Avisar o cliente por e-mail" (D2).
      else if (value === 'CANCELLED' && contractAccepted && cancelMode === 'withdraw') await bookingAPI.withdrawForClient(bookingId);
      else if (value === 'CANCELLED') await bookingAPI.cancel(bookingId, reason || 'Cancelada pela equipe.', notifyClientPayload(notifyOnCancel));
      else {
        const res = await bookingAPI.updateStatus(
          bookingId,
          value,
          value === 'CONFIRMED' ? { ...notifyClientPayload(notifyClient), ...(askPayment && markPayment ? { markInitialPaymentReceived: true as const } : {}) } : undefined,
        );
        warnPreReservation(res?.data);
      }
      // P3: confirmar ou cancelar tira o pedido do número do menu e do cartão do painel na hora ("a caminho" é entrega).
      if (value !== 'ON_THE_WAY') void refreshAdminSummary({ force: true });
      await fetchBooking();
      setProposalHistoryKey((key) => key + 1);
      // B5: a entrega não é o status da reserva.
      addNotification(
        value === 'ON_THE_WAY'
          ? { type: 'success', title: 'Entrega atualizada', message: 'A entrega ficou como "A caminho".' }
          : { type: 'success', title: 'Status atualizado', message: `A reserva ficou como ${bookingStatusLabel(value)}.` },
      );
      return true;
    } catch (error: unknown) {
      // Mostra o motivo vindo do backend (ex.: 409 de conflito de equipamento) quando houver.
      addNotification({ type: 'error', title: 'Erro ao atualizar', message: serverMessage(error, 'Não foi possível atualizar o status.') });
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmWithDetails = async () => {
    if (!booking?.id) return;
    // Auditoria do orçamento (12/11/2026), O33 (junção da onda 2): o servidor recusa valor final zero ou negativo com
    // "Dados de entrada inválidos"; a ficha para antes, com o motivo (como a agenda). Em branco, fica o valor de hoje.
    if (confirmPrice.trim() !== '' && !(Number(confirmPrice) > 0)) {
      addNotification({ type: 'error', title: 'Valor inválido', message: 'O valor final precisa ser maior que zero. Em branco, fica o valor de hoje.' });
      return;
    }
    // Auditoria do status (21/11/2026), B4: o pedido do briefing ainda sem valor ("Em preparação") era confirmado com
    // R$ 0 e o cliente recebia "confirmada". Sem valor na reserva, o valor final é obrigatório.
    if (confirmPrice.trim() === '' && !(Number(booking.totalPrice) > 0)) {
      addNotification({ type: 'error', title: 'Falta o valor', message: 'Esta reserva ainda não tem valor. Digite o valor final antes de confirmar.' });
      return;
    }
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
      const res = await bookingAPI.confirmWithDetails(booking.id, {
        ...payload,
        ...notifyClientPayload(notifyClient),
        ...(askPayment && markPayment ? { markInitialPaymentReceived: true } : {}),
      });
      warnPreReservation(res?.data);
      void refreshAdminSummary({ force: true }); // P3: a reserva saiu de Pendente.
      await fetchBooking();
      setConfirmModalOpen(false);
      addNotification({ type: 'success', title: 'Reserva confirmada', message: 'Valor e equipe salvos.' });
        } catch (e: unknown) {
      // O motivo do servidor (409 de equipamento em uso, colaborador sem acesso, 400) em vez do genérico.
      addNotification({ type: 'error', title: 'Erro ao confirmar', message: serverMessage(e, 'Não foi possível confirmar a reserva.') });
    } finally {
      setActionLoading(false);
    }
  };

  // P14 (aprovada em 02/11/2026), parte 2: confirmar, cancelar e "equipe a caminho" funcionam sem telefone. Antes,
  // sem telefone válido, o botão parava com "Sem telefone ... Mude o status pela lista de Reservas" e a reserva não
  // mudava. A janela abre sempre; o aviso pelo WhatsApp é a caixa dela (marcada quando há telefone). Os textos vêm de
  // utils/whatsappTemplates (a confirmação é a mesma do botão "Enviar confirmação no WhatsApp").
  const prepareWhatsAppMessage = (action: StatusAction) => {
    if (!booking?.id) return;
    const messages: Record<StatusAction, () => string> = {
      confirm: () => bookingConfirmedWhatsAppText(booking),
      cancel: () => bookingCancelledWhatsAppText(booking),
      on_the_way: () => crewOnTheWayWhatsAppText(booking),
    };
    if (action === 'cancel') {
      setCancelMode('cancel');
      // Rascunho nunca enviado: o cliente não viu a proposta, então a caixa do aviso começa desmarcada.
      setNotifyOnCancel(booking.status !== 'DRAFT');
    }
    setMarkPayment(true);
    setWppAction(action);
    setWppMessage(messages[action]());
    // Contato da reserva antes do cadastro, já com DDI: sem o 55, o wa.me abria outro país (31 é a
    // Holanda). Ver utils/bookingContact. null: sem telefone, só o status muda.
    setWppContact(toWhatsAppNumber(bookingPhone(booking)));
    setWppModalOpen(true);
  };

  // P14 parte 2: "Pedir avaliação no Google". O WhatsApp já abriu no clique (StageWhatsAppPanel); aqui o pedido é
  // registrado no servidor sem segurar nada. Deu certo: a ficha mostra "Avaliação pedida em <data>" e o Histórico
  // recarrega. Falhou: o aviso diz que o WhatsApp abriu mas o pedido não ficou registrado.
  const handleReviewRequested = () => {
    if (!booking?.id) return;
    bookingAPI
      .requestReview(booking.id)
      .then((res) => {
        const requestedAt = (res.data as { reviewRequestedAt?: string } | undefined)?.reviewRequestedAt;
        if (requestedAt) setBooking((current) => (current ? { ...current, reviewRequestSentAt: current.reviewRequestSentAt || requestedAt } : current));
        setProposalHistoryKey((key) => key + 1);
      })
      .catch(() => {
        addNotification({ type: 'error', title: 'Pedido não registrado', message: 'O WhatsApp abriu, mas o pedido de avaliação não ficou registrado na reserva. Tente de novo.' });
      });
  };

  // Orçamento em PDF (13/11/2026): "Baixar orçamento (PDF)" baixa o orçamento que o servidor gera na hora, a partir da
  // reserva atual: o mesmo que o cliente baixa pelo link da proposta e pela área do cliente. Antes era um PDF de uso
  // interno montado aqui no navegador (jsPDF), com outro visual e outra conta de datas e validade.
  const handleDownloadBookingPdf = async () => {
    if (!booking?.id) return;
    try {
      setGeneratingPdf(true);
      await quotePdfAPI.forAdmin(booking.id);
    } catch (err: unknown) {
      addNotification({ type: 'error', title: 'Erro no PDF', message: err instanceof Error && err.message ? err.message : 'Não foi possível baixar o orçamento.' });
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Auditoria do orçamento (12/11/2026), E8: saiu o "PDF + WhatsApp" (o PDF anexado na conversa ficava parado no valor
  // do dia; o link da proposta mostra sempre a reserva atual). Ver triggerProposalSend.
  // ─────────────────────────────────────────────────────────────────────────────

  // Anexos: o upload ficava inline no JSX; a lixeira de cada anexo não tinha ação (o backend já
  // tem DELETE /bookings/:id/attachments/:attachmentId).
  // D21 (aprovada em 02/11/2026): cada arquivo vai direto para a reserva e fica privado (antes subia por /upload/image,
  // público e com link eterno). Mesmas regras do cliente: JPG, PNG, WebP ou PDF até 10 MB.
  const handleUploadAttachments = async (files: FileList | null) => {
    if (!booking?.id || !files || !files.length) return;
    const bookingId = booking.id;
    const selected = Array.from(files);
    try {
      setUploading(true);
      let sent = 0;
      for (const file of selected) {
        const problem = attachmentFileProblem(file);
        if (problem) {
          addNotification({ type: 'error', title: `"${file.name}" não foi anexado`, message: problem });
          continue;
        }
        try {
          await uploadBookingAttachment(bookingId, file);
          sent += 1;
        } catch (error) {
          addNotification({ type: 'error', title: `"${file.name}" não foi anexado`, message: attachmentUploadErrorMessage(error) });
        }
      }
      if (sent > 0) {
        await fetchBooking();
        addNotification({ type: 'success', title: 'Anexos enviados', message: 'Os arquivos foram anexados à reserva.' });
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // D21: link de 5 minutos pedido no clique; a janela nasce antes da espera (senão o navegador a bloqueia).
  const handleOpenAttachment = (attachmentId: string) => {
    if (!booking?.id) return;
    void openBookingAttachment(bookingAttachmentFilePath(booking.id, attachmentId)).catch(() => {
      addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível abrir o anexo. Tente novamente.' });
    });
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
    // Auditoria do orçamento (12/11/2026), E1–E3: os serviços que vêm no kit (logística, roadie, técnicos) entram na
    // lista: são trabalho da equipe (a escala usa a lista só para sugerir quem chamar) e já estão no preço do kit.
    // Conferência de 07/11/2026: booking.services são os serviços do cadastro ligados à reserva (o técnico marcado
    // no pedido, os da Proposta Rápida), sem itemType: o process acima os ignorava, e a seção dizia "Nenhum serviço
    // nesta reserva" com o técnico nos itens.
    booking.services?.forEach((s) => {
      if (s?.name) services.add(s.name);
    });
    return Array.from(services);
  }, [booking]);

  // Serviços que vêm só pelo kit (não ligados à reserva à parte): a ficha marca "Incluso no kit", para ninguém achar
  // que são cobrados de novo.
  const kitOnlyServices = useMemo(() => {
    const names = new Set<string>();
    const fromKit = (items: unknown[] | undefined) => (items || []).forEach((item) => {
      const name = (item as { service?: { name?: string } } | null)?.service?.name;
      if (name) names.add(name);
    });
    fromKit(booking?.kit?.items);
    booking?.kits?.forEach((k) => fromKit(k.items || ('kit' in k ? k.kit?.items : undefined)));
    booking?.services?.forEach((s) => { if (s?.name) names.delete(s.name); });
    return names;
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
  // Auditoria completa (19/11/2026): o aceite não muda o status, e o "Reenviar"/"Gerar novo link" seguiam na ficha da
  // reserva aceita; o link novo derrubava o link do contrato. O servidor recusa (409 PROPOSAL_CONTRACT_ACCEPTED) e a ficha
  // tira o envio da proposta quando o cliente já respondeu o contrato.
  const contractAnswered = booking.contractSummary?.state === 'ACCEPTED' || booking.contractSummary?.state === 'WITHDRAWN';
  const canSendProposal = canConfirm && !contractAnswered;
  // Onda 2 (D6): com o contrato aceito e o pagamento ainda não registrado, confirmar pergunta "registrar o sinal".
  const contractAccepted = booking.contractSummary?.state === 'ACCEPTED';
  const askPayment = contractAccepted && booking.paymentStatus !== 'PARTIAL' && booking.paymentStatus !== 'PAID';
  const isClosed = status === 'CANCELLED' || status === 'REFUNDED';
  const deliveryIndex = DELIVERY_STATUS_OPTIONS.findIndex((o) => o.value === (booking.deliveryStatus || 'PENDING'));
  const eventDate = booking.eventDate ? new Date(booking.eventDate) : null;
  // Onda 2 (D4 e D5): o dia do evento já chegou (dia de Brasília) e o evento já terminou.
  const eventDayReached = eventDate ? brasiliaDayKey.format(eventDate) <= brasiliaDayKey.format(new Date()) : false;
  const eventEnd = booking.eventEndDate ? new Date(booking.eventEndDate) : null;
  const eventEnded = eventEnd ? eventEnd.getTime() < Date.now() : false;
  const clientName = booking.client?.name || booking.client?.user?.name || booking.clientName || 'Cliente sem nome';
  // O mesmo contato que os botões de WhatsApp e o PDF usam (ver utils/bookingContact).
  const clientPhone = bookingPhone(booking);
  const clientEmail = bookingEmail(booking);
  // Auditoria do orçamento (12/11/2026), O14/C4: as mesmas linhas que o cliente vê (itens, frete, pedágio, cupom e
  // ajuste), da mesma função de preço (pricing da API).
  const pricing = bookingPricing(booking);
  const eventWhen = eventWhenText(booking.eventDate, booking.eventEndDate);
  const eventDuration = eventDurationText(booking.eventDate, booking.eventEndDate);
  const venue = venueAnswers(booking);
  const kitEntries = booking.kits && booking.kits.length > 0 ? booking.kits : (booking.kit ? [booking.kit] : []);
  const equipmentEntries = booking.equipments || [];
  // 18/11/2026: o pedido do briefing chega sem itens do catálogo, e a edição mostra os itens só para leitura: não havia
  // como pôr kit e equipamentos nele. "Montar orçamento" abre a Proposta Rápida com esta reserva, e salvar troca os itens
  // dela. Só com a proposta em aberto, fora do histórico e sem contrato aceito (a mesma regra do servidor).
  const canBuildQuote = !itemsLockedReason(booking);
  const hasItems = (booking.items?.length ?? 0) > 0;
  const openQuoteBuilder = () => navigate(proposalForBookingPath(booking.id));

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
            {/* Orçamento em PDF (13/11/2026): o orçamento do servidor, o mesmo do link da proposta e da área do cliente. */}
            <Button variant="outline" size="sm" onClick={handleDownloadBookingPdf} isLoading={generatingPdf} leftIcon={<FileText className="h-4 w-4" />} title="O mesmo orçamento que o cliente baixa pelo link da proposta e pela área do cliente, gerado agora a partir da reserva.">
              Baixar orçamento (PDF)
            </Button>
            {/* E8: no lugar do "PDF + WhatsApp". Só com a proposta em aberto (rascunho ou pendente): é quando o servidor
                aceita o envio e o link abre. Sem telefone válido, desligado (o "Enviar proposta" do cartão manda o e-mail). */}
            {canSendProposal && (
              <Button variant="outline" size="sm" onClick={triggerProposalSend} disabled={!toWhatsAppNumber(clientPhone)} leftIcon={<MessageSquare className="h-4 w-4" />} title="O mesmo envio do botão Enviar proposta: registra o envio, manda o e-mail (se a reserva tiver e-mail) e abre a janela com o WhatsApp.">
                Enviar link pelo WhatsApp
              </Button>
            )}
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
                {/* D11 (aprovada em 02/11/2026): link seguro da proposta, e-mail pela fila e WhatsApp com o mesmo link. O
                    painel já mostra o último envio (valor e validade) e o aviso "A reserva mudou depois do último envio"
                    (proposal.changedSinceSent): a ficha não repete o aviso. E8: o "Enviar link pelo WhatsApp" do
                    cabeçalho e a vinda da Proposta Rápida usam o botão de envio dele (sendButtonRef). */}
                {canSendProposal ? (
                  <SendProposalPanel
                    booking={booking}
                    sendButtonRef={proposalSendButtonRef}
                    onSent={() => {
                      setProposalHistoryKey((key) => key + 1);
                      void fetchBooking();
                      // P3: com a proposta enviada, o pedido do cliente já foi respondido e sai do número do menu.
                      void refreshAdminSummary({ force: true });
                    }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    O cliente já respondeu o contrato: a proposta não é reenviada, e o link do contrato continua o mesmo (veja o cartão do contrato).
                  </p>
                )}
                <Button
                  fullWidth
                  size="sm"
                  onClick={() => { setConfirmPrice(String(booking.totalPrice || '')); setMarkPayment(true); fetchAvailableCollaborators().then(() => setConfirmModalOpen(true)); }}
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
                <NotifyClientCheckbox checked={notifyClient} onChange={setNotifyClient} hasEmail={Boolean(clientEmail)} />
              </div>
            ) : (
              // Antes mandava usar o Editar, que nunca gravou o status (e agora nem o mostra).
              <p className="text-sm text-muted-foreground">
                {/* Auditoria do status (21/11/2026): na cancelada, o cartão Logística não tem ações; reabrir e reembolso
                    ficam no seletor da lista, que só oferece as trocas que valem. */}
                {status === 'REFUNDED'
                  ? `Reserva reembolsada${refundText(booking)}. Se o reembolso foi um engano, volte para Cancelada na lista de Reservas.`
                  : isClosed
                    ? `Reserva ${bookingStatusLabel(status).toLowerCase()}. Para reabrir como Pendente ou registrar o reembolso, use a lista de Reservas.`
                    : `Reserva ${bookingStatusLabel(status).toLowerCase()}. Para mudar o status, use os botões de Logística ou a lista de Reservas.`}
              </p>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Logística</h3>
            {/* Teste de ponta a ponta (21/11/2026): a reserva cancelada seguia com "Cancelar reserva" e "Avisar: equipe a
                caminho". Cancelada, estornada ou concluída, não há entrega nem cancelamento a fazer por aqui. */}
            {isClosed || status === 'COMPLETED' ? (
              <p className="text-sm text-muted-foreground">
                Reserva {bookingStatusLabel(status).toLowerCase()}: sem ações de logística.
              </p>
            ) : (
              <div className="space-y-2">
                {/* Onda 2 (D4): o evento que já terminou e segue confirmado (ou em andamento) fica fora do faturamento até
                    alguém concluir; nada conclui sozinho (a conclusão manda o pedido de avaliação). */}
                {eventEnded && (status === 'CONFIRMED' || status === 'IN_PROGRESS') && (
                  <Alert variant="warning" title="O evento já passou" description="Marque como concluída para ele entrar no faturamento." />
                )}
                {/* D5: "Iniciar evento" a partir do dia do evento (dia de Brasília), só da reserva confirmada. */}
                {status === 'CONFIRMED' && eventDayReached && !eventEnded && (
                  <Button variant="outline" size="sm" fullWidth className="justify-start" onClick={() => setStartModalOpen(true)} leftIcon={<Truck className="h-4 w-4 text-success" />}>
                    Iniciar evento
                  </Button>
                )}
                {/* Auditoria do status (21/11/2026), B1: "equipe a caminho" só com o evento confirmado (ou em andamento) e
                    a entrega ainda no começo; antes aparecia em Rascunho e Pendente e voltava "No local" para "A caminho". */}
                {(status === 'CONFIRMED' || status === 'IN_PROGRESS') && ['PENDING', 'PREPARING'].includes(booking.deliveryStatus || 'PENDING') && (
                  <Button variant="outline" size="sm" fullWidth className="justify-start" onClick={() => prepareWhatsAppMessage('on_the_way')} leftIcon={<Truck className="h-4 w-4 text-info" />}>
                    Avisar: equipe a caminho
                  </Button>
                )}
                {(status === 'CONFIRMED' || status === 'IN_PROGRESS') && (
                  <Button variant="outline" size="sm" fullWidth className="justify-start" onClick={() => setCompleteModalOpen(true)} leftIcon={<CheckCircle2 className="h-4 w-4 text-success" />}>
                    Marcar como concluída
                  </Button>
                )}
                <Button variant="outline" size="sm" fullWidth className="justify-start text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => prepareWhatsAppMessage('cancel')} leftIcon={<XCircle className="h-4 w-4" />}>
                  Cancelar reserva
                </Button>
              </div>
            )}
          </Card>

          {/* P14 parte 2: botões de WhatsApp da etapa (pedido do cliente, confirmada, concluída), com texto pronto; o
              cartão só aparece nessas etapas. */}
          <StageWhatsAppPanel booking={booking} onReviewRequested={handleReviewRequested} />
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
                      {/* Auditoria do orçamento (12/11/2026), D13: início e término no horário de Brasília. */}
                      <p className="text-sm font-semibold text-foreground">
                        {eventWhen || 'Data não informada'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* D11: a duração sai das datas. Antes: "Duração Estimada: 4h" inventado quando não havia duração. */}
                    {eventDuration !== '-' ? (
                      <Badge variant="outline">Duração: {eventDuration}</Badge>
                    ) : (
                      booking.estimatedDuration && <Badge variant="outline">Duração estimada: {booking.estimatedDuration}</Badge>
                    )}
                    {eventDate && isToday(eventDate) && <Badge variant="success">Evento hoje</Badge>}
                  </div>
                  {/* Auditoria do orçamento (12/11/2026), O25: a hora da montagem e as respostas de acesso do cliente
                      (com "Não sei" como ele marcou); sem resposta escrita, o sim/não do cadastro, que a equipe vê. */}
                  <section aria-labelledby="ficha-montagem-acesso" className="space-y-2">
                    <h4 id="ficha-montagem-acesso" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Montagem e acesso</h4>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                      {[{ label: 'Montagem a partir de', value: venue.setup || 'Não informado' }, ...venue.rows].map((r) => (
                        <div key={r.label} className="contents">
                          <dt className="text-muted-foreground">{r.label}</dt>
                          <dd className="min-w-0 break-words font-medium text-foreground">{r.value}</dd>
                        </div>
                      ))}
                    </dl>
                    {venue.rows.length > 0 && venue.rows.every((r) => !r.answered) && (
                      <p className="text-xs text-muted-foreground">Valores do cadastro da reserva: o cliente não respondeu estas perguntas pelo site.</p>
                    )}
                  </section>
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
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <Layers className="text-primary h-6 w-6" />
                  <h3 className="text-lg font-bold text-foreground">Itens da reserva</h3>
                </div>
                {canBuildQuote && (
                  <Button size="sm" variant={hasItems ? 'outline' : 'primary'} onClick={openQuoteBuilder} leftIcon={<Plus className="h-4 w-4" />}>
                    {hasItems ? 'Refazer orçamento' : 'Montar orçamento'}
                  </Button>
                )}
              </div>
              {canBuildQuote && !hasItems && (
                <p className="-mt-3 mb-6 text-sm text-muted-foreground">
                  Esta reserva ainda não tem itens. Use "Montar orçamento" para pôr kit, equipamentos, serviços e frete; depois envie a proposta.
                </p>
              )}

              {/* Auditoria do orçamento (12/11/2026), O14/C4: a reserva só de equipamentos dizia "Nenhum kit" e "Nenhum
                  serviço", como se estivesse vazia: os equipamentos não apareciam. */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border pb-2">Kits</h4>
                  <div className="space-y-3">
                    {kitEntries.length > 0 ? (
                      kitEntries.map((k, idx) => (
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
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border pb-2">Equipamentos</h4>
                  <div className="space-y-3">
                    {equipmentEntries.length > 0 ? (
                      equipmentEntries.map((e, idx) => (
                        <div key={e.id ?? idx} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border">
                          <div className="h-10 w-10 shrink-0 rounded-xl bg-card border border-border flex items-center justify-center">
                            <Package className="text-muted-foreground" size={18} />
                          </div>
                          <p className="flex-1 min-w-0 text-sm font-semibold text-foreground truncate">{e.name || 'Equipamento sem nome'}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum equipamento avulso nesta reserva.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border pb-2">Serviços</h4>
                  <div className="space-y-2">
                    {requiredServices.length > 0 ? (
                      requiredServices.map((s, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-3 p-3 rounded-2xl border border-border">
                          <Zap size={14} className="text-primary shrink-0" />
                          <span className="text-sm font-semibold text-foreground">{s}</span>
                          {kitOnlyServices.has(s) && <Badge variant="outline" size="sm">Incluso no kit</Badge>}
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
                {/* Este fluxo grava por /confirm-details, que também CONFIRMA a reserva pendente — o rótulo diz isso.
                    Auditoria do status (21/11/2026), C1: na reserva cancelada ou reembolsada o botão sai (ele a voltava
                    para Confirmada e mandava "Reserva confirmada" ao cliente, sem a caixa de aviso). Já confirmada, em
                    andamento ou concluída, ele só aloca. */}
                {!isClosed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setMarkPayment(true); fetchAvailableCollaborators().then(() => setEventModalOpen(true)); }}
                    leftIcon={<Users size={16} />}
                  >
                    {canConfirm ? 'Alocar equipe e confirmar' : 'Alocar equipe'}
                  </Button>
                )}
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
                  accept={ATTACHMENT_ACCEPT}
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

              <p className="text-xs text-muted-foreground mb-4">{ATTACHMENT_RULE_TEXT}. Só o admin e o cliente da reserva abrem.</p>
              {/* D21: sem miniatura. O arquivo é privado (nada de <img> com endereço do Cloudinary): ícone, nome e
                  "Abrir", que pede o link de 5 minutos. */}
              {booking.attachments && booking.attachments.length > 0 ? (
                <ul className="space-y-2">
                  {booking.attachments.map((a, idx) => (
                    <li key={a.id ?? idx} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{a.filename || 'Anexo'}</p>
                          {a.createdAt && (
                            <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString('pt-BR')}</p>
                          )}
                        </div>
                      </div>
                      {a.id && (
                        <div className="flex shrink-0 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAttachment(a.id!)}
                            leftIcon={<ExternalLink size={14} />}
                            aria-label={`Abrir ${a.filename || 'anexo'}`}
                          >
                            Abrir
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => setAttachmentToDelete(a.id!)}
                            aria-label={`Excluir ${a.filename || 'anexo'}`}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
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
                  {/* Auditoria do orçamento (12/11/2026), O3: "Em preparação" no pedido ainda sem valor, como no cliente. */}
                  <p className="text-3xl font-bold break-words">{formatBookingTotal(pricing.total)}</p>
                  <p className="mt-3 inline-flex items-center rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-2.5 py-0.5 text-xs font-semibold">
                    Pagamento: {formatBookingPaymentStatus(booking.paymentStatus)}
                  </p>
                </div>
                <div className="p-4 sm:p-6 space-y-6">
                  {/* O14/C4: as linhas da proposta como o cliente vê (página do cliente, link e PDFs): itens, frete,
                      pedágio, desconto do cupom e ajuste no valor final. Antes, só o total. */}
                  {(pricing.lines.length > 0 || pricing.couponDiscount) && (
                    <div className="space-y-2 text-sm">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">O que o cliente vê</h4>
                      {pricing.lines.length > 0 && (
                        <ul className="space-y-2" aria-label="Linhas da proposta">
                          {pricing.lines.map((line, idx) => (
                            <li key={idx} className="flex justify-between gap-3">
                              <span className="text-muted-foreground min-w-0 break-words">
                                {line.quantity > 1 ? `${line.quantity}× ` : ''}{line.description}
                              </span>
                              <span className="font-medium text-foreground shrink-0">{formatPricingLineTotal(line)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {pricing.couponDiscount && (
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Desconto{pricing.couponDiscount.code ? ` (${pricing.couponDiscount.code})` : ''}:</span>
                          <span className="font-medium text-foreground shrink-0">− {formatPrice(pricing.couponDiscount.amount)}</span>
                        </div>
                      )}
                      {pricing.adjustment !== 0 && (
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Ajuste no valor final:</span>
                          <span className="font-medium text-foreground shrink-0">{pricing.adjustment < 0 ? '− ' : '+ '}{formatPrice(Math.abs(pricing.adjustment))}</span>
                        </div>
                      )}
                      <div className="flex justify-between gap-3 border-t border-border pt-2 font-semibold">
                        <span className="text-foreground">Total:</span>
                        <span className="text-foreground shrink-0">{formatBookingTotal(pricing.total)}</span>
                      </div>
                      {toArrangeNote(pricing.lines) && <p className="text-xs text-muted-foreground">{toArrangeNote(pricing.lines)}</p>}
                    </div>
                  )}
                  <BookingFinancialSummary booking={booking} />
                </div>
              </Card>
            )}

            {/* Aceite online (13/11/2026): o contrato aceito pelo site (quem aceitou, documento, IP, navegador,
                impressão digital, PDF, reenvio do e-mail e a trilha). Só admin; sem contrato, nada aparece. */}
            {user?.role === 'ADMIN' && booking.id && booking.contractSummary && (
              <AdminContractCard bookingId={booking.id} summary={booking.contractSummary} />
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
                {booking.id && <ProposalHistory bookingId={booking.id} refreshKey={proposalHistoryKey} />}
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
                  {canBuildQuote && !hasItems && (
                    <Button size="sm" className="mt-4" onClick={openQuoteBuilder} leftIcon={<Plus className="h-4 w-4" />}>
                      Montar orçamento a partir do briefing
                    </Button>
                  )}
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
        onConfirm={async (reason) => {
          // Auditoria do status (21/11/2026), M7: a troca que falhou deixa a janela aberta (o aviso diz o motivo) e o
          // WhatsApp não abre.
          if (!booking?.id) return false;
          const ok = await handleStatusChange(booking.id, STATUS_ACTIONS[wppAction].status, reason);
          if (!ok) return false;
          setWppModalOpen(false);
          return true;
        }}
        // A desistência registrada não pede motivo (o contrato guarda o da desistência).
        askReason={wppAction === 'cancel' && !(contractAccepted && cancelMode === 'withdraw')}
        extra={
          wppAction === 'cancel' ? (
            <CancelChoices
              contractAccepted={contractAccepted}
              withdrawUntil={booking.contractSummary?.withdrawUntil ?? null}
              mode={cancelMode}
              onModeChange={setCancelMode}
              notifyClient={notifyOnCancel}
              onNotifyChange={setNotifyOnCancel}
              hasEmail={Boolean(clientEmail)}
            />
          ) : wppAction === 'confirm' && askPayment ? (
            <MarkPaymentCheckbox checked={markPayment} onChange={setMarkPayment} />
          ) : undefined
        }
        title={STATUS_ACTIONS[wppAction].title}
        confirmText={STATUS_ACTIONS[wppAction].confirmText}
        variant={STATUS_ACTIONS[wppAction].variant}
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
              label="Valor final, com frete e pedágio (R$)"
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
          <NotifyClientCheckbox checked={notifyClient} onChange={setNotifyClient} hasEmail={Boolean(clientEmail)} />
          {askPayment && <MarkPaymentCheckbox checked={markPayment} onChange={setMarkPayment} />}
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
          // Salvar aqui também confirma a reserva pendente (/confirm-details): as caixas aparecem só nesse caso (a do sinal,
          // com contrato aceito, como em "Confirmar reserva": revisão da onda 2).
          footerExtra={
            canConfirm ? (
              <div className="space-y-2">
                <NotifyClientCheckbox checked={notifyClient} onChange={setNotifyClient} hasEmail={Boolean(clientEmail)} />
                {askPayment && <MarkPaymentCheckbox checked={markPayment} onChange={setMarkPayment} />}
              </div>
            ) : undefined
          }
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
              const res = await bookingAPI.confirmWithDetails(booking.id, {
                collaborators: payload,
                ...notifyClientPayload(notifyClient),
                ...(canConfirm && askPayment && markPayment ? { markInitialPaymentReceived: true } : {}),
              });
              warnPreReservation(res?.data);
              void refreshAdminSummary({ force: true }); // P3: salvar a equipe confirma a reserva pendente.
              await fetchBooking();
              setEventModalOpen(false);
              // B5: só a reserva pendente é confirmada por aqui; nas outras, só a equipe muda.
              addNotification({ type: 'success', title: 'Equipe salva', message: canConfirm ? 'Equipe alocada e reserva confirmada.' : 'Equipe alocada.' });
            } catch (e: unknown) {
              addNotification({ type: 'error', title: 'Erro ao salvar equipe', message: serverMessage(e, 'Não foi possível salvar a equipe.') });
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
            // Auditoria do orçamento (12/11/2026): a edição pode mudar o que o link mostra; o Histórico recarrega para
            // marcar o envio que ficou para trás.
            onSuccess={() => { setEditModalOpen(false); fetchBooking(); setProposalHistoryKey((key) => key + 1); }}
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
        isOpen={isStartModalOpen}
        onClose={() => setStartModalOpen(false)}
        onConfirm={async () => {
          setStartModalOpen(false);
          if (booking.id) await handleStatusChange(booking.id, 'IN_PROGRESS');
        }}
        title="Iniciar o evento?"
        message="A reserva passa para Em andamento. O cliente não recebe nenhum aviso por isso."
        variant="success"
        isLoading={actionLoading}
        confirmText="Iniciar"
        cancelText="Voltar"
      />

      <ConfirmModal
        isOpen={isCompleteModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        onConfirm={async () => {
          setCompleteModalOpen(false);
          if (booking.id) await handleStatusChange(booking.id, 'COMPLETED');
        }}
        title="Marcar como concluída?"
        message="O evento fica como concluído. O cliente recebe o pedido de avaliação e, se a reserva usou um código de indicação, quem indicou ganha o cupom de recompensa. Voltar o status depois não desfaz isso."
        variant="success"
        isLoading={actionLoading}
        confirmText="Concluir"
        cancelText="Voltar"
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
