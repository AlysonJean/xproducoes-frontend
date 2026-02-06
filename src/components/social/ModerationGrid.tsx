import React from 'react';
import { PostCard } from './PostCard';
import { SocialPost } from '../../services/socialService';

interface ModerationGridProps {
  posts: SocialPost[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  processingIds: string[];
}

export const ModerationGrid: React.FC<ModerationGridProps> = ({ posts, onApprove, onReject, processingIds }) => {
  if (posts.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <p>Nenhum post encontrado nesta categoria.</p>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {posts.map(post => (
        <PostCard 
            key={post.id} 
            post={post} 
            onApprove={onApprove} 
            onReject={onReject}
            isProcessing={processingIds.includes(post.id)}
        />
      ))}
    </div>
  );
};
