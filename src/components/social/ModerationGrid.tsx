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
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6 ring-8 ring-muted/10">
                <Instagram className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-xl font-black text-foreground uppercase tracking-widest mb-2">Vazio Absoluto</h3>
            <p className="text-sm text-muted-foreground font-medium max-w-xs mt-2">Nenhum post localizado para esta categoria no momento operativo.</p>
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
