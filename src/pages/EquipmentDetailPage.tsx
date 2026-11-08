import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { ChevronLeft, ChevronRight, Package, Shield, Zap } from 'lucide-react';
import { TrustBenefits } from '../components/ui/TrustBenefits';
import { apiFetch } from '../services/api';
import { useCart } from '@/hooks/useCart';
import BrandLoader from '../components/ui/BrandLoader';
import type { Equipment } from '../types/types';
import { formatPrice } from '../utils/typeSafeFormatters';
import { SEO } from '../components/SEO';
import { transformEquipment } from '../utils/transformEquipment';
import { RecommendationSection } from '../components/ui/RecommendationSection';
import { useRecommendations } from '../hooks/useRecommendations';
import { useEquipmentUnitOf } from '../hooks/usePricingRules';
import { useNotifications } from '../contexts/NotificationContext';
import { generateProductSchema } from '../utils/schemaGenerator';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import CompareButton from '../components/ui/CompareButton';
import { ZoomableProductPhoto } from '@/components/ui/ZoomableProductPhoto';
import { AskOnWhatsAppButton } from '@/components/ui/AskOnWhatsAppButton';
import { PageLayout, PageError } from '../components/layouts/PageLayout';
import { Badge, Button, buttonVariants } from '../components/ui/StandardComponents';

const LIST_CRUMB = { label: 'Equipamentos', path: '/equipamentos' };

// Seta lateral fixa (desktop) e seta compacta (celular) para o item anterior/seguinte.
const sideArrowClass =
  'fixed top-1/2 -translate-y-1/2 bg-background/80 hover:bg-primary hover:text-primary-foreground p-3 rounded-full shadow-lg border border-border backdrop-blur-sm transition-all z-50 hidden lg:flex items-center justify-center group text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const compactArrowClass =
  'p-2.5 bg-muted/80 backdrop-blur-sm rounded-full border border-border shadow-sm active:scale-95 transition-all text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export const EquipmentDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem, cart } = useCart();
  const [equipment, setEquipment] = useState<(Equipment & { prevSlug?: string | null; nextSlug?: string | null }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const similarRecommendations = useRecommendations({
    type: 'similar',
    itemId: slug || '',
    itemType: 'equipment',
    limit: 4,
    autoFetch: !!slug
  });

  const frequentlyBoughtRecommendations = useRecommendations({
    type: 'frequently-bought',
    itemId: slug || '',
    itemType: 'equipment',
    limit: 4,
    autoFetch: !!slug
  });

  const { addNotification } = useNotifications();

  useEffect(() => {
    if (!slug) return;
    const fetchEquipment = async () => {
      try {
        setLoading(true);
        setEquipment(null);
        const data = await apiFetch<Equipment & { prevSlug?: string | null; nextSlug?: string | null }>(`/equipments/${slug}`);
        const transformed = transformEquipment(data);
        setEquipment({
          ...transformed,
          prevSlug: data.prevSlug,
          nextSlug: data.nextSlug
        });

        if (data) {
          ReactGA.event({
            category: "ecommerce",
            action: "view_item",
            label: (data as Equipment).name,
            value: Number((data as Equipment).pricePerHour || 0)
          });
        }
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Não foi possível carregar os detalhes do equipamento.');
      } finally {
        setLoading(false);
      }
    };
    fetchEquipment();
  }, [slug]);

  // Diária (lote 13, decisão do dono de 06/11): a unidade do preço vem com o equipamento (priceUnit da API),
  // então a primeira pintura com o preço já diz "/ diária" quando o servidor cobra por diária. O servidor
  // (SSR) não busca o equipamento: pinta o carregando, sem preço nem unidade, e nada diverge na hidratação.
  const priceUnit = useEquipmentUnitOf(equipment, !loading);

  // Achado: havia um seletor de quantidade (−/+) que nunca era enviado — addItem do carrinho não
  // aceita quantidade. O seletor foi removido; o carrinho trabalha por item (sem quantidade).
  const handleAddToCart = async () => {
    if (!equipment) return;
    setAdding(true);
    try {
      await addItem(equipment, 'equipment');
      addNotification({
        type: 'success',
        title: 'Adicionado ao Orçamento',
        message: `${equipment.name} foi adicionado ao seu carrinho.`
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
      <PageLayout title="Equipamentos" hideTitle breadcrumbs={[LIST_CRUMB]}>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <BrandLoader size={120} label="Carregando equipamento..." />
        </div>
      </PageLayout>
    );
  }

  if (error || !equipment) {
    return (
      <PageLayout title={error ? 'Erro ao carregar o equipamento' : 'Equipamento não encontrado'} breadcrumbs={[LIST_CRUMB]}>
        <PageError
          title="Não foi possível abrir este equipamento"
          message={error || 'O equipamento que você procura não existe ou foi removido.'}
        />
        <div className="text-center">
          <Link to="/equipamentos" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Voltar para equipamentos
          </Link>
        </div>
      </PageLayout>
    );
  }

  const isAlreadyInCart = cart?.equipments?.some((e) => {
    const id = 'id' in e ? e.id : e.equipmentId;
    return id === equipment.id;
  });

  // Generate the product schema using the centralized generator
  const productSchema = generateProductSchema({
    name: equipment.name,
    description: equipment.description || `Aluguel de ${equipment.name} em BH`,
    image: equipment.imageUrl || '',
    sku: equipment.id,
    price: equipment.pricePerHour,
    availability: equipment.isAvailable ? 'InStock' : 'OutOfStock'
  });

  const availability =
    equipment.status === 'MAINTENANCE' ? { label: 'Em Manutenção', variant: 'warning' as const } :
    equipment.status === 'COMING_SOON' ? { label: 'Em Breve', variant: 'info' as const } :
    equipment.isAvailable ? { label: 'Disponível', variant: 'success' as const } :
    { label: 'Indisponível', variant: 'destructive' as const };

  return (
    <PageLayout title={equipment.name} hideTitle breadcrumbs={[LIST_CRUMB, { label: equipment.name }]}>
      <SEO
        title={equipment.name}
        description={equipment.description || `Aluguel de ${equipment.name} em Belo Horizonte. Equipamento profissional para eventos.`}
        image={equipment.imageUrl}
        jsonLd={productSchema}
        noindex={equipment.status === 'INACTIVE'}
      />

      <div className="bg-card p-6 md:p-8 rounded-2xl shadow-2xl border border-border">
        {/* Setas laterais (desktop) */}
        {equipment.prevSlug && (
          <Link
            to={`/equipamentos/${equipment.prevSlug}`}
            className={`${sideArrowClass} left-4`}
            aria-label="Equipamento anterior"
            title="Equipamento anterior"
          >
            <ChevronLeft className="w-8 h-8 group-hover:-translate-x-0.5 transition-transform" aria-hidden="true" />
          </Link>
        )}
        {equipment.nextSlug && (
          <Link
            to={`/equipamentos/${equipment.nextSlug}`}
            className={`${sideArrowClass} right-4`}
            aria-label="Próximo equipamento"
            title="Próximo equipamento"
          >
            <ChevronRight className="w-8 h-8 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </Link>
        )}

        {/* Setas compactas (celular/tablet) */}
        {(equipment.prevSlug || equipment.nextSlug) && (
          <div className="flex lg:hidden justify-end gap-3 mb-6">
            {equipment.prevSlug && (
              <Link to={`/equipamentos/${equipment.prevSlug}`} className={compactArrowClass} aria-label="Equipamento anterior">
                <ChevronLeft className="w-6 h-6" aria-hidden="true" />
              </Link>
            )}
            {equipment.nextSlug && (
              <Link to={`/equipamentos/${equipment.nextSlug}`} className={compactArrowClass} aria-label="Próximo equipamento">
                <ChevronRight className="w-6 h-6" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative mb-12">
          {/* Imagem */}
          <div className="relative">
            {equipment.imageUrl ? (
              <ZoomableProductPhoto src={equipment.imageUrl} alt={equipment.name} />
            ) : (
              <div className="w-full aspect-[4/3] rounded-xl border border-border bg-muted flex items-center justify-center" role="img" aria-label={`${equipment.name} (sem foto)`}>
                <Package className="w-16 h-16 text-muted-foreground" aria-hidden="true" />
              </div>
            )}
            {/* Achado: estas ações só apareciam no hover (sumiam no toque e no teclado). Abaixo
                de lg ficam sempre visíveis; no desktop elas aparecem ao lado do título. */}
            <div className="absolute top-4 right-4 flex lg:hidden flex-col gap-2">
              <FavoriteButton equipmentId={equipment.id} equipmentName={equipment.name} size="lg" />
              <CompareButton equipment={equipment} size="lg" itemType="equipment" />
            </div>
          </div>

          {/* Informações */}
          <div className="flex flex-col">
            <div className="flex justify-between items-start gap-4 mb-4">
              <h1 className="text-4xl lg:text-5xl font-bold text-primary leading-tight">
                {equipment.name}
              </h1>
              <div className="hidden lg:flex space-x-2">
                <FavoriteButton equipmentId={equipment.id} equipmentName={equipment.name} size="lg" />
                <CompareButton equipment={equipment} size="lg" itemType="equipment" />
              </div>
            </div>

            <p className="text-muted-foreground text-lg mb-8 leading-relaxed whitespace-pre-wrap">
              {equipment.description}
            </p>

            <div className="bg-muted/30 p-6 rounded-2xl mb-8 border border-border shadow-inner">
              <div className="flex flex-wrap justify-between items-baseline gap-2 mb-4">
                <span className="text-muted-foreground font-semibold">Valor da Locação</span>
                <div className="text-right">
                  <div className="text-4xl font-black text-foreground">
                    {formatPrice(Number(equipment.pricePerHour ?? 0))}
                    <span className="text-sm font-normal ml-1">{priceUnit === 'day' ? '/ diária' : '/ hora'}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Disponibilidade:</span>
                <Badge variant={availability.variant} size="lg">{availability.label}</Badge>
              </div>
            </div>

            <Button
              size="xl"
              fullWidth
              onClick={handleAddToCart}
              isLoading={adding}
              disabled={!equipment.isAvailable || isAlreadyInCart}
            >
              {adding ? 'Adicionando...' : (isAlreadyInCart ? 'Já no orçamento' : 'Adicionar ao orçamento')}
            </Button>
            <div className="mt-3">
              <AskOnWhatsAppButton kind="Equipamento" itemName={equipment.name} />
            </div>
          </div>
        </div>

        {/* Benefícios */}
        <TrustBenefits
          items={[
            // P20 (decisão do dono de 08/11/2026): sem promessa absoluta ("zero falhas", "sempre no horário").
            { icon: Shield, iconColor: 'success', title: 'Equipamento Revisado', description: 'Testado antes de cada entrega.' },
            { icon: Package, iconColor: 'info', title: 'Suporte Especializado', description: 'Nossa equipe técnica disponível para auxiliar na configuração se necessário.' },
            { icon: Zap, iconColor: 'primary', title: 'Entrega no Horário Combinado', description: 'A equipe leva o equipamento no horário combinado, antes do evento.' },
          ]}
        />

        {/* Recomendações */}
        {similarRecommendations.recommendations.length > 0 && (
          <div className="mt-12 pt-12 border-t border-border">
            <RecommendationSection
              type="similar"
              title="Equipamentos Similares"
              items={similarRecommendations.recommendations}
              maxItems={4}
              loading={similarRecommendations.loading}
              viewAllLink="/equipamentos"
              viewAllText="Ver Mais Equipamentos"
              columns={{ sm: 1, md: 2, lg: 4 }}
            />
          </div>
        )}

        {frequentlyBoughtRecommendations.recommendations.length > 0 && (
          <div className="mt-8">
            <RecommendationSection
              type="frequently-bought"
              title="Frequentemente Reservados Juntos"
              items={frequentlyBoughtRecommendations.recommendations}
              maxItems={4}
              loading={frequentlyBoughtRecommendations.loading}
              viewAllLink="/equipamentos"
              viewAllText="Explorar Mais"
              columns={{ sm: 1, md: 2, lg: 4 }}
            />
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default EquipmentDetailPage;
