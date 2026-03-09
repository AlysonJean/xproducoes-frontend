/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CollaboratorLayout } from '../../components/collaborator/CollaboratorLayout';
import { collaboratorProfileAPI, collaboratorMessagesAPI } from '../../services/api';
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
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CollaboratorEventRoadmapPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roadmap' | 'rider' | 'team' | 'chat'>('roadmap');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        if (!id) return;
        const resp = await collaboratorProfileAPI.getEventRoadmap(id);
        const data = resp.data?.data || resp.data;
        setBooking(data);
      } catch (error) {
        console.error('Erro ao carregar roadmap:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmap();
  }, [id]);

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
      await collaboratorMessagesAPI.sendMessage(chatId, message);
      setMessage('');
      const resp = await collaboratorProfileAPI.getEventRoadmap(id);
      setBooking(resp.data?.data || resp.data);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
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

  const eventChat = booking.chats?.find((c: any) => c.type === 'EVENT');

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
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/90 to-primary text-primary-foreground p-8 rounded-2xl shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-white/20 uppercase tracking-wider">
                Reserva #{booking.id.substring(0, 8)}
              </span>
              <h1 className="text-3xl font-black">{booking.eventTitle || 'Evento X Produções'}</h1>
              <div className="flex flex-wrap gap-4 text-primary-foreground/90 text-sm">
                <span className="flex items-center gap-1.5 backdrop-blur-sm bg-white/10 px-3 py-1 rounded-full">
                  <Calendar className="w-4 h-4" />
                  {new Date(booking.eventDate).toLocaleDateString('pt-BR')}
                </span>
                <span className="flex items-center gap-1.5 backdrop-blur-sm bg-white/10 px-3 py-1 rounded-full">
                  <MapPin className="w-4 h-4" />
                  {booking.city || 'Local a definir'}
                </span>
                <span className="flex items-center gap-1.5 backdrop-blur-sm bg-white/10 px-3 py-1 rounded-full">
                  <Clock className="w-4 h-4" />
                  {new Date(booking.eventDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
               <div className="bg-white/20 backdrop-blur-md px-6 py-3 rounded-xl border border-white/30 text-right">
                  <p className="text-xs uppercase opacity-70 font-bold">Seu Ganhos</p>
                  <p className="text-2xl font-black">{formatPrice(booking.eventCollaborators?.find((c: any) => c.collaborator.user.id === booking.userId)?.totalPayment || 0)}</p>
               </div>
               <span className="text-xs font-medium px-3 py-1 rounded-full bg-success/20 text-white border border-white/20">
                  Confirmado pela Produção
               </span>
            </div>
          </div>
          
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-black/5 rounded-full blur-2xl" />
        </div>

        {/* Navegação por Abas */}
        <div className="flex items-center p-1 bg-muted rounded-xl gap-1 overflow-x-auto max-w-full no-scrollbar border border-border/50">
          {[
            { id: 'roadmap', label: 'Cronograma', icon: Clock },
            { id: 'rider', label: 'Rider Técnico', icon: FileText },
            { id: 'team', label: 'Equipe', icon: Users },
            { id: 'chat', label: 'Chat Equipe', icon: MessageSquare }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-muted-foreground hover:bg-white/50'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'animate-bounce' : ''}`} />
              {tab.label}
              {tab.id === 'chat' && eventChat && (
                <span className="bg-primary text-white text-[10px] px-1.5 rounded-full">On</span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="min-h-[400px]"
          >
            {activeTab === 'roadmap' && (
              <SimpleCard title="Timeline do Evento">
                <div className="space-y-6 relative before:absolute before:inset-0 before:left-[19px] before:w-[2px] before:bg-muted before:h-full py-4 px-2">
                  {[
                    { time: '08:00', title: 'Chegada da Equipe', desc: 'Descarregamento e montagem inicial' },
                    { time: '10:00', title: 'Montagem Final', desc: 'Ajustes finos e testes de som/luz' },
                    { time: '12:00', title: 'Almoço Equipe', desc: 'Intervalo técnico' },
                    { time: '14:00', title: 'Passagem de Som', desc: 'Alinhamento com artistas' },
                    { time: '16:00', title: 'Portões Abertos', desc: 'Início da operação' },
                    { time: '22:00', title: 'Finalização', desc: 'Desmontagem e checkout' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-6 relative group">
                      <div className="relative z-10 w-9 h-9 rounded-full bg-muted flex items-center justify-center border-4 border-white shrink-0 group-hover:bg-primary transition-colors">
                        <div className="w-2 h-2 rounded-full bg-primary group-hover:bg-white transition-colors" />
                      </div>
                      <div className="bg-muted/30 p-4 rounded-xl flex-1 border border-border/30 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all">
                        <span className="text-xs font-black text-primary mb-1 block tracking-tighter">{item.time}</span>
                        <h4 className="font-bold text-foreground text-sm">{item.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SimpleCard>
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
                          <h4 className="font-bold text-lg mb-2">Rider Técnico Principal</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {booking.technicalRider || 'Nenhuma especificação em texto fornecida.'}
                          </p>
                        </div>
                      </div>
                   </div>

                   {booking.technicalRiderUrl && (
                    <div className="p-4 border-2 border-dashed border-border rounded-xl flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-destructive/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Documento Técnico</p>
                          <p className="text-xs text-muted-foreground font-mono uppercase">Rider Oficial em PDF</p>
                        </div>
                      </div>
                      <a 
                        href={booking.technicalRiderUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all shadow-md active:scale-95"
                        title="Baixar Rider"
                      >
                         <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                   )}
                </div>
              </SimpleCard>
            )}

            {activeTab === 'team' && (
              <SimpleCard title="Equipe Escalada" description="Conheça seus colegas para este evento">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(booking.eventCollaborators || []).map((member: any, i: number) => (
                    <motion.div 
                      key={i}
                      whileHover={{ scale: 1.02, y: -2 }}
                      className="p-4 bg-muted/30 border border-border/30 rounded-2xl flex items-center gap-4 group"
                    >
                      <img 
                        src={member.collaborator.user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.collaborator.user.name}`} 
                        alt={member.collaborator.user.name}
                        className="w-14 h-14 rounded-xl object-cover ring-2 ring-primary/20 group-hover:ring-primary transition-all shadow-lg"
                      />
                      <div>
                        <h4 className="font-bold text-sm leading-none">{member.collaborator.user.name}</h4>
                        <p className="text-xs font-black text-primary mt-1 uppercase tracking-tighter">
                          {member.function?.name || 'Colaborador'}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </SimpleCard>
            )}

            {activeTab === 'chat' && (
              <div className="h-[600px] flex flex-col bg-card border border-border/50 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-4 bg-primary text-primary-foreground flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5" title="Chat" />
                    <h4 className="font-bold text-sm">Chat do Evento</h4>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
                  {booking.chats?.[0]?.messages?.length > 0 ? (
                    booking.chats[0].messages.map((msg: any, i: number) => (
                      <div key={i} className={`flex ${msg.senderId === id ? 'justify-end' : 'justify-start'}`}>
                        <div className={`px-4 py-2 rounded-2xl text-sm ${msg.senderId === id ? 'bg-primary text-primary-foreground' : 'bg-muted border'}`}>
                          <p>{msg.content}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-20 text-sm">Nenhuma mensagem ainda.</p>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
                  <input 
                    type="text" 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Digite..."
                    className="flex-1 bg-white border rounded-xl px-4 py-2 text-sm"
                  />
                  <button 
                    type="submit" 
                    className="p-2 bg-primary text-white rounded-xl"
                    disabled={sending || !message.trim()}
                    title="Enviar Mensagem"
                  >
                    {sending ? <BrandLoader size="sm" /> : <Send className="w-5 h-5" />}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </CollaboratorLayout>
  );
};

export default CollaboratorEventRoadmapPage;
