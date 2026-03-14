/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import React, { useState, useEffect, memo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { apiFetch } from '../../services/api';
import { API_URL } from '../../utils/apiConfig';
import QRCode from 'react-qr-code';

// Helper: prefer configured public base URL for QR codes in production
const getPublicBase = () => {
    // Use environment var if provided, else fallback to origin
    // VITE_PUBLIC_URL should include protocol (https://example.com)
     
    return import.meta.env.VITE_PUBLIC_URL || (typeof window !== 'undefined' ? window.location.origin : '');
};
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

     
    console.debug('SlideComponent - sponsors', sponsors?.map(s => ({ id: s.id, url: s.imageUrl })), 'showSidebars', showSidebars);

    // Inspect DOM for sponsor images when component renders
    if (typeof document !== 'undefined') {
        const imgs = Array.from(document.querySelectorAll('.sponsor-debug-img')) as HTMLImageElement[];
         
        console.debug('SlideComponent - DOM sponsor imgs count:', imgs.length, imgs.map(i => i.src));
    }

    return (
        <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-1000 ease-in-out will-[opacity,transform] ${active ? 'opacity-100' : 'opacity-0'}`}
        >
            {/* Background Layer (Blurred if sidebars) */}
            <div className="absolute inset-0 bg-surface overflow-hidden z-0">
                {/* Blurred Background for aesthetic fill */}
                <img src={optimizedUrl} className="w-full h-full object-cover opacity-30 blur-xl scale-110" alt="" />
            </div>

            {/* Content Layer */}
            <div className="z-10 relative flex w-full h-full">

                {/* Left Sidebar (Sponsors) */}
                <div className="flex flex-col justify-between items-center w-1/4 bg-surface/40 backdrop-blur-sm p-6 gap-6 animate-fade-in-right h-full border-l border-border/10">
                    {/* Top: Hashtag & CTA */}
                    <div className="text-foreground text-center">
                        <p className="text-sm uppercase tracking-widest mb-1 text-muted-foreground">Participe</p>
                        <p className="font-bold text-3xl drop-shadow-md">#{hashtag || 'mural'}</p>
                    </div>
                    {/* Middle: QR Code (Dynamic) */}
                    {showQrCode && slug && (
                        <div className="bg-transparent p-0 rounded-none shadow-none">
                            <QRCode
                                value={`${getPublicBase()}/participate/${slug}`}
                                size={180}
                                level="M"
                            />
                            {qrCodeText && (
                                <p className="text-foreground text-xs font-bold text-center mt-2 uppercase tracking-wide">{qrCodeText}</p>
                            )}
                            {/* Debug: show resolved QR value when debugging */}
                                                        {typeof window !== 'undefined' && (window as any).__TV_DEBUG && (
                                <p className="text-xs text-muted-foreground mt-2 break-all">{`${getPublicBase()}/participate/${slug}`}</p>
                            )}
                        </div>
                    )}
                    {/* Bottom: Sponsors or Logo */}
                    {sponsors && sponsors.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 w-full">
                            {sponsors.slice(0, 3).map(s => {
                                const opt = s.imageUrl && s.imageUrl.includes('/upload/') ? s.imageUrl.replace('/upload/', '/upload/w_600,c_limit,q_auto/') : s.imageUrl;
                                const small = s.imageUrl && s.imageUrl.includes('/upload/') ? s.imageUrl.replace('/upload/', '/upload/w_300,c_limit/') : s.imageUrl;
                                return (
                                    <div key={s.id} className="w-full flex items-center justify-center bg-transparent p-0">
                                        <img
                                            src={opt || 'https://placehold.co/240x80?text=Sponsor'}
                                            srcSet={opt ? `${small} 240w, ${opt} 480w` : undefined}
                                            alt={s.name || 'Sponsor'}
                                            className="w-full h-full object-cover sponsor-debug-img min-h-0 min-w-0 max-h-full max-w-full"
                                            loading="eager"
                                            onLoad={() => {
                                                try {
                                                    if (typeof window !== 'undefined') {
                                                        (window as any).__sponsorsLoaded = ((window as any).__sponsorsLoaded || 0) + 1;
                                                        if ((window as any).__TV_DEBUG) console.debug('Sponsor loaded:', s.imageUrl);
                                                    }
                                                                                                } catch (err) {/* ignore */ }
                                            }}
                                            onError={(e) => {
                                                 
                                                console.warn('SlideComponent - Sponsor image failed to load, replacing with placeholder:', s.imageUrl);
                                                e.currentTarget.src = 'https://placehold.co/240x80?text=Sponsor';
                                            }}
                                        />
                                    </div>
                                );
                            })}
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
                            <div className="bg-surface/60 backdrop-blur-md inline-block px-6 py-3 rounded-full text-foreground text-xl font-medium max-w-[80%] truncate">
                                <span className="text-primary font-bold mr-2">@{post.author}</span>
                                {post.caption}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar (Sponsors - mirrored or different) */}
                {showSidebars && (
                    <div className="flex flex-col justify-between items-center w-1/4 bg-surface/40 backdrop-blur-sm p-6 gap-6 animate-fade-in-right h-full border-l border-border/10">

                        {/* Top: Hashtag & CTA */}
                        <div className="text-foreground text-center">
                            <p className="text-sm uppercase tracking-widest mb-1 text-muted-foreground">Participe</p>
                            <p className="font-bold text-3xl drop-shadow-md">#{hashtag || 'mural'}</p>
                        </div>

                        {/* Middle: QR Code (Dynamic) */}
                        {showQrCode && slug && (
                            <div className="bg-transparent p-0 rounded-none shadow-none">
                                <QRCode
                                    value={`${getPublicBase()}/participate/${slug}`}
                                    size={180}
                                    level="M"
                                />
                                {qrCodeText && (
                                    <p className="text-foreground text-xs font-bold text-center mt-2 uppercase tracking-wide">{qrCodeText}</p>
                                )}
                                {/* Debug: show resolved QR value when debugging */}
                                                                {typeof window !== 'undefined' && (window as any).__TV_DEBUG && (
                                    <p className="text-xs text-muted-foreground mt-2 break-all">{`${getPublicBase()}/participate/${slug}`}</p>
                                )}
                            </div>
                        )}
                        {/* Bottom: Sponsors or Logo */}
                        {sponsors && sponsors.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4 w-full">
                                {sponsors.slice(0, 3).map(s => {
                                    const opt = s.imageUrl && s.imageUrl.includes('/upload/') ? s.imageUrl.replace('/upload/', '/upload/w_600,c_limit,q_auto/') : s.imageUrl;
                                    const small = s.imageUrl && s.imageUrl.includes('/upload/') ? s.imageUrl.replace('/upload/', '/upload/w_300,c_limit/') : s.imageUrl;
                                    return (
                                        <div key={s.id} className="w-full flex items-center justify-center bg-transparent p-0">
                                            <img
                                                src={opt || 'https://placehold.co/300x96?text=Sponsor'}
                                                srcSet={opt ? `${small} 300w, ${opt} 600w` : undefined}
                                                alt={s.name || 'Sponsor'}
                                                className="w-full h-full object-cover sponsor-debug-img min-h-0 min-w-0 max-h-full max-w-full"
                                                loading="eager"
                                                onLoad={() => {
                                                    try {
                                                        if (typeof window !== 'undefined') {
                                                            (window as any).__sponsorsLoaded = ((window as any).__sponsorsLoaded || 0) + 1;
                                                            if ((window as any).__TV_DEBUG) console.debug('Sponsor loaded:', s.imageUrl);
                                                        }
                                                                                                        } catch (err) {/* ignore */ }
                                                }}
                                                onError={(e) => {
                                                     
                                                    console.warn('SlideComponent - Sponsor image failed to load, replacing with placeholder:', s.imageUrl);
                                                    e.currentTarget.src = 'https://placehold.co/300x96?text=Sponsor';
                                                }}
                                            />
                                        </div>
                                    );
                                })}
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

        // Polling loop if not linked
        const interval = setInterval(() => {
            if (document.hidden) return; // Pausa polling se a aba não estiver visível
            if (!config) {
                fetchConfig();
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [fetchConfig, config]);

    // Warn when QR is enabled but slug is missing (always declared to keep Hooks order stable)
    useEffect(() => {
        if (config?.enableQrCode && !config?.slug) {
             
            console.warn('TV Debug - QR is enabled but config.slug is missing. QR will not be rendered.');
        }
    }, [config?.enableQrCode, config?.slug]);

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
        const interval = setInterval(() => {
            if (document.hidden) return; // Pausa polling se a aba não estiver visível
            fetchAnnouncments();
        }, 60000);
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
        const interval = setInterval(() => {
            if (document.hidden) return; // Pausa polling se aba inativa
            fetchLeaderboard();
        }, 60000 * 5); // 5 min
        return () => clearInterval(interval);
    }, [config?.settingId, config?.enableGamification]);

    // 2. Socket Connection (Restored)
    useEffect(() => {
        if (!config) return;

        // Conecta sempre na porta correta do backend
        const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:4000' : API_URL;
        const socket = io(socketUrl, {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });

        const roomId = config.settingId ? `wall:${config.settingId}` : `event:${config.eventId}`;

        socket.on('connect', () => {
            socket.emit('join', roomId);
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

    // Dev-only fallback: allow testing logos/QR without a backend by setting VITE_TV_DEV_FALLBACK=true
    useEffect(() => {
        const enabled = (import.meta.env.DEV && import.meta.env.VITE_TV_DEV_FALLBACK === 'true') || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
        if (!enabled) return;
        if (config) return; // only apply when no config is present

        console.info('TV Debug - applying dev fallback config for local testing');

        const sampleConfig: WallConfig = {
            id: 'dev-sample',
            name: 'Dev Sample Wall',
            hashtag: 'muraldev',
            layoutMode: 'LANDSCAPE',
            enableQrCode: true,
            qrCodeText: 'Participe - Dev',
            slug: 'dev-sample',
            sponsors: [
                { id: 'sp1', imageUrl: 'https://via.placeholder.com/200x80?text=Sponsor+1', name: 'Sponsor 1' },
                { id: 'sp2', imageUrl: 'https://via.placeholder.com/200x80?text=Sponsor+2', name: 'Sponsor 2' }
            ],
            enableMosaic: true,
            mosaicFrequency: 6,
            enableGamification: false,
        };

        const samplePosts: SocialPost[] = [
            { id: 'p1', mediaUrl: 'https://via.placeholder.com/1200x800?text=Post+1', author: 'dev_user', caption: 'post de teste 1', status: 'APPROVED' },
            { id: 'p2', mediaUrl: 'https://via.placeholder.com/800x1200?text=Post+2', author: 'dev_user2', caption: 'post vertical', status: 'APPROVED' },
        ];

        setConfig(sampleConfig);
        setPosts(samplePosts);
    }, [config]);

    // Render Loading / Pairing / Error states
    if (!config && pairingCode) {
        return (
            <div className="w-screen h-screen bg-surface text-foreground flex flex-col items-center justify-center">
                <h1 className="text-6xl font-bold mb-4">{pairingCode}</h1>
                <p className="text-2xl text-muted-foreground">Entre em admin/social para parear esta TV</p>
            </div>
        );
    }

    if (!config) return <div className="bg-surface w-screen h-screen flex items-center justify-center text-foreground">Carregando...</div>;

    const isVerticalContent = true; // Match SlideComponent logic
    const showSidebarsAtMain = config?.layoutMode === 'LANDSCAPE' && isVerticalContent && ((config?.sponsors && config.sponsors.length > 0) || config?.enableQrCode);

    if (posts.length === 0) {
        // Render a placeholder slide so sponsors and QR are visible even when there
        // are no posts yet. This improves UX for events without published posts.
        const placeholderPost: SocialPost = {
            id: 'placeholder',
            mediaUrl: (config?.sponsors && config.sponsors[0] && config.sponsors[0].imageUrl) || 'https://placehold.co/1200x800/000000/ffffff?text=No+posts+yet',
            author: config?.name || 'Evento',
            caption: '',
            status: 'APPROVED'
        };

        return (
            <div className="relative w-screen h-screen bg-surface text-foreground overflow-hidden font-sans selection:bg-primary selection:text-primary-foreground">
                <div className="absolute inset-0 z-0 opacity-40 scale-110 pointer-events-none">
                    <img src={placeholderPost.mediaUrl.replace('/upload/', '/upload/w_100,c_scale,q_auto/')} className="w-full h-full object-cover blur-3xl" alt="" />
                </div>

                <div className="absolute inset-0 z-10 flex items-center justify-center p-8">
                    <SlideComponent
                        post={placeholderPost}
                        active={true}
                        isLandscapeMode={config?.layoutMode === 'LANDSCAPE'}
                        sponsors={config?.sponsors}
                        hashtag={config?.hashtag}
                        showQrCode={config?.enableQrCode}
                        qrCodeText={config?.qrCodeText}
                        slug={config?.slug}
                    />
                </div>

                {/* Sidebar & Overlay Elements (QR, Sponsors em modos sem sidebar) */}
                {!showSidebarsAtMain && !showAnnouncement && !showMosaic && !showLeaderboard && (
                    <div className="absolute bottom-8 right-8 flex flex-col items-end gap-4">
                        {/* QR Code flutuante */}
                        {!!config?.enableQrCode && (
                            <div className="bg-transparent p-4 rounded-xl animate-fade-in-up">
                                <p className="text-center font-bold mb-2 text-sm uppercase tracking-wider">{config.qrCodeText || 'Participe'}</p>
                                <div className="p-2 rounded-lg bg-transparent">
                                    <QRCode value={`${getPublicBase()}/participate/${config.slug || ''}`} size={120} />
                                </div>
                                                                {typeof window !== 'undefined' && (window as any).__TV_DEBUG && (
                                    <p className="text-xs text-gray-600 mt-2 break-all">{`${getPublicBase()}/participate/${config.slug || ''}`}</p>
                                )}
                            </div>
                        )}
                        {/* Logos dos patrocinadores flutuantes */}
                        {config?.sponsors && config.sponsors.length > 0 && (
                            <div className="flex gap-3 bg-transparent p-0 rounded-xl animate-fade-in-up">
                                {config.sponsors.slice(0, 3).map(s => {
                                    const opt = s.imageUrl && s.imageUrl.includes('/upload/') ? s.imageUrl.replace('/upload/', '/upload/w_480,c_limit,q_auto/') : s.imageUrl;
                                    const small = s.imageUrl && s.imageUrl.includes('/upload/') ? s.imageUrl.replace('/upload/', '/upload/w_240,c_limit/') : s.imageUrl;
                                    return (
                                        <div key={s.id} className="w-40 flex items-center justify-center">
                                            <img src={opt || 'https://placehold.co/240x80?text=Sponsor'} alt={s.name || 'Sponsor'} className="w-full h-auto object-contain sponsor-debug-img" height={80} width={240} srcSet={opt ? `${small} 240w, ${opt} 480w` : undefined} loading="eager" onLoad={() => {
                                                try {
                                                    if (typeof window !== 'undefined') {
                                                        (window as any).__sponsorsLoaded = ((window as any).__sponsorsLoaded || 0) + 1;
                                                        if ((window as any).__TV_DEBUG) console.debug('Sponsor loaded:', s.imageUrl);
                                                    }
                                                                                                } catch (err) {/* ignore */ }
                                            }} onError={e => {
                                                 
                                                console.warn('TVPage - sponsor overlay failed to load, replacing with placeholder:', s.imageUrl);
                                                e.currentTarget.src = 'https://placehold.co/240x80?text=Sponsor';
                                            }} />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }



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
            {!showSidebarsAtMain && !showAnnouncement && !showMosaic && !showLeaderboard && (
                <div className="absolute bottom-8 right-8 flex flex-col items-end gap-4">
                    {/* QR Code flutuante */}
                    {!!config?.enableQrCode && (
                        <div className="bg-transparent p-4 rounded-xl animate-fade-in-up">
                            <p className="text-center font-bold mb-2 text-sm uppercase tracking-wider">{config.qrCodeText || 'Participe'}</p>
                            <div className="p-2 rounded-lg bg-transparent">
                                <QRCode value={`${window.location.origin}/participate/${config.slug || ''}`} size={120} />
                            </div>
                        </div>
                    )}
                    {/* Logos dos patrocinadores flutuantes */}
                    {config?.sponsors && config.sponsors.length > 0 && (
                        <div className="flex gap-3 bg-transparent p-0 rounded-xl animate-fade-in-up">
                            {config.sponsors.slice(0, 3).map(s => (
                                <div key={s.id} className="w-40 flex items-center justify-center">
                                    <img src={s.imageUrl} alt={s.name} className="w-full h-auto object-contain sponsor-debug-img" height={80} width={240} onLoad={() => {
                                        try {
                                             
                                            if (typeof window !== 'undefined') {
                                                (window as any).__sponsorsLoaded = ((window as any).__sponsorsLoaded || 0) + 1;
                                                if ((window as any).__TV_DEBUG) console.debug('Sponsor loaded:', s.imageUrl);
                                            }
                                                                                } catch (err) { /* ignore */ }
                                    }} onError={e => {
                                         
                                        console.warn('TVPage - sponsor overlay failed to load:', s.imageUrl);
                                        e.currentTarget.style.display = 'none';
                                    }} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default TVPage;
