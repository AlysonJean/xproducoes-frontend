import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { socialService, SocialPost } from '../../services/socialService';
import { ModerationGrid } from '../../components/social/ModerationGrid';
import { 
  RefreshCw, 
  Settings, 
  Check, 
  Tv, 
  Zap, 
  ShieldCheck, 
  Layout, 
  Globe, 
  ArrowLeft,
  XCircle
} from 'lucide-react';
import { io } from 'socket.io-client';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { 
  Button, 
  Card, 
  Modal, 
  Badge,
  Input
} from '../../components/ui/StandardComponents';
import { apiFetch } from '../../services/api';
import { BrandLoader } from '../../components/ui/BrandLoader';
import { useNotifications } from '@/contexts/NotificationContext';

interface SponsorLogo {
    id: string;
    name: string;
    imageUrl: string;
}

const AdminSocialPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  
  // Distinguish context based on URL
  const isBookingContext = location.pathname.includes('/reservas/');
  const eventId = isBookingContext ? id : undefined;
  const settingId = !isBookingContext ? id : undefined;

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string[]>([]);
  const [tab, setTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [pairingCode, setPairingCode] = useState('');
  const [pairingLoading, setPairingLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [wall, setWall] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [allSponsors, setAllSponsors] = useState<SponsorLogo[]>([]);
  const [selectedSponsorIds, setSelectedSponsorIds] = useState<string[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
        if (!id) return;
        setLoading(true);
        const response = await socialService.getPosts({ 
            eventId: eventId, 
            settingId: settingId,
            status: tab,
            limit: 100 
        });
        setPosts(response.data || []);
        
        const targetId = response.settingId || settingId;
        if (targetId) {
            const configRes = await socialService.getAdminWall(targetId);
            setWall(configRes.data);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setSelectedSponsorIds(configRes.data.sponsors?.map((s: any) => s.id) || []);
        }
    } catch (error) {
        console.error('Failed to fetch posts', error);
        addNotification({ type: 'error', title: 'Falha Técnica', message: 'Erro ao tentar conectar com a API social.' });
    } finally {
        setLoading(false);
    }
  }, [id, eventId, settingId, tab, addNotification]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const fetchSponsors = async () => {
     try {
         const data = await apiFetch<SponsorLogo[]>('/admin/sponsors');
         setAllSponsors(data || []);
     } catch (err) {
         console.error(err);
     }
  };
  
  useEffect(() => {
    if (!id) return;
    
    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:4000' : '/';
    const socket = io(socketUrl, { path: '/socket.io' });

    socket.on('connect', () => {
        if (settingId) {
            socket.emit('join', `wall:${settingId}`);
        } else if (eventId) {
            socket.emit('join', `event:${eventId}`);
        }
    });

    socket.on('post:new', (post: SocialPost) => {
        setPosts(prev => {
            if (post.status === tab) {
                 if (prev.find(p => p.id === post.id)) return prev;
                 return [post, ...prev];
            } else {
                 return prev.filter(p => p.id !== post.id);
            }
        });
        if (post.status === 'PENDING') {
            addNotification({ type: 'info', title: 'Novo Post', message: 'Mural recebeu uma nova mídia para moderação.' });
        }
    });

    socket.on('post:remove', ({ id: postId }: { id: string }) => {
        setPosts(prev => prev.filter(p => p.id !== postId));
    });

    return () => {
        socket.disconnect();
    };
  }, [id, eventId, settingId, tab, addNotification]);

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingCode || (!settingId && !eventId)) return;
    
    try {
        setPairingLoading(true);
        await socialService.pairDevice({
            pairingCode: String(pairingCode),
            settingId: settingId ? String(settingId) : undefined,
            eventId: eventId ? String(eventId) : undefined,
            deviceName: 'TV Evento Main'
        });
        
        addNotification({ type: 'success', title: 'TV Pareada', message: 'Conexão estabelecida com o telão com sucesso!' });
        setPairingCode('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        addNotification({ type: 'error', title: 'Falha de Pareamento', message: error.message || 'Código inválido ou expirado.' });
    } finally {
        setPairingLoading(false);
    }
  };

  const handleModerate = async (postId: string, status: 'APPROVED' | 'REJECTED') => {
    const originalPosts = [...posts];
    setProcessing(prev => [...prev, postId]);
    setPosts(prev => prev.filter(p => p.id !== postId));

    try {
      await socialService.moderatePost(postId, status);
      addNotification({ 
        type: status === 'APPROVED' ? 'success' : 'info', 
        title: status === 'APPROVED' ? 'Post Aprovado' : 'Post Rejeitado', 
        message: `Mídia encaminhada para o feed de ${status.toLowerCase()}.` 
      });
    } catch (error) {
       console.error(error);
       setPosts(originalPosts);
       addNotification({ type: 'error', title: 'Erro Operacional', message: 'Não foi possível salvar o status da moderação.' });
    } finally {
       setProcessing(prev => prev.filter(pid => pid !== postId));
    }
  };

  const handleManualSync = async () => {
    if (!id) return;
    try {
        await socialService.syncNow(id, settingId ? 'setting' : 'event');
        addNotification({ type: 'info', title: 'Radar Ativo', message: 'Sincronização forçada iniciada. Aguarde novos posts.' });
    } catch {
        addNotification({ type: 'error', title: 'Falha Sync', message: 'Erro ao tentar forçar atualização do feed.' });
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!wall?.id) return;
      try {
          setSavingSettings(true);
          const form = e.target as HTMLFormElement;
          const formData = new FormData(form);
          const data = {
              name: formData.get('name'),
              slug: formData.get('slug'),
              hashtag: formData.get('hashtag'),
              layoutMode: formData.get('layoutMode'),
              qrCodeText: formData.get('qrCodeText'),
              enableQrCode: formData.get('enableQrCode') === 'on',
              autoApprove: formData.get('autoApprove') === 'on',
              enableMosaic: formData.get('enableMosaic') === 'on',
              enableGamification: formData.get('enableGamification') === 'on',
              sponsorIds: selectedSponsorIds
          };

        await socialService.updateWall(wall.id, data);
        setIsSettingsOpen(false);
        const updated = await socialService.getAdminWall(wall.id);
        setWall(updated.data);
        addNotification({ type: 'success', title: 'Configurações Salvas', message: 'Parâmetros do mural atualizados com êxito.' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        addNotification({ 
          type: 'error', 
          title: 'Erro de Validação', 
          message: err.response?.data?.error || 'Verifique se o slug ou hashtag já estão em uso.' 
        });
    } finally {
        setSavingSettings(false);
    }
  };

  const stats = useMemo(() => ({
    count: posts.length,
    activeWall: !!wall,
    hashtag: wall?.hashtag || '---'
  }), [posts, wall]);

  if (loading && posts.length === 0) {
      return (
        <AdminLayout title="Social Moderation" breadcrumbs={[{ name: 'Admin' }, { name: 'Social Walls' }]}>
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <BrandLoader size={120} label="Equalizando feed de redes sociais..." />
            </div>
        </AdminLayout>
      );
  }

  return (
    <AdminLayout 
        title={wall?.name ? `Mural: ${wall.name}` : "Social Moderation"}
        breadcrumbs={[
            { name: 'Admin', href: '/admin/painel' },
            { name: 'Social Walls', href: '/admin/social' },
            { name: wall?.name || 'Mural Operativo' }
        ]}
    >
        <div className="space-y-8">
            {/* Control Bar */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-xl shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                             <h2 className="text-xl font-black text-foreground uppercase tracking-tighter">Radar de Engajamento</h2>
                             <Badge variant="primary" className="text-[9px] font-black uppercase ring-1 ring-primary/20">LIVE</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                            Monitorando hashtag <span className="text-pink-600 font-black italic">#{stats.hashtag}</span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <form onSubmit={handlePair} className="flex gap-2 w-full sm:w-auto">
                        <Input 
                            type="text" 
                            placeholder="Cód. TV" 
                            className="w-24 h-10 text-center font-black tracking-widest uppercase border-primary/20 bg-primary/5 focus:ring-primary/30"
                            value={pairingCode}
                            onChange={e => setPairingCode(e.target.value)}
                            maxLength={4}
                        />
                        <Button type="submit" size="sm" className="h-10 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 px-6" disabled={pairingLoading || !pairingCode}>
                            {pairingLoading ? '...' : 'Parear TV'}
                        </Button>
                    </form>
                    
                    <div className="h-8 w-px bg-border hidden sm:block mx-1" />
                    
                    <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" className="h-10 font-black uppercase text-[10px] tracking-widest px-4 border-border/60 hover:border-primary transition-all" onClick={handleManualSync}>
                            <RefreshCw className="mr-2 h-4 w-4" /> Sync
                        </Button>
                        <Button variant="outline" size="sm" className="h-10 font-black uppercase text-[10px] tracking-widest px-4 border-border/60 hover:bg-muted" onClick={() => {
                            const url = wall?.slug ? `/tv?slug=${wall.slug}` : `/tv?settingId=${id}`;
                            window.open(url, '_blank');
                        }}>
                            <Tv className="mr-2 h-4 w-4" /> TV View
                        </Button>
                        <Button variant="primary" size="icon" className="h-10 w-10 shrink-0 shadow-lg shadow-primary/20" onClick={() => {
                            fetchSponsors();
                            setIsSettingsOpen(true);
                        }}>
                            <Settings className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Moderation Hub */}
            <Card className="border-border/50 bg-card/30 backdrop-blur-sm p-0 overflow-hidden shadow-2xl">
                <div className="flex overflow-x-auto scroller-hide bg-muted/20 border-b border-border/50">
                    {[
                        { id: 'PENDING', label: 'Em Moderação', icon: ShieldCheck, color: 'text-amber-500' },
                        { id: 'APPROVED', label: 'Exibindo no Telão', icon: Check, color: 'text-emerald-500' },
                        { id: 'REJECTED', label: 'Arquivados', icon: XCircle, color: 'text-destructive' }
                    ].map((status) => (
                        <button
                            key={status.id}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            onClick={() => setTab(status.id as any)}
                            className={`flex-1 min-w-[150px] py-5 px-6 text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center justify-center gap-2.5 ${
                                tab === status.id 
                                ? 'text-primary bg-primary/5' 
                                : 'text-muted-foreground hover:bg-muted/50'
                            }`}
                        >
                            <status.icon className={`h-4 w-4 ${tab === status.id ? 'text-primary' : status.color}`} />
                            {status.label}
                            {tab === status.id && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary animate-in fade-in duration-300" />
                            )}
                        </button>
                    ))}
                </div>
                
                <div className="p-8 min-h-[500px]">
                    {loading ? (
                        <div className="flex flex-col justify-center items-center h-[400px]">
                            <BrandLoader size={80} label="Carregando galeria..." />
                        </div>
                    ) : (
                        <ModerationGrid 
                            posts={posts} 
                            onApprove={(postId) => handleModerate(postId, 'APPROVED')}
                            onReject={(postId) => handleModerate(postId, 'REJECTED')}
                            processingIds={processing}
                        />
                    )}
                </div>
            </Card>

            {/* Status Footer */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-border/50 bg-muted/20 self-start">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Socket.io Conectado: Transmissão em tempo real ativa</span>
            </div>
        </div>

        {/* Global Settings Modal */}
        <Modal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            title="Parâmetros Operativos do Mural"
            size="lg"
        >
            <form onSubmit={handleUpdateSettings} className="space-y-8 py-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-4 w-4 text-primary" />
                            <h4 className="font-black text-xs uppercase tracking-widest text-foreground">Identidade da Campanha</h4>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Nome do Mural</label>
                                <Input name="name" defaultValue={wall?.name} placeholder="Ex: Casamento Premium" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Hashtag Principal (#)</label>
                                <Input name="hashtag" defaultValue={wall?.hashtag} placeholder="festa2024" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Slug da URL (TV View)</label>
                                <Input name="slug" defaultValue={wall?.slug} placeholder="festa-exclusiva" />
                                <p className="text-[9px] text-muted-foreground mt-1.5 font-medium italic">Acesso via: /tv?slug=seu-val</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Layout className="h-4 w-4 text-primary" />
                            <h4 className="font-black text-xs uppercase tracking-widest text-foreground">Motor de Exibição</h4>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Orientação Física</label>
                                <select name="layoutMode" defaultValue={wall?.layoutMode} className="w-full flex h-10 rounded-xl border border-input bg-card px-3 text-sm font-bold text-foreground" title="Selecione a orientação do layout">
                                    <option value="LANDSCAPE">Horizontal (Padrão TV)</option>
                                    <option value="PORTRAIT">Vertical (Totem)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Call-to-Action QR Code</label>
                                <Input name="qrCodeText" defaultValue={wall?.qrCodeText} placeholder="Escaneie para participar" />
                            </div>
                            <div className="grid grid-cols-1 gap-3 pt-2">
                                <label className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                                    <input type="checkbox" name="enableQrCode" defaultChecked={wall?.enableQrCode} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-foreground uppercase tracking-widest">Ativar Instruções QR</span>
                                        <span className="text-[9px] text-muted-foreground font-medium">Renderiza o card de instruções na TV</span>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 p-3 rounded-xl border border-destructive/20 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors">
                                    <input type="checkbox" name="autoApprove" defaultChecked={wall?.autoApprove} className="w-4 h-4 rounded border-border text-destructive focus:ring-destructive" />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-destructive uppercase tracking-widest">Aprovação Automática</span>
                                        <span className="text-[9px] text-destructive/70 font-medium">Bypass total de moderação (Risco Crítico)</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-border/50">
                    <div className="flex items-center gap-2 mb-6">
                        <Globe className="h-4 w-4 text-primary" />
                        <h4 className="font-black text-xs uppercase tracking-widest text-foreground">Chancela de Patrocinadores</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                        {allSponsors.map(sponsor => (
                            <div 
                                key={sponsor.id}
                                onClick={() => {
                                    setSelectedSponsorIds(prev => 
                                        prev.includes(sponsor.id) 
                                        ? prev.filter(id => id !== sponsor.id)
                                        : [...prev, sponsor.id]
                                    );
                                }}
                                className={`relative p-3 border-2 rounded-2xl cursor-pointer transition-all flex flex-col items-center gap-3 group ${
                                    selectedSponsorIds.includes(sponsor.id)
                                    ? 'border-primary bg-primary/5 shadow-inner'
                                    : 'border-border bg-card filter grayscale hover:filter-none hover:border-primary/50'
                                }`}
                            >
                                <div className="h-12 w-full flex items-center justify-center p-1">
                                    <img src={sponsor.imageUrl} alt={sponsor.name} className="max-h-full max-w-full object-contain" />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-tighter truncate w-full text-center">{sponsor.name}</span>
                                
                                {selectedSponsorIds.includes(sponsor.id) && (
                                    <div className="absolute -top-1.5 -right-1.5 bg-primary text-white rounded-full p-1 shadow-lg ring-2 ring-background">
                                        <Check size={10} strokeWidth={4} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    {allSponsors.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 bg-muted/30 rounded-2x border border-dashed border-border px-4">
                             <p className="text-[10px] font-black uppercase text-muted-foreground/50 text-center">Nenhum patrocinador catalogado no ecossistema.</p>
                             <Button variant="ghost" size="sm" className="mt-2 text-[9px] uppercase font-black tracking-widest" onClick={() => navigate('/admin/parceiros')}>Cadastrar Agora</Button>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-border/50 font-black uppercase">
                    <Button type="button" variant="outline" className="h-11 px-6 rounded-2xl tracking-widest text-[10px]" onClick={() => setIsSettingsOpen(false)}>Cancelar</Button>
                    <Button type="submit" isLoading={savingSettings} className="h-11 px-8 rounded-2xl tracking-widest text-[10px] shadow-lg shadow-primary/20">
                         Commit Alterações
                    </Button>
                </div>
            </form>
        </Modal>
    </AdminLayout>
  );
};

export default AdminSocialPage;
