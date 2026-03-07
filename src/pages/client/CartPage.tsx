/* eslint-disable @typescript-eslint/no-explicit-any */
// Caminho do arquivo: frontend/src/pages/client/CartPage.tsx

import { Link, useNavigate } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { useCart } from '@/hooks/useCart';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatPrice } from '../../utils/formatPrice';
import { RecommendationSection } from '../../components/ui/RecommendationSection';
import { useRecommendations } from '../../hooks/useRecommendations';

export const CartPage = () => {
  const { cart, removeItem, itemCount, clearCart } = useCart();
  
  // Equipamentos
    const equipmentItems = (cart?.equipments || []).map((item: any) => {
    if ('equipmentId' in item) {
      return {
        id: item.equipmentId,
        name: item.equipment.name,
        price: item.equipment.pricePerHour || 0,
        images: item.equipment.imageUrl ? [item.equipment.imageUrl] : (item.equipment.images || []),
        type: 'equipment' as const,
      };
    }
    return {
      id: item.id,
      name: item.name,
      price: item.pricePerHour || 0,
      images: item.imageUrl ? [item.imageUrl] : (item.images || []),
      type: 'equipment' as const,
    };
  });

  // Serviços
    const serviceItems = ((cart as any)?.services || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    price: item.price || 0,
    images: item.imageUrl ? [item.imageUrl] : [],
    type: 'service' as const,
  }));

  // Kit único
  const kitItem = cart?.kit
    ? [{
        id: cart.kit.id,
        name: cart.kit.name,
        price: cart.kit.price || 0,
        images: cart.kit.imageUrl ? [cart.kit.imageUrl] : [],
        type: 'kit' as const,
      }]
    : [];

  const items = [...equipmentItems, ...serviceItems, ...kitItem];

  const totalPrice = items.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const subtotal = totalPrice;
  const totalItems = items.length;

  // Get recommendations
  const firstItemId = items[0]?.id;
  const firstItemType = items[0]?.type;

  const complementaryRecommendations = useRecommendations({
    type: 'frequently-bought',
    itemId: firstItemId || '',
        itemType: (firstItemType as any) || 'equipment',
    limit: 4,
    autoFetch: !!firstItemId
  });

  const trendingRecommendations = useRecommendations({
    type: 'trending',
    limit: 4,
    autoFetch: totalItems === 0
  });

  const handleRemoveItem = async (itemId: string, itemName: string, type: 'equipment' | 'kit' | 'service') => {
    try {
      await removeItem(itemId, type);
      addNotification({
        type: 'success',
        title: 'Item removido',
        message: `${itemName} foi removido do carrinho`,
        duration: 3000,
      });
    } catch {
       addNotification({
        type: 'error',
        title: 'Erro ao remover',
        message: `Não foi possível remover ${itemName}`,
      });
    }
  };

  const handleProceedToQuote = () => {
    if (itemCount > 0) {
      ReactGA.event({
        category: "ecommerce",
        action: "begin_checkout",
        value: totalPrice,
        label: `Items: ${totalItems}`
      });

      addNotification({
        type: 'info',
        title: 'Redirecionando...',
        message: 'Direcionando para solicitar orçamento',
        duration: 2000,
      });
      navigate('/orcamento');
    } else {
      addNotification({
        type: 'warning',
        title: 'Carrinho vazio',
        message: 'Adicione itens ao carrinho antes de solicitar orçamento',
        duration: 4000,
      });
    }
  };

  if (totalItems === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="text-center bg-card p-12 rounded-3xl border border-border shadow-2xl space-y-8">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
            </div>
            <div className="space-y-4">
                <h1 className="text-4xl font-black text-foreground">Seu Carrinho está Vazio</h1>
                <p className="text-muted-foreground text-xl max-w-md mx-auto">
                    Ainda não encontramos nenhum item por aqui. Que tal explorar nossos equipamentos e serviços?
                </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link
                    to="/equipamentos"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-black py-4 px-10 rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-primary/20"
                >
                    Ver Equipamentos
                </Link>
                <Link
                    to="/servicos"
                    className="bg-muted hover:bg-muted/80 text-foreground font-bold py-4 px-10 rounded-xl transition-all border border-border"
                >
                    Nossos Serviços
                </Link>
            </div>
        </div>

        {/* Trending Recommendations when empty */}
        {trendingRecommendations.recommendations.length > 0 && (
            <div className="mt-20">
                <RecommendationSection
                    type="trending"
                    items={trendingRecommendations.recommendations}
                    maxItems={4}
                    loading={trendingRecommendations.loading}
                    viewAllLink="/equipamentos"
                    viewAllText="Explorar Mais"
                    columns={{ sm: 1, md: 2, lg: 4 }}
                />
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="bg-card p-6 md:p-10 rounded-3xl shadow-2xl border border-border">
        <div className="flex justify-between items-center mb-10 border-b border-border pb-8">
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight">
            Seu Carrinho
            </h1>
            <div className="flex items-center gap-3">
                <span className="text-muted-foreground font-medium uppercase text-xs tracking-widest">Resumo</span>
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-black shadow-lg shadow-primary/20">
                {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                </span>
            </div>
        </div>

        <div className="space-y-6">
            {items.map((item) => (
            <div
                key={`${item.type}-${item.id}`}
                className="flex items-center justify-between bg-muted/10 p-5 rounded-2xl border border-transparent hover:border-border hover:bg-muted/20 transition-all duration-300 group"
            >
                <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-xl overflow-hidden border border-border bg-background shadow-inner">
                    <img
                    src={item.images?.[0] || `https://placehold.co/200x200/1f2937/ffffff?text=${item.name.charAt(0)}`}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                    />
                </div>
                <div>
                    <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] uppercase tracking-[0.2em] font-black px-2.5 py-1 rounded-lg ${
                        item.type === 'equipment' ? 'bg-blue-500/10 text-blue-500' : 
                        item.type === 'service' ? 'bg-emerald-500/10 text-emerald-500' : 
                        'bg-orange-500/10 text-orange-500'
                    }`}>
                        {item.type === 'equipment' ? 'Equipamento' : item.type === 'service' ? 'Serviço' : 'Combo'}
                    </span>
                    </div>
                    <h2 className="font-bold text-2xl text-foreground mb-1">{item.name}</h2>
                    <p className="text-primary font-black text-xl">
                    {formatPrice(item.price)} <span className="text-sm font-normal text-muted-foreground">{item.type === 'service' ? '/ serviço' : '/ hora'}</span>
                    </p>
                </div>
                </div>
                
                <button
                onClick={() => handleRemoveItem(item.id, item.name, item.type)}
                className="p-4 text-muted-foreground hover:text-white hover:bg-destructive rounded-2xl transition-all duration-300 shadow-sm"
                title="Remover item"
                >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                </svg>
                </button>
            </div>
            ))}
        </div>

        <div className="mt-12 border-t-2 border-dashed border-border pt-10 px-4">
            <div className="flex flex-col md:flex-row justify-between items-end gap-10">
            <div className="space-y-4 max-w-md">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-muted-foreground font-semibold uppercase text-xs tracking-widest">Subtotal parcial</span>
                </div>
                <div className="text-5xl font-black text-foreground">
                {formatPrice(subtotal)}
                </div>
                <p className="text-muted-foreground leading-relaxed">
                Este valor é uma estimativa parcial. Equipamentos e Kits serão multiplicados pela duração final (horas) do seu evento, enquanto os serviços possuem valor fixo. Taxas de transporte serão validadas por nossa equipe.
                </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <button
                onClick={async () => {
                    if(confirm('Limpar todos os itens do carrinho?')) {
                    await clearCart();
                    }
                }}
                className="bg-muted/50 text-foreground font-bold py-5 px-10 rounded-2xl transition-all border border-border hover:bg-muted/80"
                >
                Esvaziar Carrinho
                </button>
                <button
                onClick={handleProceedToQuote}
                className="bg-primary hover:bg-primary text-primary-foreground font-black py-5 px-12 rounded-2xl text-2xl transition-all shadow-2xl shadow-primary/30 hover:shadow-primary/50 transform hover:-translate-y-1 active:scale-95"
                >
                Seguir para Orçamento
                </button>
            </div>
            </div>
        </div>

        {/* Recomendações Complementares */}
        {complementaryRecommendations.recommendations.length > 0 && (
            <div className="mt-24 border-t border-border pt-16">
            <RecommendationSection
                type="frequently-bought"
                title="Aproveite e Adicione"
                items={complementaryRecommendations.recommendations}
                maxItems={4}
                loading={complementaryRecommendations.loading}
                viewAllLink="/equipamentos"
                viewAllText="Ver Todas"
                columns={{ sm: 1, md: 2, lg: 4 }}
            />
            </div>
        )}
      </div>
    </div>
  );
};
export default CartPage;
