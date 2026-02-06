import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { socialService, SocialPost } from '../../services/socialService';
import { ModerationGrid } from '../../components/social/ModerationGrid';
import { Button } from '../../components/ui/Button';
import { SimpleCard } from '../../components/ui/Cards';
import { RefreshCw, Monitor, Settings } from 'lucide-react';
import { io } from 'socket.io-client';

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
            if (response.settingId) {
                const configRes = await socialService.getWallConfig(response.settingId);
                setWall(configRes);
            }
        } catch (error) {
            console.error('Failed to fetch posts', error);
        } finally {
            setLoading(false);
        }
    };

    fetchPosts();
  }, [id, eventId, settingId, tab]);
  
  useEffect(() => {
    if (!id) return;
    
    const socket = io(window.location.hostname === 'localhost' ? 'http://localhost:4000' : '/', { path: '/socket.io' }); 

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
        await socialService.pairDevice({
            pairingCode,
            settingId,
            eventId,
            deviceName: 'TV Evento'
        });
        alert('TV pareada com sucesso!');
        setPairingCode('');
    } catch (error) {
        console.error('Pairing error:', error);
        alert('Erro ao parear TV. Verifique o código.');
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
                Social Wall Moderation
            </h1>
            <p className="text-muted-foreground">Gerencie o feed social do seu evento em tempo real.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <form onSubmit={handlePair} className="flex gap-2">
                <input 
                    type="text" 
                    placeholder="Cód. TV (4 dígitos)" 
                    className="w-32 p-2 border rounded-md"
                    value={pairingCode}
                    onChange={e => setPairingCode(e.target.value)}
                    maxLength={4}
                />
                <Button type="submit" disabled={pairingLoading || !pairingCode}>
                    {pairingLoading ? '...' : 'Parear TV'}
                </Button>
            </form>
            <Button variant="outline" onClick={handleManualSync}>
                <RefreshCw className="mr-2 h-4 w-4" /> Sincronizar Agora
            </Button>
            <Button variant="outline" onClick={() => {
                const url = wall?.slug ? `/tv?slug=${wall.slug}` : `/tv?settingId=${id}`;
                window.open(url, '_blank');
            }}>
                <Monitor className="mr-2 h-4 w-4" /> Abrir TV View
            </Button>
            <Button variant="ghost">
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
  );
};

export default AdminSocialPage;
