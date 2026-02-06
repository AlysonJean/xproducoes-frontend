import React, { useState, useEffect, memo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { apiFetch } from '../../services/api';
import { API_URL } from '../../utils/apiConfig';
import QRCode from 'react-qr-code';
import { socialService, SocialAnnouncement } from '../../services/socialService';
import { AnnouncementSlide } from '../../components/social/AnnouncementSlide';
import { MosaicSlide } from '../../components/social/MosaicSlide';
import { LeaderboardSlide } from '../../components/social/LeaderboardSlide';

// Types
interface SocialPost {
    id: string;
    mediaUrl: string;
    caption?: string;
    author: string;
    status: 'APPROVED' | 'PENDING' | 'REJECTED';
}

interface SponsorLogo {
    id: string;
    imageUrl: string;
    name: string;
}

interface WallConfig {
    id: string;
    settingId?: string;
    eventId?: string;
    name: string;
    hashtag: string;
    layoutMode: 'LANDSCAPE' | 'PORTRAIT';
    sponsors?: SponsorLogo[];
    enableQrCode?: boolean;
    qrCodeText?: string;
    slug?: string;

    // Mosaic
    enableMosaic?: boolean;
    mosaicFrequency?: number;
    
    // Gamification
    enableGamification?: boolean;
}

interface LeaderboardItem {
    username: string;
    avatarUrl?: string;
    count: number;
    platform: string;
}

// Optimization: Pre-calculate aspect ratio class to avoid CLS
// Using Tailwind for styling to avoid inline styles (Lint fix)
const SlideComponent = memo(({ post, active, isLandscapeMode, sponsors, hashtag, showQrCode, qrCodeText, slug }: { 
    post: SocialPost; 
    active: boolean; 
    isLandscapeMode: boolean;
    sponsors?: SponsorLogo[];
    hashtag?: string;
    showQrCode?: boolean;
    qrCodeText?: string;
    slug?: string;
}) => {
    if (!active) return null;

    // Cloudinary Optimization: Request exact resolution
    const optimizedUrl = post.mediaUrl.includes('cloudinary') 
        ? post.mediaUrl.replace('/upload/', '/upload/w_1920,h_1080,c_fit,q_auto/') 
        : post.mediaUrl;

    const isVerticalContent = true; // Simulating detection, real implementation would check aspect ratio or assuming generic fit

    // Determine Layout
    // 1. Portrait Mode (TV is Vertical) -> Show Full Screen
    // 2. Landscape Mode (TV is Horizontal) + Vertical Content -> Show Sidebar
    // 3. Landscape Mode + Horizontal Content -> Full Screen
    
    // For simplicity in this implementation, we assume Landscape Mode + Vertical Content uses Sidebars
    // Show sidebars if landscape AND vertical content AND (has sponsors OR has QR enabled)
    const showSidebars = isLandscapeMode && isVerticalContent && ((sponsors && sponsors.length > 0) || showQrCode);

    return (
        <div 
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ease-in-out will-[opacity,transform] ${active ? 'opacity-100' : 'opacity-0'}`}
        >
            {/* Background Layer (Blurred if sidebars) */}
            <div className="absolute inset-0 bg-black overflow-hidden z-0">
                 {/* Blurred Background for aesthetic fill */}
                 <img src={optimizedUrl} className="w-full h-full object-cover opacity-30 blur-xl scale-110" alt="" />
            </div>

            {/* Content Layer */}
            <div className="z-10 relative flex w-full h-full">
                
                {/* Left Sidebar (Sponsors) */}
                    <div className="flex flex-col justify-between items-center w-1/4 bg-black/40 backdrop-blur-sm p-6 gap-6 animate-fade-in-right h-full border-l border-white/10">
                        {/* Top: Hashtag & CTA */}
                        <div className="text-white text-center">
                            <p className="text-sm uppercase tracking-widest mb-1 text-gray-300">Participe</p>
                            <p className="font-bold text-3xl drop-shadow-md">#{hashtag || 'mural'}</p>
                        </div>
                        {/* Middle: QR Code (Dynamic) */}
                        {showQrCode && slug && (
                            <div className="bg-white p-3 rounded-xl shadow-2xl">
                                <QRCode 
                                    value={`${window.location.origin}/participate/${slug}`}
                                    size={180}
                                    level="M"
                                />
                                {qrCodeText && (
                                    <p className="text-black text-xs font-bold text-center mt-2 uppercase tracking-wide">{qrCodeText}</p>
                                )}
                            </div>
                        )}
                        {/* Bottom: Sponsors or Logo */}
                        {sponsors && sponsors.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4 w-full">
                                {sponsors.slice(0, 3).map(s => (
                                    <div key={s.id} className="bg-white p-3 rounded-lg shadow-lg flex items-center justify-center">
                                        <img 
                                            src={s.imageUrl} 
                                            alt={s.name} 
                                            className="h-16 w-full object-contain" 
                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-20"></div>
                        )}
                    </div>

                {/* Main Content Area */}
                <div className={`flex-1 flex items-center justify-center relative ${showSidebars ? 'p-4' : 'p-0'}`}>
                    <img 
                        src={optimizedUrl} 
                        alt={post.caption || 'Social Post'} 
                        className="max-h-full max-w-full object-contain shadow-2xl rounded-sm will-transform"
                    />
                    
                    {/* Caption Overlay */}
                    {post.caption && (
                        <div className="absolute bottom-10 left-0 right-0 text-center">
                            <div className="bg-black/60 backdrop-blur-md inline-block px-6 py-3 rounded-full text-white text-xl font-medium max-w-[80%] truncate">
                                <span className="text-pink-500 font-bold mr-2">@{post.author}</span>
                                {post.caption}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar (Sponsors - mirrored or different) */}
                {showSidebars && (
                    <div className="flex flex-col justify-between items-center w-1/4 bg-black/40 backdrop-blur-sm p-6 gap-6 animate-fade-in-right h-full border-l border-white/10">
                    
                        {/* Top: Hashtag & CTA */}
                        <div className="text-white text-center">
                            <p className="text-sm uppercase tracking-widest mb-1 text-gray-300">Participe</p>
                            <p className="font-bold text-3xl drop-shadow-md">#{hashtag || 'mural'}</p>
                        </div>

                        {/* Middle: QR Code (Dynamic) */}
                        {showQrCode && slug && (
                            <div className="bg-white p-3 rounded-xl shadow-2xl">
                                <QRCode 
                                    value={`${window.location.origin}/participate/${slug}`}
                                    size={180}
                                    level="M"
                                />
                                {qrCodeText && (
                                    <p className="text-black text-xs font-bold text-center mt-2 uppercase tracking-wide">{qrCodeText}</p>
                                )}
                            </div>
                        )}

                        {/* Bottom: Sponsors or Logo */}
                        {sponsors && sponsors.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4 w-full">
                                {sponsors.slice(0, 3).map(s => (
                                    <div key={s.id} className="bg-white p-3 rounded-lg shadow-lg flex items-center justify-center">
                                        <img 
                                            src={s.imageUrl} 
                                            alt={s.name} 
                                            className="h-16 w-full object-contain" 
                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-20"></div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

const TVPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [config, setConfig] = useState<WallConfig | null>(null);
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [announcements, setAnnouncements] = useState<SocialAnnouncement[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
    const [showAnnouncement, setShowAnnouncement] = useState<SocialAnnouncement | null>(null);
    const [slidesSinceAnnouncement, setSlidesSinceAnnouncement] = useState(0);
    
    // Mosaic State
    const [showMosaic, setShowMosaic] = useState(false);
    const [slidesSinceMosaic, setSlidesSinceMosaic] = useState(0);

    // Leaderboard State
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [slidesSinceLeaderboard, setSlidesSinceLeaderboard] = useState(0); // Show every 20-25 slides?

    const [pairingCode] = useState<string>(() => {
        const code = searchParams.get('code');
        if (code) return code;
        return Math.floor(1000 + Math.random() * 9000).toString();
    });
    
    // Refs for intervals/timeouts
    const nextSlideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchConfig = useCallback(async () => {
        try {
            const slug = searchParams.get('slug');
            let url = '';
            if (slug) {
                url = `/tv/config?slug=${slug}`;
            } else if (pairingCode) {
                url = `/tv/config?pairingCode=${pairingCode}`;
            }

            if (!url) return;

            const res = await apiFetch<any>(url);
            if (res.linked) {
                setConfig({
                    id: res.settingId,
                    settingId: res.settingId,
                    eventId: res.eventId,
                    name: res.eventName,
                    hashtag: res.hashtag || '',
                    layoutMode: res.layoutMode || 'LANDSCAPE',
                    slug: res.slug,
                    sponsors: res.sponsors,
                    enableQrCode: res.enableQrCode,
                    qrCodeText: res.qrCodeText,
                    enableMosaic: res.enableMosaic,
                    mosaicFrequency: res.mosaicFrequency,
                    enableGamification: res.enableGamification
                });
            }
        } catch (error) {
            console.error("Failed to load config", error);
        }
    }, [searchParams, pairingCode, config]); // Added config to avoid re-fetching if already set

    useEffect(() => {
        // Initial fetch only if not set
        if (!config) {
            fetchConfig();
        }

        // Log para depuração
        if (config) {
            // eslint-disable-next-line no-console
            console.log('Config carregado:', config);
        }

        // Polling loop if not linked
        const interval = setInterval(() => {
            if (!config) {
                fetchConfig();
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [fetchConfig, config]);

    // 1.5 Fetch Announcements
    useEffect(() => {
        if (!config?.settingId) return;
        const fetchAnnouncments = async () => {
             try {
                 const response = await socialService.getAnnouncements(config.settingId!);
                 setAnnouncements(response.data.filter((a: SocialAnnouncement) => a.isActive));
             } catch (err) {
                 console.error(err);
             }
        };
        fetchAnnouncments();
        // Poll for updates every minute
        const interval = setInterval(fetchAnnouncments, 60000);
        return () => clearInterval(interval);
    }, [config?.settingId]);

    // Fetch Leaderboard periodically
    useEffect(() => {
        if (!config?.enableGamification || !config.settingId) return;

        const fetchLeaderboard = async () => {
             try {
                const res = await apiFetch<LeaderboardItem[]>(`/public/social/leaderboard?settingId=${config.settingId}`);
                if (res) {
                    setLeaderboard(res);
                }
            } catch (err) {
                console.error("Failed to fetch leaderboard", err);
            }
        };

        fetchLeaderboard();
        const interval = setInterval(fetchLeaderboard, 60000 * 5); // 5 min
        return () => clearInterval(interval);
    }, [config?.settingId, config?.enableGamification]);

    // 2. Socket Connection (Restored)
    useEffect(() => {
        if (!config) return;
        
        // Conecta sempre na porta correta do backend
        const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:4000' : API_URL;
        console.log('Connecting to socket at:', socketUrl);
        const socket = io(socketUrl, {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });
        
        const roomId = config.settingId ? `wall:${config.settingId}` : `event:${config.eventId}`;
        
        socket.on('connect', () => {
            console.log('Connected to WebSocket server');
            socket.emit('join', roomId);
            console.log(`Joined room: ${roomId}`);
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        socket.on('post:new', (post: SocialPost) => {
            setPosts(prev => {
                if (prev.find(p => p.id === post.id)) return prev;
                // Preload
                const img = new Image();
                img.src = post.mediaUrl;
                // Add new post to top/start
                return [post, ...prev].slice(0, 50); // Cap at 50
            });
        });

        socket.on('post:remove', ({ id }: { id: string }) => {
            setPosts(prev => prev.filter(p => p.id !== id));
        });

        socket.on('config:update', () => {
            console.log('Real-time config update received');
            fetchConfig();
        });

        return () => {
            socket.disconnect();
        };
    }, [config, fetchConfig]);

    // 3. Slideshow Rotation Logic (Dynamic Duration)
    useEffect(() => {
        if (posts.length === 0) return;

        const scheduleNext = () => {
            // Determine duration of current slide
            let duration = 8000; // Default post duration
            
            if (showAnnouncement) {
                duration = (showAnnouncement.duration || 10) * 1000;
            }

            nextSlideTimeout.current = setTimeout(() => {
                // If currently showing announcement, switch back to post
                if (showAnnouncement) {
                    setShowAnnouncement(null);
                    setSlidesSinceAnnouncement(0);
                    // Move to next post
                    setActiveIndex(prev => (prev + 1) % posts.length);
                } 
                else if (showMosaic) {
                    setShowMosaic(false);
                    setSlidesSinceMosaic(0);
                    // Resume posts
                    setActiveIndex(prev => (prev + 1) % posts.length);
                }
                else if (showLeaderboard) {
                    setShowLeaderboard(false);
                    setSlidesSinceLeaderboard(0);
                    setActiveIndex(prev => (prev + 1) % posts.length);
                }
                else {
                    // Currently showing post. Check triggers.
                    
                    // 1. Announcements
                    const nextAnnounceCounter = slidesSinceAnnouncement + 1;
                    const dueAnnouncement = announcements.find(a => nextAnnounceCounter >= (a.frequency || 10));
                    
                    // 2. Mosaic
                    const nextMosaicCounter = slidesSinceMosaic + 1;
                    const mosaicFreq = config?.mosaicFrequency || 15;
                    const dueMosaic = config?.enableMosaic && nextMosaicCounter >= mosaicFreq;

                    // 3. Leaderboard
                    const nextLeaderboardCounter = slidesSinceLeaderboard + 1;
                    const leaderboardFreq = 25;
                    const dueLeaderboard = config?.enableGamification && leaderboard.length > 0 && nextLeaderboardCounter >= leaderboardFreq;

                    if (dueAnnouncement) {
                        setShowAnnouncement(dueAnnouncement);
                    } else if (dueMosaic) {
                         setShowMosaic(true);
                    } else if (dueLeaderboard) {
                        setShowLeaderboard(true);
                    } else {
                        // Just next post
                        setSlidesSinceAnnouncement(nextAnnounceCounter);
                        setSlidesSinceMosaic(nextMosaicCounter);
                        setSlidesSinceLeaderboard(nextLeaderboardCounter);
                        setActiveIndex(prev => (prev + 1) % posts.length);
                    }
                }
            }, duration);
        };

        scheduleNext();

        return () => {
             if (nextSlideTimeout.current) clearTimeout(nextSlideTimeout.current);
        };
    }, [posts.length, showAnnouncement, slidesSinceAnnouncement, announcements, activeIndex, slidesSinceMosaic, showMosaic, config, leaderboard, showLeaderboard, slidesSinceLeaderboard]);

    // Render Loading / Pairing / Error states
    if (!config && pairingCode) {
        return (
            <div className="w-screen h-screen bg-black text-white flex flex-col items-center justify-center">
                <h1 className="text-6xl font-bold mb-4">{pairingCode}</h1>
                <p className="text-2xl text-gray-400">Entre em admin/social para parear esta TV</p>
            </div>
        );
    }
    
    if (!config) return <div className="bg-black w-screen h-screen flex items-center justify-center text-white">Carregando...</div>;

    if (posts.length === 0) {
        return (
            <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden">
                <div className="z-10 text-center p-8 bg-black/50 backdrop-blur-md rounded-xl border border-white/10">
                    <h2 className="text-4xl font-bold mb-2">#{config.hashtag}</h2>
                    <p className="text-xl text-gray-300">Publique no Instagram para aparecer aqui!</p>
                </div>
                {/* Background animation hint */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-blue-900/20 animate-pulse"></div>
            </div>
        );
    }

    // Determine if sidebars are currently showing (to avoid double QR codes)
    const isVerticalContent = true; // Match SlideComponent logic
    const showSidebarsAtMain = config?.layoutMode === 'LANDSCAPE' && isVerticalContent && ((config?.sponsors && config.sponsors.length > 0) || config?.enableQrCode);
    const currentPost = posts[activeIndex];

    return (
        <div className="relative w-screen h-screen bg-black text-white overflow-hidden font-sans selection:bg-pink-500 selection:text-white">
            {/* Background Layer (Blur) */}
            <div className="absolute inset-0 z-0 opacity-40 scale-110 pointer-events-none">
                 {/* Reuse optimized URL from current post for background if available */}
                 {currentPost && (
                    <img 
                        src={currentPost.mediaUrl.replace('/upload/', '/upload/w_100,c_scale,q_auto/')} 
                        className="w-full h-full object-cover blur-3xl" 
                        alt="" 
                    />
                 )}
            </div>

            {/* Content Layer */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8">
                 {showAnnouncement && (
                     <AnnouncementSlide announcement={showAnnouncement} />
                 )}
                 {showMosaic ? (
                     <MosaicSlide posts={posts} />
                 ) : showLeaderboard ? (
                     <LeaderboardSlide items={leaderboard} />
                 ) : currentPost ? (
                     <SlideComponent 
                        post={currentPost} 
                        active={true}
                        isLandscapeMode={config?.layoutMode === 'LANDSCAPE'}
                        sponsors={config?.sponsors}
                        hashtag={config?.hashtag}
                        showQrCode={config?.enableQrCode}
                        qrCodeText={config?.qrCodeText}
                        slug={config?.slug}
                     />
                 ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-2xl opacity-50">Aguardando posts...</p>
                    </div>
                 )}
            </div>
            
            {/* Sidebar & Overlay Elements (QR, Sponsors em modos sem sidebar) */}
            { !showSidebarsAtMain && !showAnnouncement && !showMosaic && !showLeaderboard && (
                <div className="absolute bottom-8 right-8 flex flex-col items-end gap-4">
                    {/* QR Code flutuante */}
                    { !!config?.enableQrCode && (
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-2xl animate-fade-in-up">
                            <p className="text-center font-bold mb-2 text-sm uppercase tracking-wider">{config.qrCodeText || 'Participe'}</p>
                            <div className="bg-white p-2 rounded-lg">
                                <QRCode value={`${window.location.origin}/participate/${config.slug || ''}`} size={120} />
                            </div>
                        </div>
                    )}
                    {/* Logos dos patrocinadores flutuantes */}
                    { config?.sponsors && config.sponsors.length > 0 && (
                        <div className="flex gap-3 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20 shadow-2xl animate-fade-in-up">
                            {config.sponsors.slice(0, 3).map(s => (
                                <img key={s.id} src={s.imageUrl} alt={s.name} className="h-12 w-auto object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default TVPage;
