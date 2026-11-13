import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, User, Shield, Zap, Clock } from 'lucide-react';
import { TrustBenefits } from '../components/ui/TrustBenefits';
import ReactGA from 'react-ga4';
import { apiFetch } from '../services/api';
import { useCart } from '@/hooks/useCart';
import BrandLoader from '../components/ui/BrandLoader';
import type { Service } from '../types/types';
import { formatPrice } from '../utils/typeSafeFormatters';
import { serviceMinutesText } from '../utils/bookingPricing';
import { wholeEventRuleText } from '../utils/wholeEventService';
import { transformService } from '../utils/transformService';
import { SEO } from '../components/SEO';
import { useNotifications } from '../contexts/NotificationContext';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import CompareButton from '../components/ui/CompareButton';
import { RecommendationSection } from '../components/ui/RecommendationSection';
import { useRecommendations } from '../hooks/useRecommendations';
import { ZoomableProductPhoto } from '@/components/ui/ZoomableProductPhoto';
import { AskOnWhatsAppButton } from '@/components/ui/AskOnWhatsAppButton';
import { PageLayout, PageError } from '../components/layouts/PageLayout';
import { Badge, Button, buttonVariants } from '../components/ui/StandardComponents';

const LIST_CRUMB = { label: 'Serviços', path: '/servicos' };

const sideArrowClass =
  'fixed top-1/2 -translate-y-1/2 bg-background/80 hover:bg-primary hover:text-primary-foreground p-3 rounded-full shadow-lg border border-border backdrop-blur-sm transition-all z-50 hidden lg:flex items-center justify-center group text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const compactArrowClass =
  'p-2.5 bg-muted/80 backdrop-blur-sm rounded-full border border-border shadow-sm active:scale-95 transition-all text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export const ServiceDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem, cart } = useCart();
  const [service, setService] = useState<(Service & { prevSlug?: string | null; nextSlug?: string | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const { addNotification } = useNotifications();

  // Recommendations
  const similarRecommendations = useRecommendations({
    type: 'similar',
    itemId: slug || '',
    itemType: 'service',
    limit: 4,
    autoFetch: !!slug
  });

  const frequentlyBoughtRecommendations = useRecommendations({
    type: 'frequently-bought',
    itemId: slug || '',
    itemType: 'service',
    limit: 4,
    autoFetch: !!slug
  });

  useEffect(() => {
    if (!slug) return;
    const fetchService = async () => {
      try {
        setLoading(true);
        setService(null);
        const data = await apiFetch<Service & { prevSlug?: string | null; nextSlug?: string | null }>(`/services/${slug}`);
        const transformed = transformService(data);
        setService({
          ...transformed,
          prevSlug: data.prevSlug,
          nextSlug: data.nextSlug
        });

        if (data) {
          ReactGA.event({
            category: "ecommerce",
            action: "view_item",
            label: data.name,
            value: Number(data.price || 0)
          });
        }

        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Não foi possível carregar os detalhes do serviço.');
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [slug]);

  const handleAddToCart = async () => {
    if (!service) return;
    setAdding(true);
    try {
      // Auditoria do orçamento (12/11/2026), O23/O24: addItem devolve false (e já avisou) quando o item não entra:
      // repetido, indisponível ou kit mantido no modal de troca. O aviso de sucesso só sai quando entrou.
      if (!(await addItem(service, 'service'))) return;
      addNotification({
        type: 'success',
        title: 'Adicionado ao Orçamento',
        message: `${service.name} foi adicionado ao seu orçamento.`
      });
    } catch (e: unknown) {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: e instanceof Error ? e.message : 'Não foi possível adicionar ao orçamento.'
      });
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Serviços" hideTitle breadcrumbs={[LIST_CRUMB]}>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <BrandLoader size={120} label="Carregando serviço..." />
        </div>
      </PageLayout>
    );
  }

  if (error || !service) {
    return (
      <PageLayout title={error ? 'Erro ao carregar o serviço' : 'Serviço não encontrado'} breadcrumbs={[LIST_CRUMB]}>
        <PageError
          title="Não foi possível abrir este serviço"
          message={error || 'O serviço que você procura não existe ou foi removido.'}
        />
        <div className="text-center">
          <Link to="/servicos" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Voltar para serviços
          </Link>
        </div>
      </PageLayout>
    );
  }

  const isAlreadyInCart = cart?.services?.some(s => s.id === service.id);

  const status =
    service.status === 'MAINTENANCE' ? { label: 'Em Manutenção', variant: 'warning' as const } :
    service.status === 'COMING_SOON' ? { label: 'Em Breve', variant: 'info' as const } :
    // Lote 13: o detalhe também abre serviço inativo (link direto); antes ele aparecia como "Disponível".
    service.status === 'INACTIVE' ? { label: 'Indisponível', variant: 'secondary' as const } :
    { label: 'Disponível', variant: 'success' as const };
  // Lote 13, técnico durante o evento: o pedido de cliente ou convidado só aceita serviço ativo (o servidor recusa o
  // resto com 400). Serviço "em breve", em manutenção ou inativo não vai ao carrinho, como no cartão do serviço.
  const canAdd = service.status === 'ACTIVE';
  // Auditoria do orçamento (12/11/2026), O5: a mesma condição de serviceLine (marcado e com duração maior que zero).
  const coveredMinutes = Number(service.duration ?? 0);
  const coversWholeEvent = service.coversWholeEvent === true && Number.isInteger(coveredMinutes) && coveredMinutes > 0;

  return (
    <PageLayout title={service.name} hideTitle breadcrumbs={[LIST_CRUMB, { label: service.name }]}>
      <SEO
        title={service.name}
        description={service.description || `Contrate ${service.name} para seu evento.`}
        image={service.imageUrl || undefined}
        noindex={service.status === 'INACTIVE'}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Service",
          "name": service.name,
          "description": service.description,
          "sku": service.id,
          "provider": {
            "@type": "Organization",
            "name": "X Produções"
          },
          "offers": {
            "@type": "Offer",
            "priceCurrency": "BRL",
            "price": service.price,
            "availability": "https://schema.org/InStock"
          }
        }}
      />

      <div className="bg-card p-6 md:p-8 rounded-2xl shadow-2xl border border-border">
        {/* Setas laterais (desktop) */}
        {service.prevSlug && (
          <Link
            to={`/servicos/${service.prevSlug}`}
            className={`${sideArrowClass} left-4`}
            aria-label="Serviço anterior"
            title="Serviço anterior"
          >
            <ChevronLeft className="w-8 h-8 group-hover:-translate-x-0.5 transition-transform" aria-hidden="true" />
          </Link>
        )}
        {service.nextSlug && (
          <Link
            to={`/servicos/${service.nextSlug}`}
            className={`${sideArrowClass} right-4`}
            aria-label="Próximo serviço"
            title="Próximo serviço"
          >
            <ChevronRight className="w-8 h-8 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </Link>
        )}

        {/* Setas compactas (celular/tablet) */}
        {(service.prevSlug || service.nextSlug) && (
          <div className="flex lg:hidden justify-end gap-3 mb-6">
            {service.prevSlug && (
              <Link to={`/servicos/${service.prevSlug}`} className={compactArrowClass} aria-label="Serviço anterior">
                <ChevronLeft className="w-6 h-6" aria-hidden="true" />
              </Link>
            )}
            {service.nextSlug && (
              <Link to={`/servicos/${service.nextSlug}`} className={compactArrowClass} aria-label="Próximo serviço">
                <ChevronRight className="w-6 h-6" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative mb-12">
          {/* Imagem */}
          <div className="relative">
            {service.imageUrl ? (
              <ZoomableProductPhoto src={service.imageUrl} alt={service.name} />
            ) : (
              <div className="w-full aspect-[4/3] rounded-xl border border-border bg-muted flex items-center justify-center" role="img" aria-label={`${service.name} (sem foto)`}>
                <User className="w-16 h-16 text-muted-foreground" aria-hidden="true" />
              </div>
            )}
            {/* Ações sempre visíveis abaixo de lg (antes só no hover); no desktop ficam ao lado do título. */}
            <div className="absolute top-4 right-4 flex lg:hidden flex-col gap-2">
              <FavoriteButton equipmentId={service.id} equipmentName={service.name} size="lg" isService={true} />
              <CompareButton equipment={service} size="lg" itemType="service" />
            </div>
          </div>

          {/* Informações */}
          <div className="flex flex-col">
            <div className="flex justify-between items-start gap-4 mb-4">
              <h1 className="text-4xl lg:text-5xl font-bold text-primary leading-tight">
                {service.name}
              </h1>
              <div className="hidden lg:flex space-x-2">
                <FavoriteButton equipmentId={service.id} equipmentName={service.name} size="lg" isService={true} />
                <CompareButton equipment={service} size="lg" itemType="service" />
              </div>
            </div>

            <p className="text-muted-foreground text-lg mb-8 leading-relaxed whitespace-pre-wrap">
              {service.description}
            </p>

            <div className="bg-muted/30 p-6 rounded-2xl mb-8 border border-border shadow-inner">
              <div className="flex flex-wrap justify-between items-baseline gap-2 mb-4">
                <span className="text-muted-foreground font-semibold">Valor Estimado</span>
                <div className="text-right">
                  <div className="text-4xl font-black text-foreground">
                    {formatPrice(service.price)}
                    <span className="text-sm font-normal ml-1">{coversWholeEvent ? `/ até ${serviceMinutesText(coveredMinutes)} de evento` : '/ serviço'}</span>
                  </div>
                </div>
              </div>

              {/* Auditoria do orçamento (12/11/2026), O5 e E6: o serviço que acompanha o evento todo dizia "/ serviço" e o
                  servidor cobra pelas horas do evento (serviceLine): a regra em palavras, a mesma da caixa do pedido. */}
              {coversWholeEvent && (
                <p className="text-sm text-muted-foreground mb-4">
                  Acompanha o evento todo: {wholeEventRuleText(service, null)}
                </p>
              )}

              <div className="flex justify-between items-center mb-2">
                <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" aria-hidden="true" /> Duração</span>
                <span className="font-bold text-foreground">
                  {service.duration ? `${(service.duration / 60).toFixed(1).replace('.0', '')}h` : 'A combinar'}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={status.variant} size="lg">{status.label}</Badge>
              </div>
            </div>

            <Button
              size="xl"
              fullWidth
              onClick={handleAddToCart}
              isLoading={adding}
              disabled={!canAdd || isAlreadyInCart}
            >
              {adding ? 'Adicionando...' : (isAlreadyInCart ? 'Já no orçamento' : canAdd ? 'Adicionar ao orçamento' : 'Indisponível no momento')}
            </Button>
            <div className="mt-3">
              <AskOnWhatsAppButton kind="Serviço" itemName={service.name} />
            </div>
          </div>
        </div>

        {/* Benefícios */}
        <TrustBenefits
          items={[
            // P20 (decisão do dono de 08/11/2026): sem promessa absoluta ("sucesso absoluto", "Garantia de Qualidade").
            { icon: User, iconColor: 'success', title: 'Equipe Profissional', description: 'Técnicos experientes para cuidar da parte técnica do seu evento.' },
            { icon: Shield, iconColor: 'info', title: 'Serviço Combinado', description: 'O serviço é feito conforme o combinado na proposta.' },
            { icon: Zap, iconColor: 'primary', title: 'Suporte Integrado', description: 'Serviços pensados para trabalhar junto com nossos equipamentos.' },
          ]}
        />

        {/* Recomendações */}
        {similarRecommendations.recommendations.length > 0 && (
          <div className="mt-12 pt-12 border-t border-border">
            <RecommendationSection
              type="similar"
              title="Serviços Similares"
              items={similarRecommendations.recommendations}
              maxItems={4}
              loading={similarRecommendations.loading}
              viewAllLink="/servicos"
              viewAllText="Ver Mais Serviços"
              columns={{ sm: 1, md: 2, lg: 4 }}
            />
          </div>
        )}

        {frequentlyBoughtRecommendations.recommendations.length > 0 && (
          <div className="mt-8">
            <RecommendationSection
              type="frequently-bought"
              title="Geralmente Contratados Juntos"
              items={frequentlyBoughtRecommendations.recommendations}
              maxItems={4}
              loading={frequentlyBoughtRecommendations.loading}
              viewAllLink="/servicos"
              viewAllText="Explorar Mais"
              columns={{ sm: 1, md: 2, lg: 4 }}
            />
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default ServiceDetailPage;
