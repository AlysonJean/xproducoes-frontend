import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { SocialPost } from '../../services/socialService';

// Ultra-light component, minimized dependencies
const TVPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [config, setConfig] = useState<{
        settingId?: string;
        eventId?: string;
        booking?: { id: string };
        [key: string]: any;
    } | null>(null);
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [pairingCode, setPairingCode] = useState<string>('');
    const [error, setError] = useState('');

    // 1. Initial Load & Pairing
    useEffect(() => {
        const code = searchParams.get('code');
        const slug = searchParams.get('slug');

        if (!code && !slug) {
           setError('Código de pareamento ou URL inválida.');
           return;
        }
        
        if (code) setPairingCode(code);

        const fetchConfig = async () => {
             try {
                const navUrl = (import.meta as any).env.VITE_API_URL || '/api';
                // Build query
                const query = slug ? `slug=${slug}` : `pairingCode=${code}`;
                
                const res = await fetch(`${navUrl}/tv/config?${query}`);
                const data = await res.json();
                
                if (data.error) throw new Error(data.error);
                if (!data.linked) {
                    // If simply not linked yet (for code flow)
                   return; 
                }

                setConfig(data);
             } catch (err: any) {
                setError(err.message || 'Erro ao carregar configuração');
             }
        };

        fetchConfig();
        
        // Poll if using code and not linked yet? 
        // For simplicity, we assume one-shot for now or user refreshes.
        // Ideally we'd poll if (code && !config).
        let pollInterval: any;
        if (code && !slug) {
            pollInterval = setInterval(fetchConfig, 5000);
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [searchParams]);

    // 2. Socket Connection
    useEffect(() => {
        // We need either bookingId (legacy) or settingId (new)
        const targetId = config?.settingId || config?.eventId || config?.booking?.id;
        
        if (!targetId) return;

        const socket = io('/', { path: '/socket.io' });

        socket.on('connect', () => {
            console.log('TV Connected');
            // Join specific wall room if available, else fallback
            if (config.settingId) {
                socket.emit('join', `wall:${config.settingId}`);
            } else {
                socket.emit('join', `event:${targetId}`);
            }
        });

        socket.on('post:new', (post: SocialPost) => {
            setPosts(prev => {
                const exists = prev.find(p => p.id === post.id);
                if (exists) return prev; 
                // Preload image
                const img = new Image();
                img.src = post.mediaUrl;
                // Add to queue and cap at 50
                // This prevents memory leaks on long-running displays
                const newQueue = [post, ...prev];
                return newQueue.slice(0, 50);
            });
        });

        socket.on('post:remove', ({ id }: { id: string }) => {
            setPosts(prev => prev.filter(p => p.id !== id));
        });

        return () => {
            socket.disconnect();
        };
    }, [config]);

    // 3. Slideshow Logic
    useEffect(() => {
        if (posts.length === 0) return;
        const interval = setInterval(() => {
            setActiveIndex(prev => (prev + 1) % posts.length);
        }, 10000); // 10 seconds
        return () => clearInterval(interval);
    }, [posts]);


    if (error) return <div className="h-screen w-screen bg-black text-white flex items-center justify-center text-4xl">{error}</div>;
    
    // Waiting for config (either slug load or pairing code link)
    if (!config) {
        return (
            <div className="h-screen w-screen bg-black text-white flex flex-col items-center justify-center space-y-8">
                 <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
                 {pairingCode && (
                     <div className="text-center">
                         <p className="text-zinc-400 text-xl mb-2">Código de Pareamento</p>
                         <h1 className="text-8xl font-mono font-bold tracking-widest">{pairingCode}</h1>
                         <p className="text-zinc-500 mt-4">Acesse o painel administrativo para vincular esta TV.</p>
                     </div>
                 )}
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="h-screen w-screen bg-black text-white flex flex-col items-center justify-center opacity-80 animate-pulse">
                <h1 className="text-6xl font-black mb-4 tracking-tighter">#{config.slug || 'SOCIAL'}</h1>
                <p className="text-2xl">Poste no Instagram para aparecer aqui!</p>
            </div>
        );
    }

    const currentPost = posts[activeIndex];
    const nextPost = posts[(activeIndex + 1) % posts.length];
    
    // Preload next
    if (nextPost) {
        const img = new Image();
        img.src = nextPost.mediaUrl;
    }

    return (
        <div className="h-screen w-screen bg-black overflow-hidden relative">
            {/* Background Blur */}
            <div 
                className="absolute inset-0 bg-cover bg-center opacity-30 blur-3xl scale-110 transition-all duration-1000"
                style={{ backgroundImage: `url(${currentPost.mediaUrl})` }}
            />
            
            {/* Main Content */}
            <div className="absolute inset-0 flex items-center justify-center z-10 p-12">
                <div className="relative w-full max-w-7xl h-full flex gap-12 items-center">
                    
                    {/* Image Container */}
                    <div className="flex-1 h-full max-h-[90vh] aspect-square relative shadow-2xl rounded-3xl overflow-hidden bg-zinc-900 border-4 border-white/10">
                         <img 
                            key={currentPost.id}
                            src={currentPost.mediaUrl} 
                            className="w-full h-full object-contain animate-fade-in"
                            alt="Social"
                         />
                    </div>

                    {/* Meta/Caption */}
                    <div className="w-1/3 text-white space-y-8 animate-slide-in-right">
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-600 p-1">
                                <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-3xl font-bold">
                                    {currentPost.author[0].toUpperCase()}
                                </div>
                            </div>
                            <div>
                                <h2 className="text-4xl font-bold">@{currentPost.author}</h2>
                                <p className="text-white/60 text-xl">Instagram</p>
                            </div>
                        </div>
                        
                        <p className="text-3xl leading-relaxed font-medium">
                            {currentPost.caption}
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default TVPage;
