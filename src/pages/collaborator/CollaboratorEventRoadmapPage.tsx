import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { collaboratorProfileAPI, collaboratorMessagesAPI, uploadAPI } from '../../services/api';
import { BrandLoader } from '../../components/ui/BrandLoader';
import { SimpleCard } from '../../components/ui/Cards';
import { formatPrice } from '@/utils/formatPrice';
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
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useSocket } from '../../hooks/useSocket';

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
      name: string;
      avatarUrl?: string;
    };
  };
  function?: { name?: string };
  totalPayment?: number;
}

interface RoadmapBooking {
  id: string;
  userId?: string;
  eventTitle?: string;
  eventDate: string;
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

const CollaboratorEventRoadmapPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<RoadmapBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roadmap' | 'rider' | 'checklist' | 'logistics' | 'team' | 'chat'>('roadmap');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Expense Form State (Restored)
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
      const resp = await collaboratorProfileAPI.getEventRoadmap(id);
      const data = (resp.data?.data || resp.data) as RoadmapBooking;
      setBooking(data);
      
      // Entrar na sala do chat especificamente se houver chat
      if (data.chats?.[0]?.id) {
        emit('join_chat', data.chats[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar roadmap:', error);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !id || !booking?.chats?.[0]?.id) return;

    setSending(true);
    try {
      const chatId = booking.chats[0].id;
      // Enviamos via API mas o Socket.IO vai emitir para todos na sala
      await collaboratorMessagesAPI.sendMessage(chatId, message);
      setMessage('');
      // Não precisamos mais de fetchRoadmap() aqui, o socket tratará o update
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
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
      console.error('Erro ao alternar tarefa:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const resp = await uploadAPI.uploadFile(formData);
      setReceiptUrl(resp.data?.url || resp.data);
    } catch (error) {
      console.error('Erro no upload do recibo:', error);
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
      await fetchRoadmap();
    } catch (error) {
      console.error('Erro ao enviar despesa:', error);
    } finally {
      setSubmittingExpense(false);
    }
  };

  if (loading) {
    return (
      <CollaboratorLayout title="Carregando Roadmap...">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <BrandLoader size="xl" />
          <p className="mt-4 text-muted-foreground animate-pulse">Sincronizando dados do evento...</p>
        </div>
      </CollaboratorLayout>
    );
  }

  if (!booking) {
    return (
      <CollaboratorLayout title="Erro">
        <div className="text-center py-20">
          <Info className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold">Evento não encontrado</h2>
          <p className="text-muted-foreground mt-2">Não conseguimos localizar os detalhes deste evento.</p>
          <Link to="/collaborator/dashboard" className="mt-6 inline-flex items-center text-primary hover:underline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Dashboard
          </Link>
        </div>
      </CollaboratorLayout>
    );
  }

  // const eventChat = booking.chats?.find((c: any) => c.type === 'EVENT'); // Variável não utilizada
  const myCollaboratorData = booking.eventCollaborators?.find((c) => c.collaborator.userId === booking.userId);

  return (
    <CollaboratorLayout 
      title={booking.eventTitle || 'Roadmap do Evento'}
      breadcrumbs={[
        { name: 'Colaborador', href: '/collaborator' },
        { name: 'Dashboard', href: '/collaborator' },
        { name: 'Roadmap' }
      ]}
    >
      <div className="space-y-6">
        {/* Banner de Info Rápida */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/95 to-primary text-primary-foreground p-8 rounded-2xl shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-white/20 uppercase tracking-wider text-white">
                Reserva #{booking.id.substring(0, 8)}
              </span>
              <h1 className="text-3xl font-black tracking-tight">{booking.eventTitle || 'Evento X Produções'}</h1>
              <div className="flex flex-wrap gap-3 text-primary-foreground/90 text-sm">
                <span className="flex items-center gap-1.5 backdrop-blur-sm bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(booking.eventDate).toLocaleDateString('pt-BR')}
                </span>
                <span className="flex items-center gap-1.5 backdrop-blur-sm bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  <MapPin className="w-3.5 h-3.5" />
                  {booking.city || 'Local definir'}
                </span>
                <span className="flex items-center gap-1.5 backdrop-blur-sm bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(booking.eventDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2 shrink-0">
               <div className="bg-white/10 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/20 text-right shadow-inner">
                  <p className="text-[10px] uppercase opacity-70 font-black tracking-widest">Cache Estimado</p>
                  <p className="text-3xl font-black">{formatPrice(myCollaboratorData?.totalPayment || 0)}</p>
               </div>
               <span className="text-[10px] font-black uppercase tracking-tighter px-3 py-1 rounded-full bg-success/30 text-white border border-white/20 backdrop-blur-sm">
                  Status: Confirmado
               </span>
            </div>
          </div>
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-black/5 rounded-full blur-2xl" />
        </div>

        {/* Navegação por Abas */}
        <div className="flex items-center p-1.5 bg-muted/50 backdrop-blur-sm rounded-2xl gap-1 overflow-x-auto max-w-full no-scrollbar border border-border/50 shadow-inner">
          {([
            { id: 'roadmap', label: 'Timeline', icon: Clock },
            { id: 'checklist', label: 'Checklist', icon: CheckCircle2 },
            { id: 'logistics', label: 'Logística', icon: MapPin },
            { id: 'rider', label: 'Rider Técnico', icon: FileText },
            { id: 'team', label: 'Equipe', icon: Users },
            { id: 'chat', label: 'Chat', icon: MessageSquare }
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-white text-primary shadow-sm border border-border/10' 
                  : 'text-muted-foreground hover:bg-white/50 hover:text-foreground'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'animate-bounce text-primary' : ''}`} />
              {tab.label}
              {tab.id === 'checklist' && (booking.tasks?.filter((t)=>!t.isCompleted).length ?? 0) > 0 && (
                <span className="bg-primary text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                  {booking.tasks?.filter((t)=>!t.isCompleted).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.15 }}
            className="min-h-[450px]"
          >
            {activeTab === 'roadmap' && (
              <SimpleCard title="Cronograma Operacional">
                <div className="space-y-6 relative before:absolute before:inset-0 before:left-[19px] before:w-[2px] before:bg-muted before:h-full py-2 px-1">
                   {/* Cronograma Fixo para Dashboard */}
                  {[
                    { time: '08:00', title: 'Chegada da Equipe', desc: 'Descarregamento e montagem inicial' },
                    { time: '10:00', title: 'Montagem Final', desc: 'Ajustes finos e testes de som/luz' },
                    { time: '12:00', title: 'Almoço Equipe', desc: 'Intervalo técnico' },
                    { time: '14:00', title: 'Passagem de Som', desc: 'Alinhamento com artistas' },
                    { time: '16:00', title: 'Portões Abertos', desc: 'Início da operação' },
                    { time: '22:00', title: 'Finalização', desc: 'Desmontagem e checkout' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-6 relative group">
                      <div className="relative z-10 w-9 h-9 rounded-full bg-muted flex items-center justify-center border-4 border-white shrink-0 group-hover:bg-primary transition-colors shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary group-hover:bg-white transition-colors" />
                      </div>
                      <div className="bg-muted/20 p-4 rounded-2xl flex-1 border border-border/20 group-hover:border-primary/20 group-hover:bg-primary/5 transition-all">
                        <span className="text-[10px] font-black text-primary mb-1 block tracking-wider uppercase">{item.time}</span>
                        <h4 className="font-extrabold text-foreground text-sm">{item.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SimpleCard>
            )}

            {activeTab === 'checklist' && (
              <SimpleCard 
                title="Status em Tempo Real" 
                description="Marque as etapas conforme forem concluídas (Opcional)"
              >
                <div className="space-y-3">
                  {booking.tasks && booking.tasks.length > 0 ? (
                    booking.tasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => handleToggleTask(task.id, task.isCompleted)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                          task.isCompleted 
                            ? 'bg-success/5 border-success/20 opacity-70' 
                            : 'bg-muted/30 border-border/50 hover:border-primary/30 hover:bg-primary/5'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {task.isCompleted ? (
                            <CheckCircle2 className="w-6 h-6 text-success fill-success/10" />
                          ) : (
                            <Circle className="w-6 h-6 text-muted-foreground" />
                          )}
                          <div className="text-left">
                            <h4 className={`text-sm font-bold ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-xs text-muted-foreground">{task.description}</p>
                            )}
                          </div>
                        </div>
                        {task.isCompleted && (
                          <span className="text-[10px] font-bold text-success uppercase">Concluído</span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">
                       <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto opacity-20 mb-3" />
                       <p className="text-sm text-muted-foreground">Nenhuma tarefa operativa definida para este evento.</p>
                       <p className="text-xs text-muted-foreground mt-1">Isso geralmente é configurado pela administração para grandes eventos.</p>
                    </div>
                  )}
                </div>
              </SimpleCard>
            )}

            {activeTab === 'logistics' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SimpleCard title="Local e Contato">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-2xl border border-border/30">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm mb-1">Localização do Evento</h4>
                        <p className="text-xs text-muted-foreground font-medium">
                          {booking.street}, {booking.addressNumber} - {booking.city}/{booking.state}
                        </p>
                        <div className="flex gap-2 mt-4">
                          <a 
                            href={booking.locationUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${booking.location} ${booking.street} ${booking.city}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary/90 transition-all shadow-md active:scale-95"
                            aria-label="Abrir localização no Google Maps"
                          >
                            <Navigation className="w-3.5 h-3.5" /> Abrir GPS
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-2xl border border-border/30">
                      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                        <Phone className="w-6 h-6 text-accent" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm mb-1">Contato no Local</h4>
                        <p className="text-xs text-muted-foreground">Responsável/Staff do Local</p>
                        <div className="flex items-center justify-between mt-3">
                           <div>
                              <p className="text-sm font-black text-foreground">{booking.venueContactName || 'Staff Local'}</p>
                              <p className="text-xs text-muted-foreground font-mono">{booking.venueContactPhone || '(Contatar Produção)'}</p>
                           </div>
                           {booking.venueContactPhone && (
                             <a 
                               href={`tel:${booking.venueContactPhone.replace(/\D/g,'')}`}
                               className="p-2.5 bg-accent text-accent-light rounded-xl shadow-md active:scale-90"
                               aria-label={`Ligar para ${booking.venueContactName || 'Staff Local'}`}
                             >
                               <Phone className="w-4 h-4" />
                             </a>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                </SimpleCard>

                <SimpleCard title="Sua Logística (Reembolsos)" description="Envie comprovantes de despesas pagas por você">
                  <div className="space-y-4">
                     <AnimatePresence>
                        {showExpenseForm ? (
                          <motion.form 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            onSubmit={handleSubmitExpense}
                            className="p-5 bg-primary/5 border border-primary/20 rounded-2xl space-y-4 overflow-hidden"
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-primary">Valor Total</label>
                                <input 
                                  type="number" 
                                  step="0.01"
                                  value={expenseAmount}
                                  onChange={(e)=>setExpenseAmount(e.target.value)}
                                  placeholder="0.00"
                                  className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-sm focus:ring-2 ring-primary/20 outline-none"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-primary">Descrição</label>
                                <input 
                                  type="text" 
                                  value={expenseDesc}
                                  onChange={(e)=>setExpenseDesc(e.target.value)}
                                  placeholder="Gasolina, alimentação..."
                                  className="w-full bg-white border border-border rounded-xl px-3 py-2.5 text-sm focus:ring-2 ring-primary/20 outline-none"
                                  required
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase text-primary">Anexar Recibo</label>
                               <div className="flex items-center gap-3">
                                  {receiptUrl ? (
                                    <div className="flex-1 flex items-center justify-between p-2 bg-success/10 border border-success/30 rounded-xl">
                                       <span className="text-[10px] font-bold text-success uppercase ml-2 truncate max-w-[150px]">Recibo Carregado</span>
                                       <button 
                                          type="button" 
                                          onClick={()=>setReceiptUrl('')}
                                          className="p-1.5 bg-success/20 rounded-lg text-success hover:bg-success/30"
                                          aria-label="Remover recibo carregado"
                                       >
                                          <X className="w-3.5 h-3.5" />
                                       </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => fileInputRef.current?.click()}
                                      disabled={uploadingReceipt}
                                      className="flex-1 flex items-center justify-center gap-2 p-3 bg-white border border-dashed border-primary/30 rounded-xl text-primary hover:bg-primary/5 transition-all text-xs font-bold"
                                      aria-label="Tirar Foto ou Upload de Recibo"
                                    >
                                      {uploadingReceipt ? <BrandLoader size="sm" /> : <><Camera className="w-4 h-4" /> Tirar Foto / Upload</>}
                                    </button>
                                  )}
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    ref={fileInputRef} 
                                    accept="image/*" 
                                    onChange={handleFileUpload}
                                    aria-label="Selecionar foto do recibo"
                                  />
                               </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                              <button 
                                type="submit" 
                                disabled={submittingExpense || uploadingReceipt}
                                className="flex-1 bg-primary text-white text-xs font-black py-3 rounded-xl shadow-lg active:scale-95 disabled:opacity-50"
                              >
                                {submittingExpense ? 'Enviando...' : 'Pedir Reembolso'}
                              </button>
                              <button 
                                type="button" 
                                onClick={()=>setShowExpenseForm(false)}
                                className="px-5 py-3 bg-muted text-muted-foreground text-xs font-bold rounded-xl"
                              >
                                Voltar
                              </button>
                            </div>
                          </motion.form>
                        ) : (
                          <button 
                            onClick={()=>setShowExpenseForm(true)}
                            className="w-full p-6 border-2 border-dashed border-primary/20 rounded-2xl text-primary hover:bg-primary/5 transition-all group lg:min-h-[140px] flex items-center justify-center"
                          >
                            <div className="text-center font-black uppercase text-xs">
                               <Plus className="w-8 h-8 mx-auto mb-2 text-primary/40 group-hover:rotate-90 group-hover:text-primary transition-all" /> 
                               Solicitar Novo Reembolso
                            </div>
                          </button>
                        )}
                     </AnimatePresence>

                     <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        {(booking.expenses?.length ?? 0) > 0 ? (
                          booking.expenses!.map((expense) => (
                            <div key={expense.id} className="flex items-center justify-between p-3.5 bg-muted/20 border border-border/40 rounded-2xl hover:border-primary/20 transition-all">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner">
                                     <Receipt className="w-5 h-5 text-primary" />
                                  </div>
                                  <div>
                                     <p className="text-sm font-bold text-foreground leading-tight">{expense.description}</p>
                                     <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{new Date(expense.createdAt).toLocaleDateString('pt-BR')}</p>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <p className="text-sm font-black text-foreground">{formatPrice(expense.amount)}</p>
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full mt-1 inline-block ${
                                    expense.status === 'APPROVED' ? 'bg-success/15 text-success' : 
                                    expense.status === 'REJECTED' ? 'bg-destructive/15 text-destructive' : 'bg-warning/15 text-warning'
                                  }`}>
                                    {expense.status === 'PENDING' ? 'Pendente' : 
                                     expense.status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
                                  </span>
                               </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-8 text-center bg-muted/10 rounded-2xl border border-dashed border-border/30">
                             <Receipt className="w-8 h-8 text-muted-foreground mx-auto opacity-10 mb-2" />
                             <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Nenhuma despesa enviada</p>
                          </div>
                        )}
                     </div>
                  </div>
                </SimpleCard>
              </div>
            )}

            {activeTab === 'rider' && (
              <SimpleCard title="Especificações Técnicas" description="Atenção aos detalhes solicitados pelo cliente">
                <div className="space-y-8">
                   <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl relative overflow-hidden group">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-extrabold text-lg mb-2">Orientações Técnicas</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {booking.technicalRider || 'Nenhuma especificação em texto fornecida.'}
                          </p>
                        </div>
                      </div>
                   </div>

                   {booking.technicalRiderUrl && (
                    <div className="p-6 border-2 border-dashed border-border/50 rounded-2xl flex items-center justify-between hover:bg-muted/30 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors shadow-sm">
                          <FileText className="w-7 h-7 text-destructive" />
                        </div>
                        <div>
                          <p className="text-base font-black text-foreground">Arquivo de Rider Oficial</p>
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">Clique para baixar e ver anexos</p>
                        </div>
                      </div>
                      <a 
                        href={booking.technicalRiderUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-12 h-12 flex items-center justify-center bg-destructive text-white rounded-2xl hover:bg-destructive/90 transition-all shadow-xl active:scale-95"
                        title="Baixar Rider Técnico"
                      >
                         <ExternalLink className="w-5 h-5" />
                      </a>
                    </div>
                   )}
                </div>
              </SimpleCard>
            )}

            {activeTab === 'team' && (
              <SimpleCard title="Equipe Operacional" description="Colaboradores escalados para este evento">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-2">
                  {(booking.eventCollaborators || []).map((member, i) => (
                    <motion.div 
                      key={i}
                      whileHover={{ scale: 1.02, y: -4 }}
                      className="p-5 bg-muted/20 border border-border/30 rounded-3xl flex items-center gap-5 group transition-shadow hover:shadow-lg"
                    >
                      <img 
                        src={member.collaborator.user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.collaborator.user.name}`} 
                        alt={member.collaborator.user.name}
                        className="w-16 h-16 rounded-2xl object-cover ring-4 ring-primary/10 group-hover:ring-primary/30 transition-all shadow-md"
                      />
                      <div className="flex-1">
                        <h4 className="font-extrabold text-sm leading-tight text-foreground">{member.collaborator.user.name}</h4>
                        <div className="flex items-center gap-2 mt-2">
                           <span className="text-[10px] font-black text-primary px-2.5 py-1 bg-primary/10 rounded-full uppercase tracking-tighter shadow-sm whitespace-nowrap">
                             {member.function?.name || 'Colaborador'}
                           </span>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                         <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <ArrowRight className="w-4 h-4 text-primary" />
                         </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </SimpleCard>
            )}

            {activeTab === 'chat' && (
              <div className="h-[650px] flex flex-col bg-card border border-border/50 rounded-3xl overflow-hidden shadow-2xl relative">
                <div className="p-5 bg-primary text-primary-foreground flex items-center justify-between border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-black text-sm uppercase tracking-widest">Chat da Equipe</h4>
                        <p className="text-[10px] opacity-80 font-bold">Reserva: {booking.id.substring(0, 8)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-success/20 px-3 py-1 rounded-full border border-success/30">
                     <div className="w-2 h-2 rounded-full bg-success animate-ping" />
                     <span className="text-[10px] font-black uppercase text-success-foreground">Equipe Online</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/70">
                  {(booking.chats?.[0]?.messages?.length ?? 0) > 0 ? (
                    booking.chats![0].messages!.map((msg, i) => {
                      const isMe = msg.senderId === booking.userId;
                      return (
                        <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] ${isMe ? 'flex flex-row-reverse' : 'flex'} gap-3 items-end`}>
                            <img 
                               src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderId}`} 
                               className="w-10 h-10 rounded-xl shrink-0 border-2 border-white shadow-md mb-1"
                               alt="avatar"
                            />
                            <div className={`shadow-sm text-sm p-4 relative ${
                              isMe 
                                ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-none' 
                                : 'bg-white border border-border/50 rounded-2xl rounded-bl-none'
                            }`}>
                              <p className="leading-relaxed font-semibold">{msg.content}</p>
                              <div className={`flex items-center gap-1 mt-2 opacity-50 text-[9px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <Clock className="w-3 h-3" />
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                       <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mb-6">
                          <MessageSquare className="w-10 h-10 text-muted-foreground opacity-30" />
                       </div>
                       <p className="text-sm font-black text-foreground uppercase tracking-widest">Sem conversas operacionais</p>
                       <p className="text-xs text-muted-foreground mt-2 max-w-[250px] leading-relaxed">Combine horários, trajes e ajustes técnicos diretamente com o time escalado aqui.</p>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-5 bg-white border-t border-border/50 flex gap-4 shadow-inner">
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Combine tudo com a equipe aqui..."
                      className="w-full bg-muted/40 border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-muted-foreground/50 shadow-inner"
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="aspect-square w-16 flex items-center justify-center bg-primary text-white rounded-2xl hover:bg-primary/90 transition-all shadow-xl active:scale-90 disabled:opacity-50 group shrink-0"
                    disabled={sending || !message.trim()}
                    aria-label="Enviar Mensagem"
                  >
                    {sending ? <BrandLoader size="sm" /> : <Send className="w-7 h-7 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer de Ações Rápidas */}
        <div className="flex flex-col md:flex-row gap-4 pt-6">
           <Link 
             to="/collaborator" 
             className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border border-border/50 rounded-2xl text-xs font-black uppercase text-muted-foreground hover:bg-muted/30 transition-all shadow-sm group"
           >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Dashboard do Colaborador
           </Link>
           <div className="flex-1" />
           <div className="flex items-center gap-3 p-2.5 bg-muted/40 rounded-3xl border border-border/30">
              <span className="text-[10px] font-black uppercase text-muted-foreground/60 px-4">Centro de Apoio</span>
              <button className="px-6 py-2.5 bg-accent text-accent-light text-xs font-black rounded-2xl shadow-lg border border-accent-light/10 hover:shadow-accent/20 transition-all active:scale-95">Alertar Produção</button>
           </div>
        </div>
      </div>
    </CollaboratorLayout>
  );
};

export default CollaboratorEventRoadmapPage;
