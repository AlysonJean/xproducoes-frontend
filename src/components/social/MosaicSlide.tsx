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

export const MosaicSlide = memo(({ posts }: MosaicSlideProps) => {
    // Select up to 12 posts for 4x3 or similar grid
    const displayPosts = posts.slice(0, 12);
    
    // Grid Calculation
    // For 12 posts -> 4x3 grid seems good for 16:9
    
    return (
        <div className="absolute inset-0 bg-black z-40 p-4 animate-fade-in flex items-center justify-center">
            {/* Background Decor */}
             <div className="absolute inset-0 bg-black opacity-90 z-0"></div>

            <div className="z-10 grid grid-cols-4 md:grid-cols-4 gap-4 w-full h-full p-8 max-w-[1920px] mx-auto">
                {displayPosts.map((post, index) => {
                    const delayClass = `delay-[${index * 100}ms]`;
                    return (
                        <div 
                            key={post.id} 
                            className={`relative rounded-lg overflow-hidden shadow-lg border border-white/10 aspect-square transform transition-all duration-700 animate-fade-in-up ${delayClass}`}
                        >
                            {/* Mosaic Image */}
                            <img 
                                src={post.mediaUrl.replace('/upload/', '/upload/w_500,h_500,c_fill,q_auto/')} 
                                alt={post.caption || 'Mosaic Item'} 
                                className="w-full h-full object-cover hover:scale-110 transition-transform duration-5000 ease-linear"
                            />
                            
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-white text-xs opacity-0 hover:opacity-100 transition-opacity">
                                <p className="font-bold truncate">@{post.author}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

             {/* Overlay Title */}
             <div className="absolute bottom-8 right-8 z-20 bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 animate-pulse">
                <span className="text-white font-bold tracking-widest uppercase text-sm">Mural do Evento</span>
             </div>
        </div>
    );
});
