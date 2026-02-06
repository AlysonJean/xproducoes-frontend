import { memo } from 'react';
import { Trophy, Star } from 'lucide-react';

interface LeaderboardItem {
    username: string;
    avatarUrl?: string;
    count: number;
    platform: string;
}

interface LeaderboardSlideProps {
    items: LeaderboardItem[];
}

export const LeaderboardSlide = memo(({ items }: LeaderboardSlideProps) => {
    // Top 3 for podium
    const top3 = items.slice(0, 3);
    const rest = items.slice(3, 5);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-12 text-white/90">
            <h2 className="text-5xl font-black mb-12 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-500 drop-shadow-sm animate-fade-in-down">
                TOP CONTRIBUIDORES 🏆
            </h2>

            <div className="flex gap-8 items-end mb-12 w-full max-w-5xl justify-center">
                {/* 2nd Place */}
                {top3[1] && <PodiumItem item={top3[1]} rank={2} delay={200} />}
                
                {/* 1st Place */}
                {top3[0] && <PodiumItem item={top3[0]} rank={1} delay={0} />}
                
                {/* 3rd Place */}
                {top3[2] && <PodiumItem item={top3[2]} rank={3} delay={400} />}
            </div>

            {/* Runners Up */}
            {rest.length > 0 && (
                <div className="w-full max-w-3xl flex flex-col gap-4 animate-fade-in-up delay-[600ms]">
                    {rest.map((item, idx) => (
                        <div key={item.username} className="flex items-center bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/5 mx-4">
                            <span className="text-2xl font-bold w-12 text-center text-white/50">#{idx + 4}</span>
                            <Avatar url={item.avatarUrl} />
                            <div className="ml-4 flex-1">
                                <p className="text-xl font-bold">{item.username}</p>
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-4 py-1 rounded-full">
                                <Star className="w-4 h-4 text-yellow-300" fill="currentColor" />
                                <span className="font-bold">{item.count}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

const PodiumItem = ({ item, rank, delay }: { item: LeaderboardItem; rank: number; delay: number }) => {
    const isFirst = rank === 1;
    const sizeClasses = isFirst ? "w-48 h-48 border-4" : "w-32 h-32 border-2";
    const colorClass = rank === 1 ? "border-yellow-400 text-yellow-400" : rank === 2 ? "border-slate-300 text-slate-300" : "border-amber-600 text-amber-600";
    const bgColor = rank === 1 ? "bg-gradient-to-b from-yellow-400/20 to-transparent" : "bg-gradient-to-b from-white/10 to-transparent";
    
    // Map delay to tailwind class
    const delayClass = delay === 0 ? 'delay-0' : delay === 200 ? 'delay-200' : 'delay-[400ms]';

    return (
        <div 
            className={`flex flex-col items-center animate-fade-in-up ${delayClass}`}
        >
            <div className="relative mb-4">
                {rank === 1 && <Trophy className="absolute -top-12 left-1/2 -translate-x-1/2 w-10 h-10 text-yellow-400 animate-bounce" fill="currentColor" />}
                <div className={`relative rounded-full overflow-hidden ${sizeClasses} ${colorClass} shadow-2xl`}>
                    <Avatar url={item.avatarUrl} />
                </div>
                <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl text-black ${rank === 1 ? "bg-yellow-400" : rank === 2 ? "bg-slate-300" : "bg-amber-600"}`}>
                    {rank}
                </div>
            </div>
            <div className={`text-center p-6 rounded-2xl backdrop-blur-md border border-white/10 w-48 ${bgColor}`}>
                <p className={`text-xl font-bold truncate mb-1 ${isFirst ? 'text-2xl' : ''}`}>@{item.username}</p>
                <p className="text-sm opacity-70 mb-2">{item.platform === 'INSTAGRAM' ? 'Instagram' : 'Visitante'}</p>
                <div className="inline-flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full">
                    <Star className={`w-4 h-4 ${colorClass}`} fill="currentColor" />
                    <span className="font-bold text-white">{item.count} posts</span>
                </div>
            </div>
        </div>
    );
};

const Avatar = ({ url }: { url?: string }) => {
    // If no avatar (Cloudinary limit or whatever), show initial? using generic fallback
    const imgSrc = url ? url.replace('/upload/', '/upload/w_200,h_200,c_fill,q_auto/') : null;
    
    if (!imgSrc) {
        return <div className="w-full h-full bg-slate-700 flex items-center justify-center text-white/20"><span className="text-4xl">?</span></div>;
    }

    return (
        <img src={imgSrc} alt="Avatar" className="w-full h-full object-cover" />
    );
};

export default LeaderboardSlide;
