import { memo } from 'react';

interface SocialPost {
    id: string;
    mediaUrl: string;
    caption?: string;
    author: string;
    status: 'APPROVED' | 'PENDING' | 'REJECTED';
}

interface MosaicSlideProps {
    posts: SocialPost[];
}

// Slide do telão: modo apresentação escuro fixo (exceção do guia), sem tokens do tema.
// Achado (auditoria): usava `bg-surface`/`from-surface` (token inexistente), tinha os blocos do
// rodapé e do título duplicados e aninhados (sobra de merge — um com `text-foreground`, escuro no
// tema claro sobre fundo preto), e o atraso por item vinha de `delay-[${…}ms]` montado em tempo de
// execução, que o Tailwind não gera. `animate-fade-in-up` também não existia.
export const MosaicSlide = memo(({ posts }: MosaicSlideProps) => {
    // Até 12 posts: grade 4x3, boa para 16:9
    const displayPosts = posts.slice(0, 12);

    return (
        <div className="absolute inset-0 bg-black z-40 p-4 animate-fade-in flex items-center justify-center text-white">
            <div className="z-10 grid grid-cols-4 gap-4 w-full h-full p-8 max-w-[1920px] mx-auto">
                {displayPosts.map((post, index) => (
                    <div
                        key={post.id}
                        className="relative rounded-lg overflow-hidden shadow-lg border border-white/10 aspect-square animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <img
                            src={post.mediaUrl.replace('/upload/', '/upload/w_500,h_500,c_fill,q_auto/')}
                            alt={post.caption || `Foto de @${post.author}`}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-sm">
                            <p className="font-bold truncate">@{post.author}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="absolute bottom-8 right-8 z-20 bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
                <span className="font-bold tracking-widest uppercase text-sm">Mural do evento</span>
            </div>
        </div>
    );
});
