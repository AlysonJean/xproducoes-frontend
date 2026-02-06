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
        default: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        destructive: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
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
      <div className="relative aspect-square w-full bg-gray-100 dark:bg-gray-800">
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
            <Instagram size={16} className="text-pink-600" />
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
                className="flex-1 bg-green-600 hover:bg-green-700 hover:text-white"
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
