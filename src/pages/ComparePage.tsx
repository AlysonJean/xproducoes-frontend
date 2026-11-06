import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Package, X } from 'lucide-react';
import { useCompare } from '../contexts/CompareContext';
import { useNotifications } from '../contexts/NotificationContext';
import { formatPrice } from '../utils/typeSafeFormatters';
import { SEO } from '../components/SEO';
import { useCart } from '../hooks/useCart';
import { normalizeImageUrl } from '../utils/imageUtils';
import type { Equipment } from '../types/types';
import { PageLayout, PageEmpty } from '../components/layouts/PageLayout';
import { Badge, Button, buttonVariants } from '../components/ui/StandardComponents';

type CompareItem = Equipment & {
  duration?: number;
  experienceLevels?: string[];
  slug?: string;
};

const PAGE_DESCRIPTION = 'Compare equipamentos, kits e serviços lado a lado para escolher a melhor opção para seu evento.';

// Miniatura com fallback neutro (antes: imagem do placehold.co com cores fixas).
const CompareThumb = ({ src, alt }: { src?: string | null; alt: string }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="w-32 h-24 rounded-lg mx-auto mb-3 bg-muted flex items-center justify-center" role="img" aria-label={`${alt} (sem foto)`}>
        <Package className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }
  return (
    <img
      src={normalizeImageUrl(src)}
      alt={alt}
      onError={() => setFailed(true)}
      className="w-32 h-24 object-cover rounded-lg mx-auto mb-3"
    />
  );
};

export const ComparePage = () => {
  const navigate = useNavigate();
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

  // Achado: a página não usava o PageLayout — sem container (a tabela encostava nas bordas da
  // tela), sem h1 no estado vazio e com botões das classes .btn do CSS, um sistema paralelo
  // ao <Button>.
  if (compareItems.length === 0) {
    return (
      <PageLayout title="Comparar Itens" description={PAGE_DESCRIPTION}>
        <SEO title="Comparar Itens" description={PAGE_DESCRIPTION} />
        <PageEmpty
          title="Nenhum item para comparar"
          message="Adicione equipamentos, kits ou serviços à comparação para ver as diferenças lado a lado."
          actionLabel="Explorar catálogo"
          onAction={() => navigate('/equipamentos')}
          icon={
            <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
          }
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Comparar Itens"
      description={`Comparando ${compareItems.length} ${compareItems.length === 1 ? 'item' : 'itens'}`}
      headerActions={
        <Button variant="destructive" size="sm" onClick={handleClearAll}>
          Limpar todos
        </Button>
      }
    >
      <SEO
        title="Comparar Itens"
        description="Compare as especificações técnicas, preços e detalhes dos itens para seu evento."
      />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full bg-card">
          <caption className="sr-only">Comparação lado a lado dos itens selecionados</caption>
          <thead>
            <tr className="bg-muted">
              <th scope="col" className="p-4 text-left font-semibold text-muted-foreground sticky left-0 z-10 bg-muted min-w-[140px]">
                Atributo
              </th>
              {compareItems.map((item) => (
                <th scope="col" key={item.id} className="p-4 text-center min-w-[200px] font-normal">
                  <div className="relative">
                    <CompareThumb src={item.imageUrl} alt={item.name} />
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleRemove(item.id, item.name)}
                      className="absolute -top-2 -right-2 h-8 w-8 p-0 rounded-full"
                      aria-label={`Remover ${item.name} da comparação`}
                      title="Remover da comparação"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <span className="block font-semibold text-sm text-foreground">
                      {item.name}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Tipo */}
            <tr className="border-t border-border">
              <th scope="row" className="p-4 text-left font-medium text-foreground sticky left-0 z-10 bg-card">Tipo</th>
              {compareItems.map((item) => (
                <td key={item.id} className="p-4 text-center">
                  <Badge variant="outline">
                    {getTypeLabel(item.type)}
                  </Badge>
                </td>
              ))}
            </tr>

            {/* Descrição */}
            <tr className="border-t border-border bg-muted">
              <th scope="row" className="p-4 text-left font-medium text-foreground sticky left-0 z-10 bg-muted">Descrição</th>
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
              <th scope="row" className="p-4 text-left font-medium text-foreground sticky left-0 z-10 bg-card">Preço</th>
              {compareItems.map((item) => (
                <td key={item.id} className="p-4 text-center">
                  <span className="text-xl font-bold text-foreground">
                    {formatPrice(item.price ?? 0)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    {/* Decisão do dono de 06/11: kit por evento. */}
                    {item.type === 'service' ? '/ serviço' : item.type === 'kit' ? 'por evento' : '/ hora'}
                  </span>
                </td>
              ))}
            </tr>

            {/* Ações */}
            <tr className="border-t border-border bg-muted">
              <th scope="row" className="p-4 text-left font-medium text-foreground sticky left-0 z-10 bg-muted">Ações</th>
              {compareItems.map((item) => {
                const inCart = !!(cart && isItemInCart(item as CompareItem));
                return (
                  <td key={item.id} className="p-4 text-center">
                    <div className="space-y-2">
                      <Link
                        to={`${getLinkPrefix(item.type)}/${(item as CompareItem).slug || item.id}`}
                        className={buttonVariants({ size: 'sm', fullWidth: true })}
                      >
                        Ver detalhes
                      </Link>
                      <Button
                        size="sm"
                        fullWidth
                        variant={inCart ? 'ghost' : 'outline'}
                        onClick={() => handleAddToCart(item as CompareItem)}
                        disabled={inCart}
                        leftIcon={inCart ? <Check className="h-4 w-4" aria-hidden="true" /> : undefined}
                      >
                        {inCart ? 'No orçamento' : 'Adicionar ao orçamento'}
                      </Button>
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </PageLayout>
  );
};
