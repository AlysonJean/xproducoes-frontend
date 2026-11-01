import React from 'react';
import { PostCard } from './PostCard';
import { SocialPost } from '../../services/socialService';
import { Grid } from '../ui/StandardComponents';
import { Instagram } from 'lucide-react';

interface ModerationGridProps {
  posts: SocialPost[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  processingIds: string[];
}

export const ModerationGrid: React.FC<ModerationGridProps> = ({ posts, onApprove, onReject, processingIds }) => {
  if (posts.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in duration-500">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <Instagram className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Nenhuma foto nesta aba</h3>
            <p className="text-sm text-muted-foreground max-w-xs mt-2">As publicações com a hashtag do mural aparecem aqui.</p>
        </div>
    );
  }

  return (
    <Grid columns={{ sm: 2, md: 3, lg: 4, xl: 5 }} gap={4} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {posts.map(post => (
        <PostCard 
            key={post.id} 
            post={post} 
            onApprove={onApprove} 
            onReject={onReject}
            isProcessing={processingIds.includes(post.id)}
        />
      ))}
    </Grid>
  );
};
