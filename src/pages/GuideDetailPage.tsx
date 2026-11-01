import { useParams, Navigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { PageLayout } from '../components/layouts/PageLayout';
import { SEO } from '../components/SEO';
import { GUIDES } from '../data/guides';
import { ChevronLeft, CalendarIcon } from 'lucide-react';
import { Badge } from '../components/ui/StandardComponents';

const formatGuideDate = (date: string) => {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('pt-BR');
};

// Achados (auditoria do design system):
// - havia um "carregamento" falso de 600ms (setTimeout num useState) para conteúdo estático —
//   no SSR a página saía sempre como "Carregando..."; removido, como já fora em GuideListPage;
// - o título aparecia em dois <h1> (o do PageLayout e um local) — ficou só o do PageLayout;
// - o avatar do autor vinha de i.pravatar.cc (rosto aleatório) — trocado pela inicial.
export const GuideDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const guide = GUIDES.find(g => g.slug === slug);

  if (!guide) {
    return <Navigate to="/404" />;
  }

  const authorInitial = (sizeClass: string) => (
    <span className={`${sizeClass} rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center flex-shrink-0`} aria-hidden="true">
      {guide.author.name.charAt(0)}
    </span>
  );

  return (
    <PageLayout
      title={guide.title}
      description={guide.excerpt}
      image={guide.coverImage}
      breadcrumbs={[{ label: 'Guias', path: '/guias' }, { label: guide.title }]}
    >
      <SEO title={guide.title} description={guide.excerpt} image={guide.coverImage} type="article" />

      <div className="max-w-4xl mx-auto">
        <Link to="/guias" className="inline-flex items-center text-muted-foreground hover:text-primary mb-6 transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ChevronLeft className="w-4 h-4 mr-1" aria-hidden="true" />
          Voltar para Guias
        </Link>

        <header className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
             {guide.tags.map(tag => (
               <Badge key={tag} variant="primary" size="lg">{tag}</Badge>
             ))}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground border-b border-border pb-8">
             <div className="flex items-center gap-2">
                {authorInitial('w-10 h-10')}
                <div>
                   <p className="font-semibold text-foreground">{guide.author.name}</p>
                   <p>{guide.author.role}</p>
                </div>
             </div>
             <div className="flex items-center gap-1">
               <CalendarIcon className="w-4 h-4" aria-hidden="true" />
               <time dateTime={guide.date}>{formatGuideDate(guide.date)}</time>
             </div>
             <div>
                {guide.readTime} de leitura
             </div>
          </div>
        </header>

        <img
          src={guide.coverImage}
          alt={guide.title}
          className="w-full aspect-video object-cover rounded-2xl shadow-lg mb-12"
        />

        <article className="prose prose-lg dark:prose-invert max-w-none">
          <ReactMarkdown>{guide.content}</ReactMarkdown>
        </article>

        {/* Sobre o autor */}
        <div className="mt-16 p-8 bg-muted/30 rounded-2xl border border-border flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
           {authorInitial('w-16 h-16 text-2xl')}
           <div>
             <h2 className="font-bold text-lg text-foreground mb-1">Sobre o Autor</h2>
             <p className="text-muted-foreground">
               {guide.author.name} é {guide.author.role} e colabora com a X Produções trazendo dicas técnicas para eventos.
             </p>
           </div>
        </div>
      </div>
    </PageLayout>
  );
};
