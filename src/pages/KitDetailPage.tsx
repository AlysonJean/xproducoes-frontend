import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import ReactGA from 'react-ga4';
import { apiFetch } from '../services/api';
import { useCart } from '@/hooks/useCart';
import { useNotifications } from '../contexts/NotificationContext';
import BrandLoader from '@/components/ui/BrandLoader';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import { formatPrice } from '../utils/typeSafeFormatters';
import { toNumber, calculateSavingsAmount } from '../utils/typeSafeFormatters';
import type { Kit, ExperienceLevel } from '../types/types';
import { SEO } from '../components/SEO';
import { transformKit } from '../utils/transformKit';
import { ExperienceLevelSelector } from '../components/kits/ExperienceLevelSelector';

export const KitDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem, cart } = useCart();
  const { addNotification } = useNotifications();
  const [kit, setKit] = useState<Kit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<ExperienceLevel | null>(null);

  useEffect(() => {
    if (!slug) return;
    const fetchKit = async () => {
      try {
        setLoading(true);
        const data = await apiFetch(`/kits/${slug}`);
        setKit(transformKit(data as Kit));
        
        // GA Tracking - View Kit
        if (data) {
          ReactGA.event({
            category: "ecommerce",
            action: "view_item",
            label: `Kit: ${(data as Kit).name}`,
            value: Number((data as Kit).price || 0)
          });
        }
      } catch {
        setError('Não foi possível carregar os detalhes do kit.');
      } finally {
        setLoading(false);
      }
    };
    fetchKit();
  }, [slug]);

  // Estados de carregamento/erro
  if (loading) {
    return <BrandLoader fullScreen size={140} label="Carregando kit..." />;
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-lg">
        {error}
      </div>
    );
  }

  if (!kit) {
    return (
      <div className="text-muted-foreground">Kit não encontrado.</div>
    );
  }

  // Cálculos derivados
  const totalEquipmentPrice = (kit.equipments || []).reduce((sum, e) => {
    return sum + toNumber((e as any).price ?? (e as any).pricePerHour ?? (e as any).dailyPrice);
  }, 0);
  const savings = calculateSavingsAmount(totalEquipmentPrice, kit.price ?? 0);

  const handleAddToCart = async () => {
    if (!kit) return;
    setAdding(true);
    try {
      await addItem(kit, 'kit');
    } catch (e) {
      addNotification({ type: 'error', title: 'Erro', message: 'Não foi possível adicionar o kit ao carrinho.' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-8">
      <SEO 
        title={kit.name}
        description={kit.description || `Aluguel de ${kit.name} em Belo Horizonte. Kit completo para festas e eventos.`}
        image={kit.imageUrl}
      />
      {/* Navigation Arrows (Desktop) */}
      {kit.prevSlug && (
        <Link
          to={`/kits/${kit.prevSlug}`}
          className="fixed left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-primary hover:text-primary-foreground p-3 rounded-full shadow-lg border border-border backdrop-blur-sm transition-all z-50 hidden lg:flex items-center justify-center group"
          title="Kit Anterior"
        >
          <ChevronLeft className="w-8 h-8 group-hover:-translate-x-0.5 transition-transform" />
        </Link>
      )}
      {kit.nextSlug && (
        <Link
          to={`/kits/${kit.nextSlug}`}
          className="fixed right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-primary hover:text-primary-foreground p-3 rounded-full shadow-lg border border-border backdrop-blur-sm transition-all z-50 hidden lg:flex items-center justify-center group"
          title="Próximo Kit"
        >
          <ChevronRight className="w-8 h-8 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground">
        <Link to="/" className="hover:text-primary">Início</Link>
        <span className="mx-2">&gt;</span>
        <Link to="/kits" className="hover:text-primary">Kits</Link>
        <span className="mx-2">&gt;</span>
        <span className="text-primary">{kit.name}</span>
      </nav>

      <div className="bg-card rounded-lg overflow-hidden shadow-2xl border border-border">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 md:p-8">
          {/* Imagem do Kit */}
          <div className="relative">
            <img
              src={
                kit.imageUrl ||
                `https://placehold.co/800x600/1a202c/ffffff?text=${kit.name.replace(/\s/g, '+')}`
              }
              alt={kit.name}
              className="w-full h-96 object-cover rounded-lg shadow-lg"
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                e.currentTarget.src = `https://placehold.co/800x600/1a202c/ffffff?text=Kit+Indisponível`;
              }}
            />
            {savings > 0 && (
              <div className="absolute top-4 left-4 bg-success/10 text-success px-3 py-1 rounded-full text-sm font-bold border border-success/20">
                Economize {formatPrice(savings)}
              </div>
            )}
          </div>

          {/* Informações do Kit */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <h1 className="text-3xl lg:text-4xl font-bold text-primary">{kit.name}</h1>
                <FavoriteButton equipmentId={kit.id} equipmentName={kit.name} size="lg" />
              </div>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {kit.description}
            </p>  <div className="bg-muted/30 p-6 rounded-lg mb-6 border border-border">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-2xl font-bold text-foreground">Preço do Kit</span>
                  <span className="text-3xl font-extrabold text-foreground">
                    <span className="text-lg font-normal mr-2">a partir de</span>
                    {formatPrice(Number(kit.price ?? 0))} / hora
                  </span>
                </div>
                {savings > 0 && (
                  <div className="text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Preço individual dos equipamentos:</span>
                      <span className="line-through text-muted-foreground">{formatPrice(totalEquipmentPrice)}</span>
                    </div>
                    <div className="flex justify-between text-success font-semibold">
                      <span>Sua economia:</span>
                      <span>{formatPrice(savings)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Seletor de Nível de Experiência */}
              {kit.experienceLevels && kit.experienceLevels.length > 0 && (
                <div className="border-t border-border pt-6">
                  <ExperienceLevelSelector
                    levels={kit.experienceLevels}
                    selected={selectedLevel}
                    onSelect={setSelectedLevel}
                    basePrice={kit.experienceLevels.find(l => l.level === 'SILVER')?.price}
                  />
                </div>
              )}
            </div>
            <button
              onClick={handleAddToCart}
              className="w-full bg-primary hover:bg-primary text-primary-foreground font-bold py-4 px-6 rounded-lg transition-colors duration-200 text-lg disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={adding || (cart?.kit && cart.kit.id === kit.id)}
            >
              {adding ? 'Adicionando...' : (cart?.kit && cart.kit.id === kit.id ? 'Kit já está no carrinho' : 'Adicionar Kit ao Carrinho')}
            </button>
          </div>
        </div>

        {/* Equipamentos Incluídos */}
        <div className="border-t border-border p-6 md:p-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Equipamentos Incluídos ({kit.equipments?.length || kit.items?.length || 0})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(kit.equipments || []).map((equipment) => (
              <div key={equipment.id} className="bg-muted/30 rounded-lg p-4 hover:bg-muted transition-colors border border-border">
                <div className="flex items-center space-x-4">
                  <img
                    src={
                      equipment.imageUrl ||
                      `https://placehold.co/80x80/1f2937/ffffff?text=${equipment.name.slice(0, 2)}`
                    }
                    alt={equipment.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-sm">{equipment.name}</h3>
                    <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{equipment.description}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-foreground font-semibold text-sm">{formatPrice(Number(equipment.pricePerHour))}/h</span>
                      <Link to={`/equipamentos/${equipment.slug || equipment.id}`} className="text-xs text-primary hover:underline">Ver detalhes</Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Seção de Benefícios */}
        <div className="border-t border-border p-6 md:p-8 bg-card">
          <h2 className="text-2xl font-bold text-foreground mb-6">Por que escolher este kit?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/40 rounded-full flex items-center justify-center mx-auto mb-3 border border-primary/50 shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Economia Garantida</h3>
              <p className="text-muted-foreground text-sm">Preço especial quando você aluga os equipamentos juntos</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary/40 rounded-full flex items-center justify-center mx-auto mb-3 border border-primary/50 shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Compatibilidade</h3>
              <p className="text-muted-foreground text-sm">Todos os equipamentos funcionam perfeitamente juntos</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary/40 rounded-full flex items-center justify-center mx-auto mb-3 border border-primary/50 shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Solução Completa</h3>
              <p className="text-muted-foreground text-sm">Tudo que você precisa para o seu evento em um só kit</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
