import React from 'react';
import { SocialPost } from '../../services/socialService';
import { Check, X, Instagram, User, Clock } from 'lucide-react';
import { Button, Badge, Card } from '../ui/StandardComponents';

interface PostCardProps {
  post: SocialPost;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing?: boolean;
}

// Achado (auditoria): o card mostrava `new Date()` — a hora de AGORA, igual em todos os posts —
// como se fosse a hora da publicação. Usa a data do post (postedAt; na falta, a da captura).
const formatPostTime = (post: SocialPost): string | null => {
  const raw = post.postedAt || post.fetchedAt;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export const PostCard: React.FC<PostCardProps> = ({ post, onApprove, onReject, isProcessing }) => {
  const statusConfig = {
    APPROVED: { variant: 'success' as const, label: 'Aprovado' },
    REJECTED: { variant: 'destructive' as const, label: 'Rejeitado' },
    PENDING: { variant: 'warning' as const, label: 'Pendente' }
  };

  const config = statusConfig[post.status as keyof typeof statusConfig] || statusConfig.PENDING;
  const postTime = formatPostTime(post);

  return (
    <Card className={`group overflow-hidden flex flex-col border-border bg-card transition-all duration-500 hover:shadow-xl hover:-translate-y-1 ${isProcessing ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="relative aspect-square w-full bg-muted overflow-hidden">
        <img
          src={post.mediaUrl}
          alt={post.caption || `Foto de @${post.author}`}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Sobre a foto: selo branco translúcido é exceção do guia */}
        <div className="absolute top-3 left-3">
             <div className="h-8 w-8 rounded-xl bg-black/40 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-lg" aria-hidden="true">
                <Instagram size={14} />
             </div>
        </div>

        <div className="absolute top-3 right-3">
            <Badge variant={config.variant} className="bg-card shadow-lg">
                {config.label}
            </Badge>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
               <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                  <User size={12} aria-hidden="true" />
               </div>
               <span className="font-bold text-sm truncate text-foreground">@{post.author}</span>
            </div>
            {postTime && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                 <Clock size={12} aria-hidden="true" />
                 {postTime}
              </div>
            )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed" title={post.caption || ''}>
            {post.caption || 'Sem legenda.'}
        </p>
      </div>

      {/* O botão "mais" no canto da foto não tinha ação — removido. */}
      <div className="p-4 pt-0 grid grid-cols-2 gap-2 mt-auto">
        {post.status !== 'REJECTED' && (
            <Button
                variant="destructive"
                size="xs"
                className="h-9"
                onClick={() => onReject(post.id)}
                disabled={isProcessing}
                leftIcon={<X size={14} />}
            >
                Rejeitar
            </Button>
        )}

        {post.status !== 'APPROVED' && (
             <Button
              variant="success"
              size="xs"
              className="h-9"
              onClick={() => onApprove(post.id)}
              disabled={isProcessing}
              leftIcon={<Check size={14} />}
            >
              Aprovar
            </Button>
        )}
      </div>
    </Card>
  );
};
