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
    // D22: janela ativa pelo relógio do servidor (ver serverWindowEnd)
    serverNow?: string;
    activeUntil?: string | null;
    activeRule?: 'eventEnd' | 'lastActivity';
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

// D22 (aprovada em 02/11/2026; Q14): TV do mural esquecida ligada. Com a TV visível o tempo todo, os avisos (a
// cada 1 min) e o ranking (a cada 5 min) mantinham o banco acordado 24 h, e a cota mensal do Neon grátis
// acabava em cerca de 17 dias, derrubando a API inteira. Agora a TV fica ativa até o fim da janela que o
// servidor manda (activeUntil: fim do evento + 4 h no mural com reserva; última atividade + 12 h no mural sem
// reserva). Num mural sem reserva, abrir a TV conta como atividade (pelo menos 12 h a partir daí; senão um
// mural montado dias antes pausaria na hora em que a TV fosse ligada na festa) e, com a TV ativa, foto nova,
// foto tirada ou mural editado empurram a janela para 12 h a partir de agora. No fim, a TV confere a
// configuração uma vez; se a janela acabou mesmo, pausa: para avisos e ranking, desliga o socket, segue
// mostrando as fotos já carregadas e avisa no alto da tela. Um toque, uma tecla ou a aba voltando retomam
// por 2 h.
const WALL_IDLE_MS = 12 * 60 * 60 * 1000;
const WALL_RESUME_MS = 2 * 60 * 60 * 1000;
// O setTimeout tem teto (cerca de 24,8 dias): prazo longo (evento daqui a semanas) é conferido de hora em hora.
const WALL_TIMER_MAX_MS = 60 * 60 * 1000;

// Fim da janela do servidor no relógio desta TV: só a diferença activeUntil − serverNow vale, porque o relógio
// da TV costuma estar errado.
const serverWindowEnd = (res: TVConfigResponse): number | null => {
    if (!res.activeUntil || !res.serverNow) return null;
    const remaining = Date.parse(res.activeUntil) - Date.parse(res.serverNow);
    return Number.isFinite(remaining) ? Date.now() + remaining : null;
};

// Aviso discreto da TV pausada, no alto da tela: o QR Code e o "Participe" ficam nas laterais, no centro ou
// embaixo, nunca aqui.
const PausedNotice: React.FC = () => (
    <div role="status" className="absolute top-6 left-1/2 -translate-x-1/2 z-30 max-w-[90%] rounded-full bg-black/70 px-6 py-3 text-center text-xl text-white/80 backdrop-blur-sm pointer-events-none">
        Mural pausado. Toque na tela ou aperte uma tecla para continuar.
    </div>
);

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
    // D22: fim da janela ativa no relógio desta TV (null até a primeira configuração) e a pausa.
    const [windowEnd, setWindowEnd] = useState<number | null>(null);
    const [wallPaused, setWallPaused] = useState(false);
    // Mural sem reserva (a janela anda com a atividade). Ref: lida nos handlers do socket sem reconectar.
    const standaloneRef = useRef(true);

    // Refs for intervals/timeouts
    const nextSlideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchConfig = useCallback(async (): Promise<TVConfigResponse | null> => {
        try {
            const slug = searchParams.get('slug');
            let url = '';
            if (slug) {
                url = `/tv/config?slug=${slug}`;
            } else if (pairingCode) {
                url = `/tv/config?pairingCode=${pairingCode}`;
            }

            if (!url) return null;

            const res = await apiFetch<TVConfigResponse>(url);
            if (res.linked) {
                setConfig({
                    id: res.settingId,
                    settingId: res.settingId,
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
                // D22: o fim da janela no relógio desta TV. Com a TV ativa nunca encolhe; na primeira
                // configuração de um mural sem reserva, abrir a TV conta como atividade (pelo menos 12 h).
                const fromServer = serverWindowEnd(res);
                const standalone = res.activeRule !== 'eventEnd';
                standaloneRef.current = standalone;
                const now = Date.now();
                setWindowEnd(prev => Math.max(fromServer ?? 0, prev ?? 0, prev === null && standalone ? now + WALL_IDLE_MS : 0));
            }
            return res;
        } catch (error) {
            logger.error("Failed to load config", 'TVPage', error);
            return null;
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

    // 1.5 Fetch Announcements (D22: parados com a TV pausada; ao retomar, busca na hora)
    useEffect(() => {
        if (!config?.settingId || wallPaused) return;
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
    }, [config?.settingId, wallPaused]);

    // Fetch Leaderboard periodically (D22: a rota pública passou a existir; parado com a TV pausada)
    useEffect(() => {
        if (!config?.enableGamification || !config.settingId || wallPaused) return;

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
    }, [config?.settingId, config?.enableGamification, wallPaused]);

    // 2. Socket Connection
    // D5 (aprovada em 02/11/2026): a TV entra só na sala do mural (wall:), a única aberta sem login. O plano B
    // `event:<reserva>` nunca funcionava (/tv/config não manda eventId) e essa sala agora é só da equipe do
    // evento. Sem mural (o de teste do localhost), não conecta.
    useEffect(() => {
        if (!config?.settingId || wallPaused) return; // D22: pausada, sem socket (a limpeza desconecta)

        // Conecta sempre na porta correta do backend
        const socket = io(SOCKET_URL, {
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });

        const roomId = `wall:${config.settingId}`;

        // D22: com a TV ativa, foto nova, foto tirada ou mural editado contam como atividade de um mural sem
        // reserva: a janela vai para 12 h a partir de agora.
        const extendForActivity = () => {
            if (!standaloneRef.current) return;
            const until = Date.now() + WALL_IDLE_MS;
            setWindowEnd(prev => Math.max(prev ?? 0, until));
        };

        socket.on('connect', () => {
            socket.emit('join', roomId);
        });

        socket.on('connect_error', (error) => {
            logger.error('Socket connection error:', 'TVPage', error);
        });

        socket.on('post:new', (post: SocialPost) => {
            extendForActivity();
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
            extendForActivity();
            setPosts(prev => prev.filter(p => p.id !== id));
        });

        socket.on('config:update', () => {
            extendForActivity();
            fetchConfig();
        });

        return () => {
            socket.disconnect();
        };
    }, [config?.settingId, wallPaused, fetchConfig]);

    // D22: fim da janela ativa. Confere a configuração uma vez (pode ter havido atividade que o servidor já
    // conta) e, se a janela acabou mesmo, pausa.
    useEffect(() => {
        if (!config?.settingId || wallPaused || windowEnd === null) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const check = async () => {
            const remaining = windowEnd - Date.now();
            if (remaining > 0) {
                timer = setTimeout(check, Math.min(remaining, WALL_TIMER_MAX_MS));
                return;
            }
            const res = await fetchConfig();
            if (cancelled) return;
            const fresh = res?.linked ? serverWindowEnd(res) : null;
            if (fresh === null || fresh <= Date.now()) setWallPaused(true);
        };
        timer = setTimeout(check, Math.min(Math.max(windowEnd - Date.now(), 0), WALL_TIMER_MAX_MS));
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [config?.settingId, wallPaused, windowEnd, fetchConfig]);

    // D22: TV pausada. Um toque, uma tecla (controle remoto) ou a aba voltando retomam por 2 h: a configuração é
    // buscada de novo (pode ter havido atividade) e os efeitos acima voltam a buscar avisos e ranking e
    // reconectam o socket.
    useEffect(() => {
        if (!wallPaused) return;
        const resume = () => {
            setWindowEnd(Date.now() + WALL_RESUME_MS);
            setWallPaused(false);
            void fetchConfig();
        };
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
    }, [wallPaused, fetchConfig]);

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
                {wallPaused && <PausedNotice />}
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

            {wallPaused && <PausedNotice />}
        </div>
    );
}

export default TVPage;
