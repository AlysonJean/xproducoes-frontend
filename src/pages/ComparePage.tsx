import { useCompare } from '../contexts/CompareContext';
import { useRevealOnView } from '../hooks/useRevealOnView';
import { useNotifications } from '../contexts/NotificationContext';
import { formatPrice } from '../utils/typeSafeFormatters';
import { SEO } from '../components/SEO';
import { useCart } from '../hooks/useCart';
import { normalizeImageUrl } from '../utils/imageUtils';
import type { Equipment } from '../types/types';

type CompareItem = Equipment & {
  duration?: number;
  experienceLevels?: string[];
  slug?: string;
};

export const ComparePage = () => {
  const { ref: titleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  const { items: compareItems, removeItem: removeFromCompare, clearCompare } = useCompare();
  const { addNotification } = useNotifications();
  const { addItem, cart } = useCart();

  const handleRemove = (equipmentId: string, equipmentName: string) => {
    removeFromCompare(equipmentId);
    addNotification({
      type: 'info',
      title: 'Removido da comparação',
      message: `${equipmentName} foi removido da comparação`,
    });
  };

  const handleClearAll = () => {
    clearCompare();
    addNotification({
      type: 'info',
      title: 'Comparação limpa',
      message: 'Todos os itens foram removidos da comparação',
    });
  };

  const isItemInCart = (item: CompareItem) => {
    if (item.type === 'service') return cart?.services?.some((s: { id: string }) => s.id === item.id);
    if (item.type === 'kit') return cart?.kit?.id === item.id;
    return cart?.equipments?.some((e: { equipment?: { id: string }, id?: string }) => e.equipment?.id === item.id || e.id === item.id);
  };

  const handleAddToCart = (item: CompareItem) => {
    try {
      addItem(item as never, (item.type as "kit" | "service" | "equipment") || 'equipment');
      addNotification({
        type: 'success',
        title: 'Adicionado',
        message: `${item.name} foi adicionado ao seu orçamento.`
      });
    } catch (e: unknown) {
      addNotification({
        type: 'error',
        title: 'Erro',
        message: e instanceof Error ? e.message : 'Não foi possível adicionar ao orçamento.'
      });
    }
  };

  const getLinkPrefix = (type?: string) => {
    if (type === 'service') return '/servicos';
    if (type === 'kit') return '/kits';
    return '/equipamentos';
  };

  const getTypeLabel = (type?: string) => {
    if (type === 'kit') return 'Kit';
    if (type === 'service') return 'Serviço';
    return 'Equipamento';
  };

  if (compareItems.length === 0) {
    return (
      <div className="text-center py-20">
        <SEO 
          title="Comparar Itens"
          description="Compare equipamentos, kits e serviços lado a lado para escolher a melhor opção para seu evento."
        />
        <div className="max-w-md mx-auto">
          <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-foreground">
            Nenhum item para comparar
          </h2>
          <p className="text-muted-foreground mb-6">
            Adicione equipamentos, kits ou serviços à comparação para ver as diferenças lado a lado.
          </p>
          <a
            href="/"
            className="btn btn-default btn-md rounded-lg"
          >
            Explorar Catálogo
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SEO 
        title="Comparar Itens | X-Produções" 
        description="Compare as especificações técnicas, preços e detalhes dos itens para seu evento."
      />
      <div className="flex justify-between items-center">
        <div>
          <h1 ref={titleRef} className="text-3xl font-bold text-foreground heading-elegant">Comparar Itens</h1>
          <p className="text-muted-foreground mt-1">
            Comparando {compareItems.length} {compareItems.length === 1 ? 'item' : 'itens'}
          </p>
        </div>
        <button
          onClick={handleClearAll}
          className="btn btn-destructive btn-sm"
        >
          Limpar Todos
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full bg-card">
          <thead>
            <tr className="bg-muted/50">
              <td className="p-4 font-semibold text-foreground/70 sticky left-0 z-10 bg-muted/50 min-w-[140px]">
                Atributo
              </td>
              {compareItems.map((item) => (
                <td key={item.id} className="p-4 text-center min-w-[200px]">
                  <div className="relative">
                    <img
                      src={
                        item.imageUrl ? normalizeImageUrl(item.imageUrl) :
                        `https://placehold.co/200x150/1f2937/ffffff?text=${item.name.replace(/\s/g, '+')}`
                      }
                      alt={item.name}
                      onError={(e) => {
                        e.currentTarget.src = `https://placehold.co/200x150/1f2937/ffffff?text=${item.name.replace(/\s/g, '+')}`;
                      }}
                      className="w-32 h-24 object-cover rounded-lg mx-auto mb-3"
                    />
                    <button
                      onClick={() => handleRemove(item.id, item.name)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors text-xs flex items-center justify-center"
                      title="Remover da comparação"
                    >
                      ×
                    </button>
                    <h3 className="font-semibold text-sm text-foreground">
                      {item.name}
                    </h3>
                  </div>
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Tipo */}
            <tr className="border-t border-border">
              <td className="p-4 font-medium text-foreground sticky left-0 z-10 bg-card">Tipo</td>
              {compareItems.map((item) => (
                <td key={item.id} className="p-4 text-center">
                  <span className="badge badge-secondary">
                    {getTypeLabel(item.type)}
                  </span>
                </td>
              ))}
            </tr>

            {/* Descrição */}
            <tr className="border-t border-border bg-muted/30">
              <td className="p-4 font-medium text-foreground sticky left-0 z-10 bg-muted/30">Descrição</td>
              {compareItems.map((item) => (
                <td key={item.id} className="p-4 text-sm text-foreground/80 text-left align-top">
                  <p className="leading-relaxed whitespace-pre-line">
                    {item.description || <span className="italic text-muted-foreground">Sem descrição</span>}
                  </p>
                </td>
              ))}
            </tr>

            {/* Preço */}
            <tr className="border-t border-border">
              <td className="p-4 font-medium text-foreground sticky left-0 z-10 bg-card">Preço</td>
              {compareItems.map((item) => (
                <td key={item.id} className="p-4 text-center">
                  <span className="text-xl font-bold text-foreground">
                    {formatPrice(item.price ?? 0)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    {item.type === 'service' ? '/ serviço' : '/ hora'}
                  </span>
                </td>
              ))}
            </tr>

            {/* Ações */}
            <tr className="border-t border-border bg-muted/30">
              <td className="p-4 font-medium text-foreground sticky left-0 z-10 bg-muted/30">Ações</td>
              {compareItems.map((item) => (
                <td key={item.id} className="p-4 text-center">
                  <div className="space-y-2">
                    <a
                      href={`${getLinkPrefix(item.type)}/${(item as CompareItem).slug || item.id}`}
                      className="btn btn-default btn-sm w-full justify-center text-sm"
                    >
                      Ver Detalhes
                    </a>
                    <button 
                      onClick={() => handleAddToCart(item as CompareItem)}
                      disabled={cart ? isItemInCart(item as CompareItem) : false}
                      className={`btn btn-sm w-full justify-center text-sm
                        ${cart && isItemInCart(item as CompareItem) 
                          ? 'bg-success/10 text-success border border-success/20 cursor-not-allowed' 
                          : 'btn-outline'}`}
                    >
                      {cart && isItemInCart(item as CompareItem) ? '✓ No Orçamento' : 'Adicionar ao Orçamento'}
                    </button>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
