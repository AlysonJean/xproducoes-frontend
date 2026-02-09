import { Link } from 'react-router-dom';
import { PageLayout } from '../components/layouts/PageLayout';
import { GUIDES } from '../data/guides';
import { SEO } from '../components/SEO';
import { ClockIcon } from 'lucide-react';
import { useState } from 'react';
import { Skeleton } from '../components/ui/StandardComponents';
import { BrandLoader } from '../components/ui/BrandLoader';

const GuideListSkeleton = () => (
  <PageLayout 
    title="Guias & Dicas"
    description="Preparando os melhores artigos para você."
  >
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <Skeleton className="h-48 w-full rounded-none" />
          <div className="p-6 space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <div className="flex items-center gap-2 pt-4 border-t border-border">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </PageLayout>
);

export const GuideListPage = () => {
  const [loading, setLoading] = useState(true);

  // Simular carregamento inicial
  useState(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  });

  if (loading) {
    return (
      <div className="relative">
        <BrandLoader fullScreen size={140} label="Carregando guias..." />
        <GuideListSkeleton />
      </div>
    );
  }

  return (
    <PageLayout 
      title="Guias & Dicas para Eventos"
      description="Artigos de especialistas sobre som, iluminação e organização de eventos."
    >
      <SEO 
        title="Guias de Eventos e Dicas Técnicas | X-Produções"
        description="Aprenda como organizar eventos inesquecíveis com nossos guias sobre som, iluminação e estrutura."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {GUIDES.map((guide) => (
          <article key={guide.slug} className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300">
             <Link to={`/guias/${guide.slug}`}>
               <div className="relative h-48 overflow-hidden">
                 <img 
                   src={guide.coverImage} 
                   alt={guide.title}
                   className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                 />
                 <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1">
                   <ClockIcon className="w-3 h-3" />
                   {guide.readTime}
                 </div>
               </div>
               <div className="p-6">
                 <div className="flex gap-2 mb-3">
                   {guide.tags.map(tag => (
                     <span key={tag} className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                       {tag}
                     </span>
                   ))}
                 </div>
                 <h2 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                   {guide.title}
                 </h2>
                 <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                   {guide.excerpt}
                 </p>
                 <div className="flex items-center justify-between border-t border-border pt-4 mt-auto">
                    <div className="flex items-center gap-2">
                      <img src={guide.author.avatar} alt={guide.author.name} className="w-8 h-8 rounded-full" />
                      <div className="text-xs">
                        <p className="font-semibold">{guide.author.name}</p>
                        <p className="text-muted-foreground">{guide.date}</p>
                      </div>
                    </div>
                 </div>
               </div>
             </Link>
          </article>
        ))}
      </div>
    </PageLayout>
  );
};
