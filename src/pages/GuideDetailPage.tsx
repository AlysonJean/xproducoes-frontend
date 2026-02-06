import { useParams, Navigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { PageLayout } from '../components/layouts/PageLayout';
import { GUIDES } from '../data/guides';
import { SEO } from '../components/SEO';
import { ChevronLeft, CalendarIcon } from 'lucide-react';

export const GuideDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const guide = GUIDES.find(g => g.slug === slug);

  if (!guide) {
    return <Navigate to="/404" />;
  }

  // Schema for Article
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": guide.title,
    "image": guide.coverImage,
    "author": {
      "@type": "Person",
      "name": guide.author.name
    },
    "publisher": {
      "@type": "Organization",
      "name": "X-Produções",
      "logo": {
        "@type": "ImageObject",
        "url": "https://xproducoes.com.br/logo.png"
      }
    },
    "datePublished": guide.date,
    "description": guide.excerpt
  };

  return (
    <PageLayout title={guide.title}>
      <SEO 
        title={guide.title} 
        description={guide.excerpt}
        image={guide.coverImage}
        type="article"
        jsonLd={articleSchema}
      />

      <div className="max-w-4xl mx-auto">
        <Link to="/guias" className="inline-flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Voltar para Guias
        </Link>
        
        <header className="mb-8">
          <div className="flex gap-2 mb-4">
             {guide.tags.map(tag => (
               <span key={tag} className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">{tag}</span>
             ))}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-6 heading-elegant leading-tight">{guide.title}</h1>
          
          <div className="flex items-center gap-6 text-sm text-muted-foreground border-b border-border pb-8">
             <div className="flex items-center gap-2">
                <img src={guide.author.avatar} alt={guide.author.name} className="w-10 h-10 rounded-full border border-border" />
                <div>
                   <p className="font-semibold text-foreground">{guide.author.name}</p>
                   <p>{guide.author.role}</p>
                </div>
             </div>
             <div className="flex items-center gap-1">
               <CalendarIcon className="w-4 h-4" />
               <time>{guide.date}</time>
             </div>
             <div>
                {guide.readTime} de leitura
             </div>
          </div>
        </header>

        <div className="relative">
          <img 
            src={guide.coverImage} 
            alt={guide.title} 
            className="w-full h-[400px] object-cover rounded-2xl shadow-lg mb-12"
          />
        </div>

        <article className="prose prose-lg dark:prose-invert max-w-none">
          <ReactMarkdown>{guide.content}</ReactMarkdown>
        </article>

        {/* Author Bio Box */}
        <div className="mt-16 p-8 bg-muted/30 rounded-2xl border border-border flex items-center gap-6">
           <img src={guide.author.avatar} className="w-16 h-16 rounded-full" alt={guide.author.name} />
           <div>
             <h3 className="font-bold text-lg mb-1">Sobre o Autor</h3>
             <p className="text-muted-foreground">
               {guide.author.name} é {guide.author.role} e colabora com a X-Produções trazendo dicas técnicas para eventos.
             </p>
           </div>
        </div>
      </div>
    </PageLayout>
  );
};
