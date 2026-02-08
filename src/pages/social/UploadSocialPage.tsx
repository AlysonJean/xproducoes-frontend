import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, Send, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../../services/api';

interface WallConfig {
    name: string;
    hashtag: string;
    qrCodeText?: string;
}

const UploadSocialPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    
    const [config, setConfig] = useState<WallConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [author, setAuthor] = useState('');
    const [caption, setCaption] = useState('');

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                if (slug) {
                    // Usando o endpoint de config da TV que já aceita slug
                    const res = await apiFetch<any>(`/tv/config?slug=${slug}`);
                    if (res.linked) {
                        setConfig({
                            name: res.eventName,
                            hashtag: res.hashtag,
                            qrCodeText: res.qrCodeText
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !slug) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('image', file);
            formData.append('author', author || 'Convidado');
            formData.append('caption', caption);

            await apiFetch(`/public/social/upload/${slug}`, {
                method: 'POST',
                body: formData
            });

            setSuccess(true);
            setTimeout(() => {
                navigate(`/participate/${slug}`);
            }, 5000);
        } catch (err) {
            console.error("Upload failed", err);
            alert("Falha ao enviar foto. Tente novamente.");
        } finally {
            setUploading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-surface flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
    );

    if (!config) return (
        <div className="min-h-screen bg-surface flex items-center justify-center text-foreground p-6 text-center">
            <div>
                <h2 className="text-2xl font-bold mb-2">Evento não encontrado</h2>
                <button onClick={() => navigate('/')} className="text-primary underline">Voltar para Início</button>
            </div>
        </div>
    );

    if (success) return (
        <div className="min-h-screen bg-surface flex items-center justify-center text-foreground p-6 text-center animate-fade-in">
            <div className="space-y-6 max-w-sm">
                <div className="flex justify-center">
                    <CheckCircle2 className="w-24 h-24 text-success animate-bounce" />
                </div>
                <h2 className="text-3xl font-bold">Foto Enviada!</h2>
                <p className="text-muted-foreground">
                    Sua foto foi enviada com sucesso para o mural. 
                    {config.qrCodeText ? ` Em breve ela aparecerá no telão!` : " Aguarde a moderação para vê-la no telão!"}
                </p>
                <div className="pt-8">
                    <button 
                        onClick={() => navigate(`/participate/${slug}`)}
                        className="w-full py-4 bg-surface/10 rounded-xl font-bold hover:bg-surface/20 transition-all"
                    >
                        Voltar
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Header */}
            <div className="p-4 flex items-center gap-4 bg-black/50 backdrop-blur-md sticky top-0 z-10 border-b border-white/5">
                <button 
                    onClick={() => navigate(-1)} 
                    className="p-2 hover:bg-muted/10 rounded-full transition-all"
                    aria-label="Voltar"
                >
                    <ChevronLeft size={24} />
                </button>
                <div>
                    <h1 className="font-bold text-lg truncate max-w-[200px]">{config.name}</h1>
                    <p className="text-xs text-muted-foreground">Enviar para o Mural</p>
                </div>
            </div>

            <main className="flex-1 p-6 max-w-lg mx-auto w-full">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Image Upload Area */}
                    <div 
                        onClick={() => document.getElementById('photo-input')?.click()}
                        className={`relative aspect-square rounded-3xl border-2 border-dashed overflow-hidden flex flex-col items-center justify-center transition-all cursor-pointer
                            ${previewUrl ? 'border-transparent' : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700'}
                        `}
                        role="button"
                        aria-label="Selecionar ou tirar foto"
                    >
                        {previewUrl ? (
                            <>
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-surface/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <Camera size={48} className="text-foreground" />
                                </div>
                            </>
                        ) : (
                            <div className="text-center p-8 space-y-4">
                                <div className="w-20 h-20 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto">
                                    <Camera className="text-primary" size={32} />
                                </div>
                                <div>
                                    <p className="font-bold text-lg">Tirar uma Foto</p>
                                    <p className="text-sm text-gray-500">ou selecione da sua galeria</p>
                                                                    <p className="text-sm text-muted-foreground">ou selecione da sua galeria</p>
                                </div>
                            </div>
                        )}
                        <input 
                            id="photo-input"
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            onChange={handleFileChange}
                            className="hidden"
                            aria-label="Upload de foto"
                        />
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="author-input" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 px-1">Seu Nome / @User</label>
                                                        <label htmlFor="author-input" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">Seu Nome / @User</label>
                            <input 
                                id="author-input"
                                type="text"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                placeholder="Como quer ser identificado?"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
                                                            className="w-full bg-surface border border-border rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                            />
                        </div>

                        <div>
                            <label htmlFor="caption-input" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 px-1">Legenda (Opcional)</label>
                                                        <label htmlFor="caption-input" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">Legenda (Opcional)</label>
                            <textarea 
                                id="caption-input"
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                placeholder="Escreva algo legal..."
                                rows={3}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all resize-none"
                                                            className="w-full bg-surface border border-border rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button 
                            type="submit"
                            disabled={!file || uploading}
                            className={`w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-pink-500/20
                                ${!file || uploading 
                                    ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                                    : 'bg-primary text-primary-foreground hover:scale-[1.02] active:scale-95'}
                            `}
                        >
                            {uploading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send size={20} />
                                    Enviar para o Mural
                                </>
                            )}
                        </button>
                        <p className="text-center text-[10px] text-gray-600 mt-4 px-8 uppercase tracking-widest font-bold">
                            #{config.hashtag} • X-Produções Social
                        </p>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default UploadSocialPage;
