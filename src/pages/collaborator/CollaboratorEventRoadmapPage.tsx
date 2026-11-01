import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { CollaboratorLoading, CollaboratorError } from '../../components/collaborator/CollaboratorStates';
import { CollaboratorTabs, CollaboratorTabPanel } from '../../components/collaborator/CollaboratorTabs';
import { collaboratorProfileAPI, collaboratorMessagesAPI, uploadAPI } from '../../services/api';
import { SimpleCard } from '../../components/ui/Cards';
import { Badge } from '../../components/ui/Badge';
import { Button, buttonVariants } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { StandardVariant } from '../../components/ui/StandardTypes';
import { formatPrice } from '@/utils/formatPrice';
import { bookingStatusLabel } from '@/utils/bookingStatus';
import {
  Calendar,
  MapPin,
  Users,
  FileText,
  Clock,
  MessageSquare,
  Send,
  ArrowLeft,
  ExternalLink,
  Info,
  CheckCircle2,
  Circle,
  Phone,
  Navigation,
  Receipt,
  Plus,
  Camera,
  X,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { logger } from '../../utils/logger';
import { cn } from '../../utils/cn';

interface RoadmapTask {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
}

interface RoadmapExpense {
  id: string;
  description: string;
  amount: number;
  createdAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface RoadmapChatMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface RoadmapChat {
  id: string;
  messages?: RoadmapChatMessage[];
}

interface RoadmapEventCollaborator {
  collaborator: {
    userId?: string;
    user: {
      id?: string;
      name: string;
      avatarUrl?: string;
    };
  };
  function?: { name?: string };
  totalPayment?: number;
  status?: string;
  startTime?: string;
  endTime?: string;
}

interface RoadmapBooking {
  id: string;
  userId?: string;
  status?: string;
  eventTitle?: string;
  eventDate: string;
  eventEndDate?: string;
  setupTime?: string | null;
  pickupTime?: string | null;
  city?: string;
  street?: string;
  addressNumber?: string;
  state?: string;
  location?: string;
  locationUrl?: string;
  venueContactName?: string;
  venueContactPhone?: string;
  technicalRider?: string;
  technicalRiderUrl?: string;
  tasks?: RoadmapTask[];
  expenses?: RoadmapExpense[];
  eventCollaborators?: RoadmapEventCollaborator[];
  chats?: RoadmapChat[];
}

type RoadmapTab = 'roadmap' | 'checklist' | 'logistics' | 'rider' | 'team' | 'chat';

const LAYOUT_TITLE = 'Roteiro do Evento';
const BREADCRUMBS = [
  { name: 'Colaborador', href: '/colaborador/painel' },
  { name: 'Agenda', href: '/colaborador/agenda' },
  { name: 'Roteiro' },
];

// Status da SUA escala no evento (enum EventCollaboratorStatus do backend).
const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'Escalado',
  CONFIRMED: 'Confirmado',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não compareceu',
};

const EXPENSE_STATUS: Record<RoadmapExpense['status'], { label: string; variant: StandardVariant }> = {
  PENDING: { label: 'Pendente', variant: 'warning' },
  APPROVED: { label: 'Aprovado', variant: 'success' },
  REJECTED: { label: 'Recusado', variant: 'destructive' },
};

const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const formatDate = (date: Date) => date.toLocaleDateString('pt-BR');

const initials = (name?: string) =>
  (name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');

const Avatar: React.FC<{ name?: string; src?: string; className?: string }> = ({ name, src, className }) =>
  src ? (
    <img src={src} alt={name ? `Foto de ${name}` : ''} className={cn('rounded-xl object-cover', className)} />
  ) : (
    <div className={cn('rounded-xl bg-primary/10 text-primary font-semibold flex items-center justify-center', className)} aria-hidden="true">
      {initials(name)}
    </div>
  );

const CollaboratorEventRoadmapPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [booking, setBooking] = useState<RoadmapBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeTab, setActiveTab] = useState<RoadmapTab>('roadmap');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [alerting, setAlerting] = useState(false);

  // Expense Form State
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Socket.IO Integration
  const { on, emit, isConnected } = useSocket(id ? `event:${id}` : undefined);

  // Listen for real-time updates
  useEffect(() => {
    if (!isConnected) return;

    const cleanupMessage = on('new_message', (newMessage) => {
      const msg = newMessage as RoadmapChatMessage;
      setBooking((prev) => {
        if (!prev || !prev.chats?.[0]) return prev;
        const chat = prev.chats[0];
        // Evita duplicados se o remetente for eu (já add localmente ou via refetch)
        const exists = chat.messages?.some((m) => m.id === msg.id);
        if (exists) return prev;

        return {
          ...prev,
          chats: [{
            ...chat,
            messages: [...(chat.messages || []), msg]
          }]
        };
      });
    });

    const cleanupTask = on('task_updated', (updatedTask) => {
      const task = updatedTask as RoadmapTask;
      setBooking((prev) => {
        if (!prev || !prev.tasks) return prev;
        return {
          ...prev,
          tasks: prev.tasks.map((t) => t.id === task.id ? task : t)
        };
      });
    });

    return () => {
      cleanupMessage();
      cleanupTask();
    };
  }, [isConnected, on]);

  const fetchRoadmap = React.useCallback(async () => {
    try {
      if (!id) return;
      setLoadError(false);
      // "Tentar de novo" mostrava "Evento não encontrado" até a resposta chegar
      setLoading(true);
      const resp = await collaboratorProfileAPI.getEventRoadmap(id);
      const data = (resp.data?.data || resp.data) as RoadmapBooking;
      setBooking(data);

      // Entrar na sala do chat especificamente se houver chat
      if (data.chats?.[0]?.id) {
        emit('join_chat', data.chats[0].id);
      }
    } catch (error) {
      logger.error('Erro ao carregar roadmap:', 'CollaboratorEventRoadmapPage', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [id, emit]);

  useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, booking?.chats]);

  // Achado (auditoria): a "sua" escala e as "suas" mensagens eram identificadas comparando com
  // booking.userId — o CLIENTE dono da reserva. O cachê aparecia R$ 0,00 e as mensagens do cliente
  // apareciam como suas. O certo é o usuário logado.
  const myCollaboratorData = booking?.eventCollaborators?.find(
    (c) => (c.collaborator.userId ?? c.collaborator.user.id) === user?.id
  );

  // Achado (auditoria): o cronograma era uma lista fixa (08h chegada … 22h finalização), igual para
  // todo evento. Agora sai dos horários reais da reserva e da sua escala; só aparece o que existe.
  const timeline = useMemo(() => {
    if (!booking) return [];
    const items: Array<{ date: Date; title: string; desc: string }> = [];
    const push = (value: string | null | undefined, title: string, desc: string) => {
      if (!value) return;
      const d = new Date(value);
      if (!isNaN(d.getTime())) items.push({ date: d, title, desc });
    };
    const atEventDay = (hhmm?: string) => {
      if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm) || !booking.eventDate) return null;
      const base = new Date(booking.eventDate);
      if (isNaN(base.getTime())) return null;
      const [h, m] = hhmm.split(':').map(Number);
      base.setHours(h, m, 0, 0);
      return base.toISOString();
    };

    push(booking.setupTime, 'Montagem', 'Início da montagem no local');
    push(atEventDay(myCollaboratorData?.startTime), 'Seu horário de início', 'Início da sua escala');
    push(booking.eventDate, 'Início do evento', booking.eventTitle || 'Evento');
    push(booking.eventEndDate, 'Término do evento', 'Encerramento previsto');
    push(atEventDay(myCollaboratorData?.endTime), 'Seu horário de término', 'Fim da sua escala');
    push(booking.pickupTime, 'Desmontagem', 'Recolhimento do equipamento');

    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [booking, myCollaboratorData]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !id || !booking?.chats?.[0]?.id) return;

    setSending(true);
    try {
      const chatId = booking.chats[0].id;
      // Enviamos via API mas o Socket.IO vai emitir para todos na sala
      await collaboratorMessagesAPI.sendMessage(chatId, message);
      setMessage('');
    } catch (error) {
      logger.error('Erro ao enviar mensagem:', 'CollaboratorEventRoadmapPage', error);
      addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível enviar a mensagem.' });
    } finally {
      setSending(false);
    }
  };

  // Achado (auditoria de produto): botão "Alertar Produção" não tinha nenhum onClick.
  // Reaproveita o chat do evento — os admins são sempre participantes desse chat (ver
  // chatService.getOrCreateEventChat), então a mensagem urgente chega até a equipe.
  const handleAlertProduction = async () => {
    if (!booking?.chats?.[0]?.id) return;

    setAlerting(true);
    try {
      const chatId = booking.chats[0].id;
      await collaboratorMessagesAPI.sendMessage(
        chatId,
        `🚨 Alerta urgente: preciso de suporte da produção agora para o evento "${booking.eventTitle || id}".`
      );
      addNotification({ type: 'success', title: 'Produção alertada', message: 'Sua mensagem urgente foi enviada para a equipe.' });
    } catch (error) {
      logger.error('Erro ao alertar produção:', 'CollaboratorEventRoadmapPage', error);
      addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível alertar a produção agora.' });
    } finally {
      setAlerting(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    try {
      await collaboratorProfileAPI.toggleTask(taskId, !currentStatus);
      // Update local otimista (será reforçado pelo evento do socket se o backend emitir)
      setBooking((prev) => {
        if (!prev || !prev.tasks) return prev;
        return {
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.id === taskId ? { ...t, isCompleted: !currentStatus } : t
          )
        };
      });
    } catch (error) {
      logger.error('Erro ao alternar tarefa:', 'CollaboratorEventRoadmapPage', error);
      addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível atualizar a tarefa.' });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await uploadAPI.uploadFile(formData);
      setReceiptUrl(resp.data?.url || resp.data);
    } catch (error) {
      logger.error('Erro no upload do recibo:', 'CollaboratorEventRoadmapPage', error);
      addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível enviar a foto do recibo.' });
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !expenseAmount || !expenseDesc) return;

    setSubmittingExpense(true);
    try {
      await collaboratorProfileAPI.addExpense(id, {
        amount: parseFloat(expenseAmount),
        description: expenseDesc,
        receiptUrl
      });
      setExpenseAmount('');
      setExpenseDesc('');
      setReceiptUrl('');
      setShowExpenseForm(false);
      addNotification({ type: 'success', title: 'Reembolso solicitado', message: 'A produção vai analisar sua despesa.' });
      await fetchRoadmap();
    } catch (error) {
      logger.error('Erro ao enviar despesa:', 'CollaboratorEventRoadmapPage', error);
      addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível enviar a despesa.' });
    } finally {
      setSubmittingExpense(false);
    }
  };

  if (loading) {
    return (
      <CollaboratorLayout title={LAYOUT_TITLE} breadcrumbs={BREADCRUMBS}>
        <CollaboratorLoading label="Carregando dados do evento…" />
      </CollaboratorLayout>
    );
  }

  if (loadError) {
    return (
      <CollaboratorLayout title={LAYOUT_TITLE} breadcrumbs={BREADCRUMBS}>
        <CollaboratorError message="Não conseguimos carregar os detalhes deste evento." onRetry={fetchRoadmap} />
      </CollaboratorLayout>
    );
  }

  if (!booking) {
    return (
      <CollaboratorLayout title={LAYOUT_TITLE} breadcrumbs={BREADCRUMBS}>
        <div className="text-center py-20">
          <Info className="w-16 h-16 text-destructive mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-xl font-bold text-foreground">Evento não encontrado</h2>
          <p className="text-muted-foreground mt-2">Não conseguimos localizar os detalhes deste evento.</p>
          <Link to="/colaborador/agenda" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-6')}>
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Voltar à agenda
          </Link>
        </div>
      </CollaboratorLayout>
    );
  }

  const eventDate = new Date(booking.eventDate);
  const pendingTasks = booking.tasks?.filter((t) => !t.isCompleted).length ?? 0;
  const statusText = myCollaboratorData?.status
    ? ASSIGNMENT_STATUS_LABELS[myCollaboratorData.status] ?? myCollaboratorData.status
    : bookingStatusLabel(booking.status);
  const streetLine = [booking.street, booking.addressNumber].filter(Boolean).join(', ');
  const cityLine = [booking.city, booking.state].filter(Boolean).join('/');
  const address = [streetLine, cityLine].filter(Boolean).join(' – ') || booking.location || 'Endereço a definir';
  const mapsQuery = [booking.location, streetLine, booking.city, booking.state].filter(Boolean).join(' ');
  const mapsUrl = booking.locationUrl || (mapsQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}` : '');
  const chatMessages = booking.chats?.[0]?.messages ?? [];

  const tabs = [
    { id: 'roadmap' as const, label: 'Cronograma', icon: Clock },
    { id: 'checklist' as const, label: 'Tarefas', icon: CheckCircle2, count: pendingTasks },
    { id: 'logistics' as const, label: 'Logística', icon: MapPin },
    { id: 'rider' as const, label: 'Rider técnico', icon: FileText },
    { id: 'team' as const, label: 'Equipe', icon: Users },
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
  ];

  return (
    <CollaboratorLayout title={LAYOUT_TITLE} breadcrumbs={BREADCRUMBS}>
      <div className="space-y-6">
        {/* Banner de informações rápidas */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/95 to-primary text-primary-foreground p-5 sm:p-8 rounded-2xl shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 min-w-0">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary-foreground/15 uppercase tracking-wider">
                Reserva #{booking.id.substring(0, 8)}
              </span>
              {/* <h2>: o <h1> da página é o título do layout. */}
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight break-words">{booking.eventTitle || 'Evento X Produções'}</h2>
              <div className="flex flex-wrap gap-2 text-primary-foreground/90 text-sm">
                <span className="flex items-center gap-1.5 bg-primary-foreground/10 px-3 py-1 rounded-full border border-primary-foreground/10">
                  <Calendar className="w-4 h-4" aria-hidden="true" />
                  {formatDate(eventDate)}
                </span>
                <span className="flex items-center gap-1.5 bg-primary-foreground/10 px-3 py-1 rounded-full border border-primary-foreground/10">
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                  {booking.city || 'Local a definir'}
                </span>
                <span className="flex items-center gap-1.5 bg-primary-foreground/10 px-3 py-1 rounded-full border border-primary-foreground/10">
                  <Clock className="w-4 h-4" aria-hidden="true" />
                  {formatTime(eventDate)}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
              <div className="bg-primary-foreground/10 px-5 py-3 rounded-2xl border border-primary-foreground/20 md:text-right">
                <p className="text-xs uppercase opacity-80 font-bold tracking-wider">Cachê estimado</p>
                <p className="text-2xl sm:text-3xl font-black">{formatPrice(myCollaboratorData?.totalPayment || 0)}</p>
              </div>
              {/* Achado: era "Status: Confirmado" fixo para todo evento. */}
              <span className="text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full bg-primary-foreground/15 border border-primary-foreground/20">
                {myCollaboratorData ? 'Sua escala' : 'Reserva'}: {statusText}
              </span>
            </div>
          </div>
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-primary-foreground/5 rounded-full blur-3xl" aria-hidden="true" />
        </section>

        <CollaboratorTabs tabs={tabs} active={activeTab} onChange={setActiveTab} ariaLabel="Seções do evento" idBase="roteiro" />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.15 }}
          >
            <CollaboratorTabPanel idBase="roteiro" id={activeTab}>
              {activeTab === 'roadmap' && (
                <SimpleCard title="Cronograma operacional" description="Horários da reserva e da sua escala">
                  {timeline.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">Nenhum horário definido para este evento.</p>
                  ) : (
                    <ol className="space-y-4 relative before:absolute before:top-0 before:bottom-0 before:left-[17px] before:w-0.5 before:bg-border py-2">
                      {timeline.map((item, i) => {
                        const sameDay = item.date.toDateString() === eventDate.toDateString();
                        return (
                          <li key={i} className="flex gap-4 relative">
                            <div className="relative z-10 w-9 h-9 rounded-full bg-muted flex items-center justify-center border-4 border-card shrink-0">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                            </div>
                            <div className="bg-muted/30 p-4 rounded-2xl flex-1 border border-border">
                              <span className="text-sm font-bold text-primary block">
                                {formatTime(item.date)}{!sameDay && ` · ${formatDate(item.date)}`}
                              </span>
                              <h3 className="font-bold text-foreground">{item.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </SimpleCard>
              )}

              {activeTab === 'checklist' && (
                <SimpleCard
                  title="Tarefas do evento"
                  description="Marque as etapas conforme forem concluídas (opcional)"
                >
                  <div className="space-y-3">
                    {booking.tasks && booking.tasks.length > 0 ? (
                      booking.tasks.map((task) => (
                        <button
                          type="button"
                          key={task.id}
                          onClick={() => handleToggleTask(task.id, task.isCompleted)}
                          aria-pressed={task.isCompleted}
                          className={cn(
                            'w-full flex items-center justify-between gap-3 p-4 rounded-2xl border transition-all text-left',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            task.isCompleted
                              ? 'bg-success/5 border-success/20'
                              : 'bg-muted/30 border-border hover:border-primary/30 hover:bg-primary/5'
                          )}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            {task.isCompleted ? (
                              <CheckCircle2 className="w-6 h-6 shrink-0 text-success" aria-hidden="true" />
                            ) : (
                              <Circle className="w-6 h-6 shrink-0 text-muted-foreground" aria-hidden="true" />
                            )}
                            <div className="min-w-0">
                              <span className={cn('block text-sm font-bold', task.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground')}>
                                {task.title}
                              </span>
                              {task.description && (
                                <span className="block text-sm text-muted-foreground">{task.description}</span>
                              )}
                            </div>
                          </div>
                          {task.isCompleted && <Badge variant="success" size="sm">Concluída</Badge>}
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-12 bg-muted/20 rounded-2xl border-2 border-dashed border-border">
                        <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
                        <p className="text-sm text-muted-foreground">Nenhuma tarefa definida para este evento.</p>
                        <p className="text-sm text-muted-foreground mt-1">As tarefas são configuradas pela produção.</p>
                      </div>
                    )}
                  </div>
                </SimpleCard>
              )}

              {activeTab === 'logistics' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SimpleCard title="Local e contato">
                    <div className="space-y-6">
                      <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-2xl border border-border">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <MapPin className="w-6 h-6 text-primary" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm text-foreground mb-1">Localização do evento</h3>
                          <p className="text-sm text-muted-foreground break-words">{address}</p>
                          {mapsUrl && (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(buttonVariants({ size: 'sm' }), 'mt-4')}
                            >
                              <Navigation className="w-4 h-4" aria-hidden="true" /> Abrir no mapa
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-2xl border border-border">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Phone className="w-6 h-6 text-primary" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm text-foreground mb-1">Contato no local</h3>
                          <p className="text-sm text-muted-foreground">Responsável/equipe do local</p>
                          <div className="flex items-center justify-between gap-3 mt-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground">{booking.venueContactName || 'Equipe do local'}</p>
                              <p className="text-sm text-muted-foreground">{booking.venueContactPhone || 'Fale com a produção'}</p>
                            </div>
                            {booking.venueContactPhone && (
                              <a
                                href={`tel:${booking.venueContactPhone.replace(/\D/g, '')}`}
                                className={buttonVariants({ size: 'icon' })}
                                aria-label={`Ligar para ${booking.venueContactName || 'a equipe do local'}`}
                              >
                                <Phone className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </SimpleCard>

                  <SimpleCard title="Sua logística (reembolsos)" description="Envie comprovantes de despesas pagas por você">
                    <div className="space-y-4">
                      <AnimatePresence>
                        {showExpenseForm ? (
                          <motion.form
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            onSubmit={handleSubmitExpense}
                            className="p-4 sm:p-5 bg-primary/5 border border-primary/20 rounded-2xl space-y-4 overflow-hidden"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <Input
                                size="sm"
                                type="number"
                                step="0.01"
                                min="0"
                                inputMode="decimal"
                                label="Valor total (R$)"
                                value={expenseAmount}
                                onChange={(e) => setExpenseAmount(e.target.value)}
                                placeholder="0,00"
                                required
                              />
                              <Input
                                size="sm"
                                label="Descrição"
                                value={expenseDesc}
                                onChange={(e) => setExpenseDesc(e.target.value)}
                                placeholder="Gasolina, alimentação..."
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <p className="text-sm font-medium text-foreground">Recibo</p>
                              {receiptUrl ? (
                                <div className="flex items-center justify-between gap-2 p-2 bg-success/10 border border-success/30 rounded-xl">
                                  <span className="text-sm font-medium text-success ml-2">Recibo anexado</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setReceiptUrl('')}
                                    aria-label="Remover recibo anexado"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  fullWidth
                                  onClick={() => fileInputRef.current?.click()}
                                  isLoading={uploadingReceipt}
                                  leftIcon={<Camera className="w-4 h-4" />}
                                >
                                  Tirar foto ou enviar arquivo
                                </Button>
                              )}
                              <input
                                type="file"
                                className="sr-only"
                                ref={fileInputRef}
                                accept="image/*"
                                onChange={handleFileUpload}
                                tabIndex={-1}
                                aria-hidden="true"
                              />
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                              <Button
                                type="submit"
                                size="sm"
                                className="flex-1"
                                isLoading={submittingExpense}
                                disabled={uploadingReceipt}
                              >
                                Pedir reembolso
                              </Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => setShowExpenseForm(false)}>
                                Voltar
                              </Button>
                            </div>
                          </motion.form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowExpenseForm(true)}
                            className="w-full p-6 border-2 border-dashed border-primary/30 rounded-2xl text-primary hover:bg-primary/5 transition-all lg:min-h-[140px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <span className="text-center font-bold text-sm">
                              <Plus className="w-8 h-8 mx-auto mb-2" aria-hidden="true" />
                              Solicitar novo reembolso
                            </span>
                          </button>
                        )}
                      </AnimatePresence>

                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                        {(booking.expenses?.length ?? 0) > 0 ? (
                          booking.expenses!.map((expense) => {
                            const status = EXPENSE_STATUS[expense.status] ?? { label: expense.status, variant: 'ghost' as StandardVariant };
                            return (
                              <div key={expense.id} className="flex items-center justify-between gap-3 p-3.5 bg-muted/20 border border-border rounded-2xl">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Receipt className="w-5 h-5 text-primary" aria-hidden="true" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-foreground truncate">{expense.description}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(new Date(expense.createdAt))}</p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-black text-foreground">{formatPrice(expense.amount)}</p>
                                  <Badge variant={status.variant} size="sm" className="mt-1">{status.label}</Badge>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-8 text-center bg-muted/10 rounded-2xl border border-dashed border-border">
                            <Receipt className="w-8 h-8 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
                            <p className="text-sm text-muted-foreground">Nenhuma despesa enviada</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </SimpleCard>
                </div>
              )}

              {activeTab === 'rider' && (
                <SimpleCard title="Especificações técnicas" description="Atenção aos detalhes solicitados pelo cliente">
                  <div className="space-y-6">
                    <div className="p-4 sm:p-6 bg-primary/5 border border-primary/20 rounded-2xl">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="w-6 h-6 text-primary" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-extrabold text-lg text-foreground mb-2">Orientações técnicas</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                            {booking.technicalRider || 'Nenhuma especificação em texto fornecida.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {booking.technicalRiderUrl && (
                      <div className="p-4 sm:p-6 border-2 border-dashed border-border rounded-2xl flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-14 h-14 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <FileText className="w-7 h-7 text-primary" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-black text-foreground">Arquivo do rider oficial</p>
                            <p className="text-sm text-muted-foreground mt-0.5">Abra para baixar e ver os anexos</p>
                          </div>
                        </div>
                        <a
                          href={booking.technicalRiderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        >
                          <ExternalLink className="w-4 h-4" aria-hidden="true" /> Abrir rider
                        </a>
                      </div>
                    )}
                  </div>
                </SimpleCard>
              )}

              {activeTab === 'team' && (
                <SimpleCard title="Equipe operacional" description="Colaboradores escalados para este evento">
                  {(booking.eventCollaborators || []).length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">Nenhum colaborador escalado ainda.</p>
                  ) : (
                    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-2">
                      {(booking.eventCollaborators || []).map((member, i) => (
                        <li key={i} className="p-4 bg-muted/20 border border-border rounded-3xl flex items-center gap-4">
                          <Avatar
                            name={member.collaborator.user.name}
                            src={member.collaborator.user.avatarUrl}
                            className="w-14 h-14 shrink-0 text-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-sm leading-tight text-foreground truncate">{member.collaborator.user.name}</p>
                            <Badge variant="primary" size="sm" className="mt-2">
                              {member.function?.name || 'Colaborador'}
                            </Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </SimpleCard>
              )}

              {activeTab === 'chat' && (
                <div className="h-[min(650px,calc(100dvh-14rem))] min-h-[420px] flex flex-col bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
                  <div className="p-4 sm:p-5 bg-primary text-primary-foreground flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-primary-foreground/15 flex items-center justify-center">
                        <MessageSquare className="w-6 h-6" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="font-black text-sm uppercase tracking-wider">Chat da equipe</h3>
                        <p className="text-xs opacity-80 font-bold">Reserva: {booking.id.substring(0, 8)}</p>
                      </div>
                    </div>
                    {/* Achado: era "Equipe Online" com um ponto piscando fixo. Agora mostra o estado real
                        da conexão em tempo real (useSocket). */}
                    <div className="flex items-center gap-2 bg-primary-foreground/10 px-3 py-1 rounded-full" role="status">
                      <span className={cn('w-2 h-2 rounded-full', isConnected ? 'bg-success' : 'bg-primary-foreground/50')} aria-hidden="true" />
                      <span className="text-xs font-bold">{isConnected ? 'Tempo real ativo' : 'Sem conexão em tempo real'}</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-muted/30" aria-live="polite">
                    {chatMessages.length > 0 ? (
                      chatMessages.map((msg, i) => {
                        const isMe = msg.senderId === user?.id;
                        const sender = booking.eventCollaborators?.find(
                          (c) => (c.collaborator.userId ?? c.collaborator.user.id) === msg.senderId
                        )?.collaborator.user;
                        return (
                          <div key={msg.id || i} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                            <div className={cn('max-w-[85%] flex gap-3 items-end', isMe && 'flex-row-reverse')}>
                              <Avatar
                                name={isMe ? user?.name : sender?.name || 'Produção'}
                                src={isMe ? user?.avatarUrl : sender?.avatarUrl}
                                className="w-9 h-9 shrink-0 text-xs mb-1"
                              />
                              <div className={cn(
                                'shadow-sm text-sm p-3 sm:p-4',
                                isMe
                                  ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-none'
                                  : 'bg-card text-card-foreground border border-border rounded-2xl rounded-bl-none'
                              )}>
                                {!isMe && (
                                  <p className="text-xs font-bold text-muted-foreground mb-1">{sender?.name || 'Produção'}</p>
                                )}
                                <p className="leading-relaxed break-words">{msg.content}</p>
                                <p className={cn('flex items-center gap-1 mt-2 text-xs opacity-80', isMe ? 'justify-end' : 'justify-start')}>
                                  <Clock className="w-3 h-3" aria-hidden="true" />
                                  {formatTime(new Date(msg.createdAt))}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                          <MessageSquare className="w-10 h-10 text-muted-foreground" aria-hidden="true" />
                        </div>
                        <p className="text-sm font-bold text-foreground">Nenhuma mensagem ainda</p>
                        <p className="text-sm text-muted-foreground mt-2 max-w-[260px]">Combine horários, trajes e ajustes técnicos diretamente com o time escalado aqui.</p>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-card border-t border-border flex items-center gap-3">
                    <div className="flex-1">
                      <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Combine tudo com a equipe aqui..."
                        aria-label="Mensagem para a equipe"
                        disabled={!booking.chats?.[0]?.id}
                      />
                    </div>
                    <Button
                      type="submit"
                      size="icon"
                      className="h-12 w-12 shrink-0"
                      disabled={!message.trim() || !booking.chats?.[0]?.id}
                      isLoading={sending}
                      aria-label="Enviar mensagem"
                    >
                      {!sending && <Send className="w-5 h-5" />}
                    </Button>
                  </form>
                </div>
              )}
            </CollaboratorTabPanel>
          </motion.div>
        </AnimatePresence>

        {/* Ações rápidas */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 pt-2">
          <Link to="/colaborador/agenda" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Voltar à agenda
          </Link>
          <div className="flex-1" />
          <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/40 rounded-2xl border border-border">
            <span className="text-sm font-medium text-muted-foreground px-2">Precisa de ajuda agora?</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleAlertProduction}
              isLoading={alerting}
              disabled={!booking?.chats?.[0]?.id}
              leftIcon={<AlertTriangle className="w-4 h-4" />}
            >
              Alertar produção
            </Button>
          </div>
        </div>
      </div>
    </CollaboratorLayout>
  );
};

export default CollaboratorEventRoadmapPage;
