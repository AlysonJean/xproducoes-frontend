import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Camera, Send, ChevronLeft, CheckCircle2, RefreshCw } from 'lucide-react';
import { apiFetch } from '../../services/api';
import { logger } from '../../utils/logger';
import { BrandLoader } from '../../components/ui/BrandLoader';
import { Alert } from '../../components/ui/Alert';
import { Button, buttonVariants } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { cn } from '../../utils/cn';

interface WallConfig {
    name: string;
    hashtag: string;
    qrCodeText?: string;
}

interface TvConfigResponse {
    linked: boolean;
    eventName?: string;
    hashtag?: string;
    qrCodeText?: string;
}

interface UploadedPost {
    status?: 'APPROVED' | 'PENDING' | 'REJECTED';
}

// Achado (auditoria ponta a ponta): toda falha do envio virava "verifique sua conexão", inclusive foto
// grande demais, formato não aceito, mural ocupado e limite de envios, em que tentar de novo do mesmo
// jeito não resolve (ou só resolve depois de esperar). Esses textos vêm do backend
// (middlewares/publicWallUpload.ts e os limites do mural em rateLimitMiddleware.ts) e aparecem como
// chegam; o resto (queda de rede, tempo esgotado, erro de proxy) segue com a mensagem genérica.
const GUEST_UPLOAD_SERVER_MESSAGE = /^(Foto muito grande|Envie uma foto|Muitos envios ao mesmo tempo|Muitas fotos|Mural não encontrado)/;

const UploadSocialPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [config, setConfig] = useState<WallConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [postStatus, setPostStatus] = useState<UploadedPost['status']>();

    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [author, setAuthor] = useState('');
    const [caption, setCaption] = useState('');

    const fetchConfig = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError(false);
            if (slug) {
                const res = await apiFetch<TvConfigResponse>(`/tv/config?slug=${slug}`);
                if (res.linked) {
                    setConfig({
                        name: res.eventName || '',
                        hashtag: res.hashtag || '',
                        qrCodeText: res.qrCodeText
                    });
                }
            }
        } catch (err) {
            logger.error("Erro ao carregar configuração", 'UploadSocialPage', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    // Libera a URL da prévia ao trocar de foto ou sair da página.
    useEffect(() => () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    // Volta sozinho para a página do mural alguns segundos depois do envio.
    useEffect(() => {
        if (!success) return;
        const timer = setTimeout(() => navigate(`/participate/${slug}`), 5000);
        return () => clearTimeout(timer);
    }, [success, navigate, slug]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
            setSubmitError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !slug) return;

        try {
            setUploading(true);
            setSubmitError(null);
            const formData = new FormData();
            formData.append('image', file);
            formData.append('author', author || 'Convidado');
            formData.append('caption', caption);

            const post = await apiFetch<UploadedPost>(`/public/social/upload/${slug}`, {
                method: 'POST',
                body: formData
            });

            setPostStatus(post?.status);
            setSuccess(true);
        } catch (err) {
            logger.error("Upload failed", 'UploadSocialPage', err);
            // Achado (auditoria): o erro aparecia num alert() nativo.
            const serverMessage = err instanceof Error && GUEST_UPLOAD_SERVER_MESSAGE.test(err.message) ? err.message : null;
            setSubmitError(serverMessage ?? 'Falha ao enviar a foto. Verifique sua conexão e tente de novo.');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] bg-background flex items-center justify-center">
                <BrandLoader size="md" label="Carregando mural…" />
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-[60vh] bg-background flex items-center justify-center p-4">
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
            <div className="min-h-[60vh] bg-background flex items-center justify-center text-foreground p-6 text-center">
                <div className="space-y-4">
                    <h1 className="text-2xl font-bold">Mural não encontrado</h1>
                    <p className="text-muted-foreground">Confira o link ou o QR Code do evento.</p>
                    <Link to="/" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Voltar para o início</Link>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-[60vh] bg-background flex items-center justify-center text-foreground p-6 text-center animate-in fade-in duration-500">
                <div className="space-y-6 max-w-sm">
                    <div className="flex justify-center">
                        <CheckCircle2 className="w-24 h-24 text-success" aria-hidden="true" />
                    </div>
                    <h1 className="text-3xl font-bold">Foto enviada!</h1>
                    <p className="text-muted-foreground" role="status">
                        Sua foto foi enviada para o mural.
                        {/* Achado: a mensagem dependia de `qrCodeText` (texto do QR, sem relação com
                            moderação). Agora usa o status real do post devolvido pelo backend. */}
                        {postStatus === 'APPROVED'
                            ? ' Em breve ela aparecerá no telão!'
                            : ' Ela aparece no telão depois de aprovada pela moderação.'}
                    </p>
                    <div className="pt-4">
                        <Button
                            variant="outline"
                            fullWidth
                            onClick={() => navigate(`/participate/${slug}`)}
                        >
                            Voltar
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[80vh] bg-background text-foreground flex flex-col">
            {/* Cabeçalho. Não é mais `sticky top-0`: a página roda dentro do layout público, e o
                cabeçalho fixo do site cobria esta barra ao rolar. */}
            <div className="px-4 py-3 flex items-center gap-3 bg-background border-b border-border">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    onClick={() => navigate(-1)}
                    aria-label="Voltar"
                >
                    <ChevronLeft className="w-6 h-6" />
                </Button>
                <div className="min-w-0">
                    <h1 className="font-bold text-lg truncate">{config.name}</h1>
                    <p className="text-sm text-muted-foreground">Enviar para o mural</p>
                </div>
            </div>

            <main className="flex-1 p-4 sm:p-6 max-w-lg mx-auto w-full">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Área da foto. Achado (auditoria): era uma <div role="button"> sem foco de teclado,
                        com `capture="environment"` (abria direto a câmera em vários Android, sem opção de
                        galeria) e cores fixas zinc-900 — texto escuro sobre quase-preto no tema claro. */}
                    <input
                        ref={fileInputRef}
                        id="photo-input"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="sr-only"
                        tabIndex={-1}
                        aria-hidden="true"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        aria-label={previewUrl ? 'Trocar foto' : 'Tirar uma foto ou escolher da galeria'}
                        className={cn(
                            'relative w-full aspect-square rounded-3xl border-2 border-dashed overflow-hidden flex flex-col items-center justify-center transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                            previewUrl ? 'border-transparent' : 'border-border bg-muted/40 hover:bg-muted'
                        )}
                    >
                        {previewUrl ? (
                            <>
                                <img src={previewUrl} alt="Prévia da foto escolhida" className="w-full h-full object-cover" />
                                {/* Sempre visível (antes só no hover — sumia no celular). */}
                                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white">
                                    <RefreshCw className="w-4 h-4" aria-hidden="true" /> Trocar foto
                                </span>
                            </>
                        ) : (
                            <span className="text-center p-8 space-y-4 block">
                                <span className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                    <Camera className="text-primary w-8 h-8" aria-hidden="true" />
                                </span>
                                <span className="block">
                                    <span className="block font-bold text-lg text-foreground">Tirar uma foto</span>
                                    <span className="block text-sm text-muted-foreground">ou escolher da sua galeria</span>
                                </span>
                            </span>
                        )}
                    </button>

                    <div className="space-y-4">
                        <Input
                            id="author-input"
                            label="Seu nome ou @usuário"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            placeholder="Como quer ser identificado?"
                        />

                        <Textarea
                            id="caption-input"
                            label="Legenda (opcional)"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="Escreva algo legal..."
                            rows={3}
                            resize="none"
                        />
                    </div>

                    {submitError && <Alert variant="error" description={submitError} />}

                    <div className="pt-2">
                        <Button
                            type="submit"
                            size="lg"
                            fullWidth
                            disabled={!file}
                            isLoading={uploading}
                            leftIcon={<Send className="w-5 h-5" />}
                        >
                            {uploading ? 'Enviando...' : 'Enviar para o mural'}
                        </Button>
                        {!file && (
                            <p className="text-center text-sm text-muted-foreground mt-2">Escolha uma foto para enviar.</p>
                        )}
                        <p className="text-center text-xs text-muted-foreground mt-4 px-8 uppercase tracking-widest font-bold">
                            #{config.hashtag} • X Produções
                        </p>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default UploadSocialPage;
