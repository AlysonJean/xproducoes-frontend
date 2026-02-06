import { Link } from 'react-router-dom';
import { PageLayout } from '../components/layouts/PageLayout';
import { GUIDES } from '../data/guides';
import { SEO } from '../components/SEO';
import { ClockIcon } from 'lucide-react';

export const GuideListPage = () => {
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
