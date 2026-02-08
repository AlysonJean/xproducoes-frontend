import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Instagram, Upload, Check } from 'lucide-react';
import { apiFetch } from '../../services/api';

interface WallConfig {
    name: string;
    hashtag: string;
}

const ParticipatePage = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [config, setConfig] = useState<WallConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                if (slug) {
                    const res = await apiFetch<any>(`/tv/config?slug=${slug}`);
                    if (res.linked) {
                        setConfig({
                            name: res.eventName,
                            hashtag: res.hashtag
                        });
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar configuração", err);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, [slug]);

    const handleInstagram = () => {
        if (!config) return;
        
        // 1. Copy Hashtag
        navigator.clipboard.writeText(`#${config.hashtag}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);

        // 2. Open Instagram (Deep Link or Web)
        window.location.href = 'instagram://camera';
        
        // Fallback
        setTimeout(() => {
             window.location.href = `https://www.instagram.com/explore/tags/${config.hashtag}/`;
        }, 1000);
    };

    const handleDirectUpload = () => {
        navigate(`/upload/${slug}`);
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Carregando...</div>;
    if (!config) return <div className="min-h-screen bg-surface flex items-center justify-center text-foreground">Evento não encontrado</div>;

    return (
        <div className="min-h-screen bg-background text-foreground p-6 flex items-center justify-center">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center space-y-2 animate-fade-in-up">
                    <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                        {config.name}
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Participe do nosso mural!
                    </p>
                    <div className="inline-block bg-surface/10 px-4 py-2 rounded-full backdrop-blur-sm mt-4 border border-border/5">
                        <span className="font-mono text-xl font-bold">#{config.hashtag}</span>
                    </div>
                </div>

                <div className="grid gap-6 mt-8">
                    {/* Option 1: Instagram */}
                    <div className="relative group animate-fade-in-up delay-100">
                        <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                        <button 
                            onClick={handleInstagram}
                            className="relative w-full py-6 bg-surface rounded-xl border border-border/10 hover:bg-muted transition-all flex flex-col items-center gap-3 cursor-pointer"
                        >
                            <Instagram className="w-12 h-12 text-primary" />
                            <div className="space-y-1 text-center">
                                <span className="text-lg font-bold block text-foreground">Postar no Instagram</span>
                                <span className="text-xs text-muted-foreground block font-normal flex items-center justify-center gap-1">
                                    {copied ? <><Check size={12}/> Hashtag Copiada!</> : "Copia a hashtag e abre o app"}
                                </span>
                            </div>
                        </button>
                    </div>

                    {/* Option 2: Direct Upload */}
                    <div className="animate-fade-in-up delay-200">
                        <button 
                            onClick={handleDirectUpload}
                            className="w-full py-6 bg-transparent border-2 border-dashed border-border hover:border-muted hover:bg-muted/10 rounded-xl flex flex-col items-center gap-3 text-muted-foreground transition-all cursor-pointer"
                        >
                            <Upload className="w-10 h-10" />
                            <div className="space-y-1 text-center">
                                <span className="text-lg font-bold block">Enviar direto para o Telão</span>
                                <span className="text-xs text-muted-foreground block font-normal">Não precisa de redes sociais</span>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="text-center text-xs text-muted-foreground mt-12 bg-muted/20 p-4 rounded-lg animate-fade-in-up delay-300">
                    <p className="mb-2 font-bold uppercase tracking-wider">Como funciona?</p>
                    <p>Ao postar no Instagram, sua foto aparecerá automaticamente aqui se seu perfil for público.</p>
                </div>
            </div>
        </div>
    );
};

export default ParticipatePage;
