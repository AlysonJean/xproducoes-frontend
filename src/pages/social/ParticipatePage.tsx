import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Instagram, Upload, Check, Copy } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { logger } from '../../utils/logger';
import { BrandLoader } from '../../components/ui/BrandLoader';
import { Alert } from '../../components/ui/Alert';
import { Button, buttonVariants } from '../../components/ui/Button';

interface WallConfig {
    name: string;
    hashtag: string;
}

interface TvConfigResponse {
    linked: boolean;
    eventName: string;
    hashtag: string;
}

type CopyState = 'idle' | 'copied' | 'failed';

const ParticipatePage = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [config, setConfig] = useState<WallConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [copyState, setCopyState] = useState<CopyState>('idle');
    const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchConfig = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError(false);
            if (slug) {
                const res = await apiFetch<TvConfigResponse>(`/tv/config?slug=${slug}`);
                if (res.linked) {
                    setConfig({
                        name: res.eventName,
                        hashtag: res.hashtag
                    });
                }
            }
        } catch (err) {
            logger.error("Erro ao carregar configuração", 'ParticipatePage', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    useEffect(() => () => {
        if (copyTimer.current) clearTimeout(copyTimer.current);
    }, []);

    const handleInstagram = async () => {
        if (!config) return;

        // 1. Copia a hashtag. Achado (auditoria): sem try/catch, a tela dizia "copiada" mesmo
        // quando o navegador recusava (página sem HTTPS, permissão negada).
        let copied = false;
        try {
            await navigator.clipboard.writeText(`#${config.hashtag}`);
            copied = true;
        } catch {
            copied = false;
        }
        setCopyState(copied ? 'copied' : 'failed');
        if (copyTimer.current) clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopyState('idle'), 5000);

        // 2. Abre o app do Instagram. Achado: o redirecionamento para a versão web acontecia
        // depois de 1s mesmo se o app tivesse aberto — ao voltar, a pessoa estava no site do
        // Instagram. Agora só redireciona se a página continuar visível (app não abriu).
        const webUrl = `https://www.instagram.com/explore/tags/${encodeURIComponent(config.hashtag)}/`;
        const fallback = window.setTimeout(() => {
            document.removeEventListener('visibilitychange', onHide);
            if (!document.hidden) window.location.href = webUrl;
        }, 1500);
        function onHide() {
            if (document.hidden) {
                window.clearTimeout(fallback);
                document.removeEventListener('visibilitychange', onHide);
            }
        }
        document.addEventListener('visibilitychange', onHide);
        window.location.href = 'instagram://camera';
    };

    const handleDirectUpload = () => {
        navigate(`/upload/${slug}`);
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center bg-background">
                <BrandLoader size="md" label="Carregando mural…" />
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center bg-background p-4">
                <div className="max-w-md w-full">
                    <Alert
                        variant="error"
                        title="Não foi possível carregar o mural"
                        description="Verifique sua conexão e tente de novo."
                        action={<Button size="sm" variant="outline" onClick={fetchConfig}>Tentar de novo</Button>}
                    />
                </div>
            </div>
        );
    }

    if (!config) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center bg-background p-6 text-center">
                <div className="space-y-4">
                    <h1 className="text-2xl font-bold text-foreground">Mural não encontrado</h1>
                    <p className="text-muted-foreground">Confira o link ou o QR Code do evento.</p>
                    <Link to="/" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Voltar para o início</Link>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-[80vh] bg-background text-foreground p-4 sm:p-6 flex items-center justify-center">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground break-words">
                        {config.name}
                    </h1>
                    <p className="text-lg sm:text-xl text-muted-foreground">
                        Participe do nosso mural!
                    </p>
                    <div className="inline-block bg-muted px-4 py-2 rounded-full mt-4 border border-border">
                        <span className="font-mono text-xl font-bold text-foreground">#{config.hashtag}</span>
                    </div>
                </div>

                <div className="grid gap-4 mt-8">
                    {/* Opção 1: Instagram */}
                    <button
                        type="button"
                        onClick={handleInstagram}
                        className="w-full py-6 px-4 bg-card rounded-2xl border border-border shadow-sm hover:bg-muted transition-colors flex flex-col items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring animate-in fade-in slide-in-from-bottom-4 duration-500"
                    >
                        <Instagram className="w-12 h-12 text-primary" aria-hidden="true" />
                        <span className="text-lg font-bold text-foreground">Postar no Instagram</span>
                        <span className="text-sm text-muted-foreground flex items-center justify-center gap-1" aria-live="polite">
                            {copyState === 'copied' ? (
                                <><Check className="w-4 h-4 text-success" aria-hidden="true" /> Hashtag copiada!</>
                            ) : copyState === 'failed' ? (
                                <><Copy className="w-4 h-4" aria-hidden="true" /> Não deu para copiar — use #{config.hashtag}</>
                            ) : (
                                'Copia a hashtag e abre o app'
                            )}
                        </span>
                    </button>

                    {/* Opção 2: envio direto */}
                    <button
                        type="button"
                        onClick={handleDirectUpload}
                        className="w-full py-6 px-4 bg-transparent border-2 border-dashed border-border hover:border-primary/40 hover:bg-muted/50 rounded-2xl flex flex-col items-center gap-3 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring animate-in fade-in slide-in-from-bottom-4 duration-700"
                    >
                        <Upload className="w-10 h-10 text-muted-foreground" aria-hidden="true" />
                        <span className="text-lg font-bold">Enviar direto para o telão</span>
                        <span className="text-sm text-muted-foreground">Não precisa de redes sociais</span>
                    </button>
                </div>

                <div className="text-center text-sm text-muted-foreground mt-12 bg-muted/40 border border-border p-4 rounded-lg">
                    <p className="mb-2 font-bold uppercase tracking-wider text-foreground">Como funciona?</p>
                    <p>Ao postar no Instagram com a hashtag, sua foto pode aparecer no telão do evento — o perfil precisa ser público.</p>
                </div>
            </div>
        </main>
    );
};

export default ParticipatePage;
