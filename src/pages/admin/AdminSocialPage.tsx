import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { socialService, SocialPost } from '../../services/socialService';
import { ModerationGrid } from '../../components/social/ModerationGrid';
import { Button } from '../../components/ui/Button';
import { SimpleCard } from '../../components/ui/Cards';
import { RefreshCw, Monitor, Settings } from 'lucide-react';
import { io } from 'socket.io-client';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Modal } from '../../components/ui/StandardComponents';
import { apiFetch } from '../../services/api';
import { Check } from 'lucide-react';

interface SponsorLogo {
    id: string;
    name: string;
    imageUrl: string;
}

const AdminSocialPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  
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
  const [wall, setWall] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [allSponsors, setAllSponsors] = useState<SponsorLogo[]>([]);
  const [selectedSponsorIds, setSelectedSponsorIds] = useState<string[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const fetchPosts = async () => {
        try {
            if (!id) return;
            setLoading(true);
            const response = await socialService.getPosts({ 
                eventId: eventId, 
                settingId: settingId,
                status: tab,
                limit: 100 
            });
            setPosts(response.data);
            
            // Also fetch wall config if we have a settingId or get it from response
            const targetId = response.settingId || settingId;
            if (targetId) {
                const configRes = await socialService.getAdminWall(targetId);
                setWall(configRes.data);
                setSelectedSponsorIds(configRes.data.sponsors?.map((s: any) => s.id) || []);
            }
        } catch (error) {
            console.error('Failed to fetch posts', error);
        } finally {
            setLoading(false);
        }
    };

    fetchPosts();
  }, [id, eventId, settingId, tab, isSettingsOpen]); // Refresh when settings close potentially

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
    });

    socket.on('post:remove', ({ id: postId }: { id: string }) => {
        setPosts(prev => prev.filter(p => p.id !== postId));
    });

    return () => {
        socket.disconnect();
    };
  }, [id, eventId, settingId, tab]);

  const handlePair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingCode || (!settingId && !eventId)) return;
    
    try {
        setPairingLoading(true);
        console.log('Pairing attempt:', { pairingCode, settingId, eventId });
        
        await socialService.pairDevice({
            pairingCode: String(pairingCode),
            settingId: settingId ? String(settingId) : undefined,
            eventId: eventId ? String(eventId) : undefined,
            deviceName: 'TV Evento'
        });
        
        alert('TV pareada com sucesso! A imagem deve aparecer no telão em alguns segundos.');
        setPairingCode('');
    } catch (error: any) {
        console.error('Pairing error details:', error);
        const message = error.message || 'Erro ao parear TV. Verifique o código.';
        alert(message);
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
    } catch (error) {
       console.error(error);
       setPosts(originalPosts);
       alert('Failed to moderate post');
    } finally {
       setProcessing(prev => prev.filter(pid => pid !== postId));
    }
  };

  const handleManualSync = async () => {
    if (!id) return;
    try {
        await socialService.syncNow(id, settingId ? 'setting' : 'event');
        alert('Sincronização iniciada. Novos posts aparecerão em breve.');
    } catch {
        alert('Erro ao iniciar sincronização');
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!wall?.id) return;
      try {
          setSavingSettings(true);
          const formData = new FormData(e.target as HTMLFormElement);
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
        // Refresh wall data
        const updated = await socialService.getAdminWall(wall.id);
        setWall(updated.data);
        alert('Configurações salvas com sucesso!');
    } catch (err: any) {
        console.error(err);
        const errorMessage = err.response?.data?.error || 'Erro ao salvar configurações. Verifique se o slug ou a hashtag já estão em uso.';
        alert(errorMessage);
    } finally {
        setSavingSettings(false);
    }
  };

  return (
    <AdminLayout 
        title={wall?.name ? `Moderação: ${wall.name}` : "Carregando Mural..."}
        breadcrumbs={[
            { name: 'Admin', href: '/admin/painel' },
            { name: 'Social Walls', href: '/admin/social' },
            { name: wall?.name || 'Mural' }
        ]}
    >
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border">
                <div className="flex flex-wrap gap-2 items-center">
                    <form onSubmit={handlePair} className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Cód. TV (4 dígitos)" 
                            className="w-32 p-2 border rounded-md bg-background text-sm"
                            value={pairingCode}
                            onChange={e => setPairingCode(e.target.value)}
                            maxLength={4}
                        />
                        <Button type="submit" size="sm" disabled={pairingLoading || !pairingCode}>
                            {pairingLoading ? '...' : 'Parear TV'}
                        </Button>
                    </form>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleManualSync}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Sincronizar Agora
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                        const url = wall?.slug ? `/tv?slug=${wall.slug}` : `/tv?settingId=${id}`;
                        window.open(url, '_blank');
                    }}>
                        <Monitor className="mr-2 h-4 w-4" /> Abrir TV View
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                        fetchSponsors();
                        setIsSettingsOpen(true);
                    }}>
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>
            </div>

      <SimpleCard className="p-0 overflow-hidden">
        <div className="flex border-b">
            {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
                <button
                    key={status}
                    onClick={() => setTab(status as 'PENDING' | 'APPROVED' | 'REJECTED')}
                    className={`flex-1 py-4 text-sm font-medium transition-colors border-b-2 ${
                        tab === status 
                        ? 'border-primary text-primary bg-primary/5' 
                        : 'border-transparent text-muted-foreground hover:bg-muted/50'
                    }`}
                >
                    {status === 'PENDING' ? 'Pendentes' : status === 'APPROVED' ? 'Aprovados' : 'Rejeitados'}
                </button>
            ))}
        </div>
        
        <div className="p-6 min-h-[500px]">
            {loading ? (
                <div className="flex justify-center items-center h-48">
                    <RefreshCw className="animate-spin text-muted-foreground" />
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
      </SimpleCard>
        </div>

        {/* Global Settings Modal */}
        <Modal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            title="Configurações do Mural"
            size="lg"
        >
            <form onSubmit={handleUpdateSettings} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground border-b pb-1">Identidade</h4>
                        <div>
                            <label htmlFor="wall-name" className="block text-xs font-medium mb-1">Nome do Mural</label>
                            <input id="wall-name" name="name" defaultValue={wall?.name} className="w-full p-2 bg-muted/20 border rounded-md text-sm" />
                        </div>
                        <div>
                            <label htmlFor="wall-hashtag" className="block text-xs font-medium mb-1">Hashtag (#)</label>
                            <input id="wall-hashtag" name="hashtag" defaultValue={wall?.hashtag} className="w-full p-2 bg-muted/20 border rounded-md text-sm" />
                        </div>
                        <div>
                            <label htmlFor="wall-slug" className="block text-xs font-medium mb-1">Slug da URL (/tv?slug=...)</label>
                            <input id="wall-slug" name="slug" defaultValue={wall?.slug} className="w-full p-2 bg-muted/20 border rounded-md text-sm" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground border-b pb-1">Exibição TV</h4>
                        <div>
                            <label htmlFor="layout-mode" className="block text-xs font-medium mb-1">Orientação da Tela</label>
                            <select id="layout-mode" name="layoutMode" defaultValue={wall?.layoutMode} className="w-full p-2 bg-muted/20 border rounded-md text-sm">
                                <option value="LANDSCAPE">Horizontal (Landscape)</option>
                                <option value="PORTRAIT">Vertical (Portrait)</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="qr-code-text" className="block text-xs font-medium mb-1">Texto do QR Code</label>
                            <input id="qr-code-text" name="qrCodeText" defaultValue={wall?.qrCodeText} placeholder="Escaneie para postar" className="w-full p-2 bg-muted/20 border rounded-md text-sm" />
                        </div>
                        <div className="flex flex-col gap-2 pt-2">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" name="enableQrCode" defaultChecked={wall?.enableQrCode} className="rounded text-primary" />
                                Exibir QR Code na tela
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" name="autoApprove" defaultChecked={wall?.autoApprove} className="rounded text-primary" />
                                Aprovação Automática (CUIDADO)
                            </label>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Parceiros e Logos</h4>
                    <p className="text-xs text-muted-foreground">Selecione as logos que devem aparecer nas laterais da TV (modo story).</p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-1">
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
                                className={`relative p-2 border rounded-xl cursor-pointer transition-all flex flex-col items-center gap-2 group ${
                                    selectedSponsorIds.includes(sponsor.id)
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                    : 'border-border bg-card hover:border-primary/50'
                                }`}
                            >
                                <div className="h-12 w-full">
                                    <img src={sponsor.imageUrl} alt={sponsor.name} className="h-full w-full object-contain mix-blend-multiply" />
                                </div>
                                <span className="text-[10px] font-medium truncate w-full text-center">{sponsor.name}</span>
                                
                                {selectedSponsorIds.includes(sponsor.id) && (
                                    <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full p-0.5">
                                        <Check size={10} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    {allSponsors.length === 0 && (
                        <p className="text-center py-4 text-xs text-muted-foreground bg-muted/10 rounded border border-dashed">
                            Nenhum parceiro cadastrado. Vá em "Operações &gt; Parceiros" primeiro.
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setIsSettingsOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={savingSettings}>
                        {savingSettings ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </div>
            </form>
        </Modal>
    </AdminLayout>
  );
};

export default AdminSocialPage;
