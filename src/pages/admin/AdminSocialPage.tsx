import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { socialService, SocialPost } from '../../services/socialService';
import { ModerationGrid } from '../../components/social/ModerationGrid';
import { Button } from '../../components/ui/Button';
import { SimpleCard } from '../../components/ui/Cards';
import { RefreshCw, Monitor, Settings } from 'lucide-react';
import { io } from 'socket.io-client';

const AdminSocialPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  // Distinguish context based on URL
  const isBookingContext = location.pathname.includes('/reservas/');
  const eventId = isBookingContext ? id : undefined;
  const settingId = !isBookingContext ? id : undefined;

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string[]>([]);
  // Use config to store metadata like name/slug if we fetch it? For now just posts.
  const [tab, setTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

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
        } catch (error) {
            console.error('Failed to fetch posts', error);
        } finally {
            setLoading(false);
        }
    };

    fetchPosts();
  }, [id, eventId, settingId, tab]);
  
  // Real-time updates
  // Real-time updates
  useEffect(() => {
    if (!id) return;
    
    const socket = io('/', { path: '/socket.io' }); 

    socket.on('connect', () => {
        if (settingId) {
            socket.emit('join', `wall:${settingId}`);
        } else if (eventId) {
            socket.emit('join', `event:${eventId}`);
        }
    });

    socket.on('post:new', (post: SocialPost) => {
        // Only prepend if we are in the matching tab
        setPosts(prev => {
            if (post.status === tab) {
                 if (prev.find(p => p.id === post.id)) return prev;
                 return [post, ...prev];
            } else {
                 return prev.filter(p => p.id !== post.id);
            }
        });
    });

    socket.on('post:remove', ({ id }: { id: string }) => {
        setPosts(prev => prev.filter(p => p.id !== id));
    });

    return () => {
        socket.disconnect();
    };
  }, [id, eventId, settingId, tab]);


  const handleModerate = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    // Optimistic Update
    const originalPosts = [...posts];
    setProcessing(prev => [...prev, id]);
    
    // Remove from UI immediately for better feel
    setPosts(prev => prev.filter(p => p.id !== id));

    try {
      await socialService.moderatePost(id, status);
      // Success - no need to do anything as optimistic update removed it
      // And we might get a socket event back validating it
    } catch (error) {
       console.error(error);
       // Revert
       setPosts(originalPosts);
       alert('Failed to moderate post');
    } finally {
       setProcessing(prev => prev.filter(pid => pid !== id));
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
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleManualSync}>
                <RefreshCw className="mr-2 h-4 w-4" /> Sincronizar Agora
            </Button>
            <Button variant="outline" onClick={() => window.open(`/tv?code=???`, '_blank')}>
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
                    onApprove={(id) => handleModerate(id, 'APPROVED')}
                    onReject={(id) => handleModerate(id, 'REJECTED')}
                    processingIds={processing}
                />
            )}
        </div>
      </SimpleCard>
    </div>
  );
};

export default AdminSocialPage;
