import React, { useState, useEffect, memo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { apiFetch } from '../../services/api';
import { SOCKET_URL } from '../../utils/apiConfig';
import QRCode from 'react-qr-code';
import { socialService, SocialAnnouncement } from '../../services/socialService';
import { AnnouncementSlide } from '../../components/social/AnnouncementSlide';
import { MosaicSlide } from '../../components/social/MosaicSlide';
import { LeaderboardSlide } from '../../components/social/LeaderboardSlide';
import { logger } from '../../utils/logger';

// URL pública para o QR Code: em produção, VITE_PUBLIC_URL (com protocolo); senão, a origem atual.
// Achado (auditoria): um dos QR Codes usava window.location.origin direto e os outros esta função.
const getPublicBase = () =>
    import.meta.env.VITE_PUBLIC_URL || (typeof window !== 'undefined' ? window.location.origin : '');

const participateUrl = (slug?: string) => `${getPublicBase()}/participate/${slug || ''}`;

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

interface TVConfigResponse {
    linked: boolean;
    settingId: string;
    eventId?: string;
    eventName: string;
    hashtag?: string;
    layoutMode?: 'LANDSCAPE' | 'PORTRAIT';
    slug?: string;
    sponsors?: SponsorLogo[];
    enableQrCode?: boolean;
    qrCodeText?: string;
    enableMosaic?: boolean;
    mosaicFrequency?: number;
    enableGamification?: boolean;
}

interface LeaderboardItem {
    username: string;
    avatarUrl?: string;
    count: number;
    platform: string;
}

// Dev-only fallback: permite testar logos/QR sem backend definindo VITE_TV_DEV_FALLBACK=true
// (ou rodando em localhost/127.0.0.1). Calculado uma única vez no carregamento do módulo —
// usado como inicializador preguiçoso do useState abaixo, para não precisar de um useEffect
// só para popular estado inicial (evita setState síncrono dentro de um efeito).
const TV_DEV_FALLBACK_ENABLED = (import.meta.env.DEV && import.meta.env.VITE_TV_DEV_FALLBACK === 'true') || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

const TV_DEV_FALLBACK_CONFIG: WallConfig = {
    id: 'dev-sample',
    name: 'Mural de teste',
    hashtag: 'muraldev',
    layoutMode: 'LANDSCAPE',
    enableQrCode: true,
    qrCodeText: 'Participe',
    slug: 'dev-sample',
    sponsors: [],
    enableMosaic: true,
    mosaicFrequency: 6,
    enableGamification: false,
};

if (TV_DEV_FALLBACK_ENABLED && typeof window !== 'undefined' && (window as unknown as { __TV_DEBUG?: boolean }).__TV_DEBUG) {
    console.info('TV Debug - applying dev fallback config for local testing');
}

// Imagem otimizada do Cloudinary (quando a URL é de lá).
const cloudinary = (url: string, transform: string) =>
    url && url.includes('/upload/') ? url.replace('/upload/', `/upload/${transform}/`) : url;

/*
 * MODO APRESENTAÇÃO
 * Achado (auditoria do design system): o slide usava tokens do tema (text-foreground, text-primary,
 * bg-surface — que nem existe) dentro de uma raiz `bg-black text-white`. Num navegador em tema claro,
 * hashtag, legenda e @autor ficavam escuros sobre fundo escuro; as telas de pareamento e "sem posts"
 * saíam brancas. Agora todo o telão é escuro fixo (`bg-black`, `text-white`, `text-white/70`,
 * `bg-black/50`), como os slides de anúncio e ranking, e os textos têm tamanho para leitura a metros.
 */

// Logo de patrocinador: object-contain (antes object-cover cortava as marcas) e, se a imagem falhar,
// some — em vez de mostrar um placeholder "Sponsor" de um serviço externo no telão do cliente.
const SponsorImage: React.FC<{ sponsor: SponsorLogo; className?: string }> = ({ sponsor, className = '' }) => {
    const [failed, setFailed] = useState(false);
    if (failed || !sponsor.imageUrl) return null;
    return (
        <img
            src={cloudinary(sponsor.imageUrl, 'w_600,c_limit,q_auto')}
            srcSet={sponsor.imageUrl.includes('/upload/')
                ? `${cloudinary(sponsor.imageUrl, 'w_300,c_limit,q_auto')} 300w, ${cloudinary(sponsor.imageUrl, 'w_600,c_limit,q_auto')} 600w`
                : undefined}
            alt={sponsor.name || 'Patrocinador'}
            className={`object-contain sponsor-debug-img ${className}`}
            loading="eager"
            onLoad={() => {
                try {
                    if (typeof window !== 'undefined') {
                        window.__sponsorsLoaded = (window.__sponsorsLoaded || 0) + 1;
                        if (window.__TV_DEBUG) console.debug('Sponsor loaded:', sponsor.imageUrl);
                    }
                } catch { /* ignore */ }
            }}
            onError={() => {
                logger.warn('TVPage - sponsor image failed to load:', 'TVPage', sponsor.imageUrl);
                setFailed(true);
            }}
        />
    );
};

// QR Code com moldura branca (zona de silêncio) — sem ela, a leitura a distância falha.
const ParticipateQr: React.FC<{ slug?: string; size: number; label?: string }> = ({ slug, size, label }) => (
    <div className="flex flex-col items-center gap-3">
        <div className="bg-white p-4 rounded-2xl shadow-2xl">
            <QRCode value={participateUrl(slug)} size={size} level="M" />
        </div>
        {label && <p className="text-white text-xl font-bold text-center uppercase tracking-wide">{label}</p>}
        {typeof window !== 'undefined' && window.__TV_DEBUG && (
            <p className="text-sm text-white/70 break-all max-w-xs text-center">{participateUrl(slug)}</p>
        )}
    </div>
);

const HashtagCta: React.FC<{ hashtag?: string }> = ({ hashtag }) => (
    <div className="text-white text-center">
        <p className="text-xl uppercase tracking-widest mb-2 text-white/70">Participe</p>
        <p className="font-bold text-4xl xl:text-5xl drop-shadow-md break-all">#{hashtag || 'mural'}</p>
    </div>
);

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

    // Assume conteúdo vertical: em TV horizontal, mostra as barras laterais (hashtag/QR e patrocínio).
    const isVerticalContent = true;
    const hasSponsors = !!sponsors && sponsors.length > 0;
    const showSidebars = isLandscapeMode && isVerticalContent && (hasSponsors || !!showQrCode);

    if (typeof window !== 'undefined' && window.__TV_DEBUG) {
        console.debug('SlideComponent - sponsors', sponsors?.map(s => ({ id: s.id, url: s.imageUrl })), 'showSidebars', showSidebars);
    }

    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black text-white animate-in fade-in duration-1000">
            {/* Fundo desfocado */}
            <div className="absolute inset-0 bg-black overflow-hidden z-0">
                <img src={optimizedUrl} className="w-full h-full object-cover opacity-30 blur-xl scale-110" alt="" />
            </div>

            <div className="z-10 relative flex w-full h-full">
                {/* Barra esquerda: hashtag + QR. Achado: renderizava sempre (mesmo em TV vertical ou
                    sem QR/patrocínio), enquanto a direita era condicional; e os dois lados repetiam QR e
                    logos — com o QR flutuante, chegava a haver 2 QR Codes na tela. */}
                {showSidebars && (
                    <aside className="flex flex-col justify-center items-center w-1/4 bg-black/50 backdrop-blur-sm p-8 gap-10 h-full border-r border-white/10">
                        <HashtagCta hashtag={hashtag} />
                        {showQrCode && slug && <ParticipateQr slug={slug} size={200} label={qrCodeText} />}
                    </aside>
                )}

                {/* Conteúdo principal */}
                <div className={`flex-1 flex items-center justify-center relative ${showSidebars ? 'p-6' : 'p-0'}`}>
                    <img
                        src={optimizedUrl}
                        alt={post.caption || `Foto de ${post.author}`}
                        className="max-h-full max-w-full object-contain shadow-2xl rounded-sm"
                    />

                    {post.caption && (
                        <div className="absolute bottom-10 left-0 right-0 text-center px-6">
                            <div className="bg-black/60 backdrop-blur-md inline-block px-8 py-4 rounded-full text-white text-2xl xl:text-3xl font-medium max-w-[90%] truncate">
                                <span className="font-bold mr-3">@{post.author}</span>
                                <span className="text-white/90">{post.caption}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Barra direita: patrocinadores (ou, sem patrocínio, a hashtag para equilibrar). */}
                {showSidebars && (
                    <aside className="flex flex-col justify-center items-center w-1/4 bg-black/50 backdrop-blur-sm p-8 gap-8 h-full border-l border-white/10">
                        {hasSponsors ? (
                            <>
                                <p className="text-xl uppercase tracking-widest text-white/70">Patrocínio</p>
                                <div className="grid grid-cols-1 gap-6 w-full">
                                    {sponsors!.slice(0, 3).map(s => (
                                        <div key={s.id} className="w-full flex items-center justify-center">
                                            <SponsorImage sponsor={s} className="w-full max-h-28" />
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <HashtagCta hashtag={hashtag} />
                        )}
                    </aside>
                )}
            </div>
        </div>
    );
});

// QR e logos flutuantes, para layouts sem barras laterais (TV vertical ou sem QR/patrocínio).
const FloatingOverlay: React.FC<{ config: WallConfig }> = ({ config }) => (
    <div className="absolute bottom-8 right-8 flex flex-col items-end gap-6 animate-in fade-in duration-700">
        {!!config.enableQrCode && config.slug && (
            <ParticipateQr slug={config.slug} size={160} label={config.qrCodeText || 'Participe'} />
        )}
        {config.sponsors && config.sponsors.length > 0 && (
            <div className="flex gap-4 bg-black/50 backdrop-blur-sm p-4 rounded-2xl">
                {config.sponsors.slice(0, 3).map(s => (
                    <div key={s.id} className="w-44 h-20 flex items-center justify-center">
                        <SponsorImage sponsor={s} className="max-w-full max-h-full" />
                    </div>
                ))}
            </div>
        )}
    </div>
);

// Achado (auditoria ponta a ponta): a tela de pareamento consultava /tv/config (que lê o banco) a
// cada 5 s sem prazo — e a TV fica ligada e visível, então uma TV esquecida nessa tela mantinha o
// banco (Neon free) acordado 24 h e gastava a cota mensal. A busca agora para depois de
// PAIRING_WINDOW_MS; a tela avisa, e um toque, uma tecla do controle ou a aba voltar a ficar visível
// retomam com o MESMO código (sem ?code= na URL, recarregar a página sortearia outro).
const PAIRING_POLL_MS = 5000;
const PAIRING_WINDOW_MS = 15 * 60 * 1000;

const TVPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [config, setConfig] = useState<WallConfig | null>(() => TV_DEV_FALLBACK_ENABLED ? TV_DEV_FALLBACK_CONFIG : null);
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
    const [slidesSinceLeaderboard, setSlidesSinceLeaderboard] = useState(0);

    const [pairingCode] = useState<string>(() => {
        const code = searchParams.get('code');
        if (code) return code;
        return Math.floor(1000 + Math.random() * 9000).toString();
    });
    const [pairingPaused, setPairingPaused] = useState(false);

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

            const res = await apiFetch<TVConfigResponse>(url);
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
            logger.error("Failed to load config", 'TVPage', error);
        }
    }, [searchParams, pairingCode]); // fetchConfig não lê `config` — a checagem "só busca se ainda não tem" é feita pelo chamador

    useEffect(() => {
        if (config || pairingPaused) return;
        const startedAt = Date.now();
        const tick = () => {
            if (Date.now() - startedAt >= PAIRING_WINDOW_MS) {
                setPairingPaused(true); // janela esgotada: para até alguém retomar
                return;
            }
            if (document.hidden) return; // Pausa polling se a aba não estiver visível
            fetchConfig();
        };

        // Busca inicial + polling unificados no mesmo `tick`. A busca inicial roda via
        // setTimeout (não direto no corpo do efeito) para não disparar setState de forma
        // síncrona dentro do efeito (react-hooks/set-state-in-effect).
        const initial = setTimeout(tick, 0);
        const interval = setInterval(tick, PAIRING_POLL_MS);

        return () => {
            clearTimeout(initial);
            clearInterval(interval);
        };
    }, [fetchConfig, config, pairingPaused]);

    // Pareamento pausado: um toque, uma tecla (controle remoto) ou a aba voltar a ficar visível
    // retomam a busca, com o mesmo código.
    useEffect(() => {
        if (!pairingPaused) return;
        const resume = () => setPairingPaused(false);
        const onVisibilityChange = () => {
            if (!document.hidden) resume();
        };
        window.addEventListener('pointerdown', resume);
        window.addEventListener('keydown', resume);
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            window.removeEventListener('pointerdown', resume);
            window.removeEventListener('keydown', resume);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [pairingPaused]);

    // Warn when QR is enabled but slug is missing (always declared to keep Hooks order stable)
    useEffect(() => {
        if (config?.enableQrCode && !config?.slug) {
            logger.warn('TV Debug - QR is enabled but config.slug is missing. QR will not be rendered.', 'TVPage');
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
                logger.error('Erro', 'TVPage', err);
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
                logger.error("Failed to fetch leaderboard", 'TVPage', err);
            }
        };

        fetchLeaderboard();
        const interval = setInterval(() => {
            if (document.hidden) return; // Pausa polling se aba inativa
            fetchLeaderboard();
        }, 60000 * 5); // 5 min
        return () => clearInterval(interval);
    }, [config?.settingId, config?.enableGamification]);

    // 2. Socket Connection
    useEffect(() => {
        if (!config) return;

        // Conecta sempre na porta correta do backend
        const socket = io(SOCKET_URL, {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });

        const roomId = config.settingId ? `wall:${config.settingId}` : `event:${config.eventId}`;

        socket.on('connect', () => {
            socket.emit('join', roomId);
        });

        socket.on('connect_error', (error) => {
            logger.error('Socket connection error:', 'TVPage', error);
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
                    setActiveIndex(prev => (prev + 1) % posts.length);
                }
                else if (showMosaic) {
                    setShowMosaic(false);
                    setSlidesSinceMosaic(0);
                    setActiveIndex(prev => (prev + 1) % posts.length);
                }
                else if (showLeaderboard) {
                    setShowLeaderboard(false);
                    setSlidesSinceLeaderboard(0);
                    setActiveIndex(prev => (prev + 1) % posts.length);
                }
                else {
                    // Currently showing post. Check triggers.
                    const nextAnnounceCounter = slidesSinceAnnouncement + 1;
                    const dueAnnouncement = announcements.find(a => nextAnnounceCounter >= (a.frequency || 10));

                    const nextMosaicCounter = slidesSinceMosaic + 1;
                    const mosaicFreq = config?.mosaicFrequency || 15;
                    const dueMosaic = config?.enableMosaic && nextMosaicCounter >= mosaicFreq;

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

    // Estados de pareamento / carregamento — mesmo modo apresentação (fundo preto fixo).
    if (!config && pairingCode) {
        return (
            <div className="w-screen h-screen bg-black text-white flex flex-col items-center justify-center gap-6 p-8 text-center">
                <p className="text-2xl uppercase tracking-widest text-white/70">Código de pareamento</p>
                <h1 className="text-8xl font-bold tracking-widest">{pairingCode}</h1>
                <p className="text-3xl text-white/70">No painel, entre em Admin › Social para parear esta TV</p>
                {pairingPaused && (
                    <div role="status" className="flex flex-col items-center gap-4 mt-6">
                        <p className="text-2xl text-white/70">
                            Pareamento pausado após {PAIRING_WINDOW_MS / 60000} minutos. Toque na tela ou aperte qualquer tecla para continuar.
                        </p>
                        <button
                            type="button"
                            onClick={() => setPairingPaused(false)}
                            className="rounded-full bg-white px-8 py-4 text-2xl font-bold text-black focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
                        >
                            Continuar pareamento
                        </button>
                    </div>
                )}
            </div>
        );
    }

    if (!config) {
        return (
            <div className="bg-black w-screen h-screen flex items-center justify-center text-white text-3xl" role="status">
                Carregando telão…
            </div>
        );
    }

    const isVerticalContent = true; // Mesma regra do SlideComponent
    const showSidebarsAtMain = config.layoutMode === 'LANDSCAPE' && isVerticalContent && ((config.sponsors && config.sponsors.length > 0) || config.enableQrCode);

    // Sem posts ainda: tela própria de convite (antes, um "post" falso com a imagem de um
    // patrocinador ou um placeholder externo em inglês "No posts yet").
    if (posts.length === 0) {
        return (
            <div className="relative w-screen h-screen bg-black text-white overflow-hidden font-sans selection:bg-white selection:text-black">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-black to-black" aria-hidden="true" />
                <div className="relative z-10 h-full flex flex-col items-center justify-center gap-10 p-12 text-center">
                    <h1 className="text-6xl xl:text-7xl font-bold tracking-tight">{config.name}</h1>
                    <p className="text-3xl xl:text-4xl text-white/70">Mande sua foto e apareça no telão!</p>
                    <div className="flex flex-wrap items-center justify-center gap-16">
                        <HashtagCta hashtag={config.hashtag} />
                        {!!config.enableQrCode && config.slug && (
                            <ParticipateQr slug={config.slug} size={240} label={config.qrCodeText || 'Aponte a câmera'} />
                        )}
                    </div>
                    {config.sponsors && config.sponsors.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-8 bg-black/50 p-6 rounded-2xl">
                            {config.sponsors.slice(0, 4).map(s => (
                                <div key={s.id} className="w-48 h-24 flex items-center justify-center">
                                    <SponsorImage sponsor={s} className="max-w-full max-h-full" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const currentPost = posts[activeIndex] ?? posts[0];

    return (
        <div className="relative w-screen h-screen bg-black text-white overflow-hidden font-sans selection:bg-white selection:text-black">
            {/* Fundo desfocado */}
            <div className="absolute inset-0 z-0 opacity-40 scale-110 pointer-events-none">
                {currentPost && (
                    <img
                        src={cloudinary(currentPost.mediaUrl, 'w_100,c_scale,q_auto')}
                        className="w-full h-full object-cover blur-3xl"
                        alt=""
                    />
                )}
            </div>

            {/* Conteúdo */}
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
                        isLandscapeMode={config.layoutMode === 'LANDSCAPE'}
                        sponsors={config.sponsors}
                        hashtag={config.hashtag}
                        showQrCode={config.enableQrCode}
                        qrCodeText={config.qrCodeText}
                        slug={config.slug}
                    />
                ) : null}
            </div>

            {/* QR e logos flutuantes em layouts sem barras laterais */}
            {!showSidebarsAtMain && !showAnnouncement && !showMosaic && !showLeaderboard && (
                <FloatingOverlay config={config} />
            )}
        </div>
    );
}

export default TVPage;
