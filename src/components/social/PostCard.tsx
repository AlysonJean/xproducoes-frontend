import React from 'react';
import { SocialPost } from '../../services/socialService';
import { Check, X, Instagram, User, Clock, MoreHorizontal } from 'lucide-react';
import { Button, Badge, Card } from '../ui/StandardComponents';

interface PostCardProps {
  post: SocialPost;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onApprove, onReject, isProcessing }) => {
  const statusConfig = {
    APPROVED: { variant: 'success' as const, label: 'Aprovado' },
    REJECTED: { variant: 'destructive' as const, label: 'Rejeitado' },
    PENDING: { variant: 'outline' as const, label: 'Pendente' }
  };

  const config = statusConfig[post.status as keyof typeof statusConfig] || statusConfig.PENDING;

  return (
    <Card className={`group overflow-hidden flex flex-col border-border/50 bg-card/50 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 ${isProcessing ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="relative aspect-square w-full bg-muted overflow-hidden">
        <img 
          src={post.mediaUrl} 
          alt={post.caption || 'Instagram Post'} 
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="absolute top-3 left-3">
             <div className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-lg">
                <Instagram size={14} className="animate-pulse" />
             </div>
        </div>

        <div className="absolute top-3 right-3">
            <Badge variant={config.variant} className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow-lg backdrop-blur-md">
                {config.label}
            </Badge>
        </div>

        {/* Floating Action Overlay for single hover actions */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
           <Button variant="outline" size="icon" className="h-8 w-8 rounded-full bg-white/10 border-white/30 text-white backdrop-blur-md hover:bg-white/20">
              <MoreHorizontal size={14} />
           </Button>
        </div>
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
               <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <User size={12} />
               </div>
               <span className="font-black text-[10px] uppercase tracking-tighter truncate text-foreground">@{post.author}</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase shrink-0">
               <Clock size={10} />
               {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
        <p className="text-[11px] font-medium text-muted-foreground line-clamp-2 italic leading-relaxed" title={post.caption || ''}>
            {post.caption || 'Nenhuma legenda fornecida...'}
        </p>
      </div>

      <div className="p-4 pt-0 grid grid-cols-2 gap-2 mt-auto">
        {post.status !== 'REJECTED' && (
            <Button 
                variant="destructive" 
                size="sm" 
                className="font-black uppercase text-[9px] tracking-widest h-9"
                onClick={() => onReject(post.id)}
                disabled={isProcessing}
            >
                <X size={14} className="mr-1.5" /> Rejeitar
            </Button>
        )}
        
        {post.status !== 'APPROVED' && (
             <Button 
              variant="primary" 
              size="sm" 
              className="font-black uppercase text-[9px] tracking-widest bg-emerald-600 hover:bg-emerald-500 h-9"
              onClick={() => onApprove(post.id)}
              disabled={isProcessing}
            >
              <Check size={14} className="mr-1.5" /> Aprovar
            </Button>
        )}
      </div>
    </Card>
  );
};
