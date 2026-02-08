import React from 'react';
import { Button } from '../ui/Button';
import { SocialPost } from '../../services/socialService';
import { Check, X, Instagram } from 'lucide-react';

interface PostCardProps {
  post: SocialPost;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing?: boolean;
}

const Badge = ({ children, variant }: { children: React.ReactNode, variant: 'default' | 'destructive' | 'secondary' }) => {
    const colors = {
      default: 'bg-success/10 text-success bg-success/20 text-success-foreground',
      destructive: 'bg-destructive/10 text-destructive bg-destructive/20 text-destructive-foreground',
      secondary: 'bg-muted text-muted-foreground bg-muted/20 text-muted-foreground'
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[variant]}`}>
            {children}
        </span>
    );
};

export const PostCard: React.FC<PostCardProps> = ({ post, onApprove, onReject, isProcessing }) => {
  return (
    <div className={`bg-card rounded-xl shadow-sm border overflow-hidden transition-all duration-300 flex flex-col ${isProcessing ? 'opacity-50 scale-95' : ''}`}>
      <div className="relative aspect-square w-full bg-muted">
        <img 
          src={post.mediaUrl} 
          alt={post.caption || 'Instagram Post'} 
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute top-2 right-2">
            <Badge variant={post.status === 'APPROVED' ? 'default' : post.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                {post.status}
            </Badge>
        </div>
      </div>
      
      <div className="p-3 flex-1">
        <div className="flex items-center gap-2 mb-2">
            <Instagram size={16} className="text-accent" />
            <span className="font-semibold text-sm truncate">@{post.author}</span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2" title={post.caption || ''}>
            {post.caption}
        </p>
      </div>

      <div className="p-3 pt-0 flex gap-2 mt-auto">
        {post.status !== 'REJECTED' && (
            <Button 
                variant="danger" 
                size="sm" 
                className="flex-1"
                onClick={() => onReject(post.id)}
                disabled={isProcessing}
            >
                <X size={16} className="mr-1" /> Rejeitar
            </Button>
        )}
        
        {post.status !== 'APPROVED' && (
             <Button 
              variant="primary" 
              size="sm" 
              className="flex-1 bg-success hover:bg-success/80 hover:text-success-foreground"
              onClick={() => onApprove(post.id)}
              disabled={isProcessing}
            >
              <Check size={16} className="mr-1" /> Aprovar
            </Button>
        )}
      </div>
    </div>
  );
};
