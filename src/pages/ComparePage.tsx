import { useCompare } from '../contexts/CompareContext';
import { useRevealOnView } from '../hooks/useRevealOnView';
import { useNotifications } from '../contexts/NotificationContext';
import { formatPrice } from '../utils/typeSafeFormatters';
import { SEO } from '../components/SEO';

export const ComparePage = () => {
  const { ref: titleRef } = useRevealOnView<HTMLHeadingElement>({ threshold: 0.2 });
  const { items: compareItems, removeItem: removeFromCompare, clearCompare } = useCompare();
  const { addNotification } = useNotifications();

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
      message: 'Todos os equipamentos foram removidos da comparação',
    });
  };

  if (compareItems.length === 0) {
    return (
      <div className="text-center py-20">
        <SEO 
          title="Comparar Equipamentos | X-Produções" 
          description="Compare equipamentos lado a lado para escolher a melhor opção para seu evento."
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
            Nenhum equipamento para comparar
          </h2>
          <p className="text-muted-foreground mb-6">
            Adicione equipamentos à comparação para ver as diferenças lado a lado.
          </p>
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Explorar Equipamentos
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SEO 
        title="Comparar Equipamentos | X-Produções" 
        description="Compare as especificações técnicas, preços e detalhes dos equipamentos para seu evento."
      />
      <div className="flex justify-between items-center">
        <div>
          <h1 ref={titleRef} className="text-3xl font-bold text-foreground heading-elegant">Comparar Equipamentos</h1>
          <p className="text-muted-foreground">
            Comparando {compareItems.length} equipamentos
          </p>
        </div>
        <button
          onClick={handleClearAll}
          className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
        >
          Limpar Todos
        </button>
      </div>

      <div className="overflow-x-auto">
  <table className="w-full bg-card rounded-lg overflow-hidden border border-border">
          <thead>
            <tr>
              <td className="p-4 font-semibold text-muted-foreground bg-muted">
                Atributo
              </td>
              {compareItems.map((item) => (
                <td key={item.id} className="p-4 text-center bg-muted">
                  <div className="relative">
                    <img
                      src={
                        item.imageUrl ||
                        `https://placehold.co/200x150/1f2937/ffffff?text=${item.name.replace(/\s/g, '+')}`
                      }
                      alt={item.name}
                      className="w-32 h-24 object-cover rounded-lg mx-auto mb-2"
                    />
                    <button
                      onClick={() => handleRemove(item.id, item.name)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
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
    <tr className="border-t border-border">
              <td className="p-4 font-medium">Descrição</td>
              {compareItems.map((item) => (
                <td key={item.id} className="p-4 text-center text-sm text-muted-foreground">
                  <p className="line-clamp-3 hover:line-clamp-none transition-all duration-300">
                    {item.description || <span className="italic">Sem descrição</span>}
                  </p>
                </td>
              ))}
            </tr>
            <tr className="border-t border-border bg-muted">
              <td className="p-4 font-medium">Preço</td>
              {compareItems.map((item) => (
                <td key={item.id} className="p-4 text-center">
      <span className="text-lg font-semibold text-accent">
                    {formatPrice(item.price ?? 0)}
                  </span>
                </td>
              ))}
            </tr>
    <tr className="border-t border-border bg-muted">
              <td className="p-4 font-medium">Tipo</td>
              {compareItems.map((item) => (
                <td key={item.id} className="p-4 text-center">
      <span className="px-2 py-1 bg-accent/10 text-accent rounded-full text-xs">
                    {item.type === 'kit' ? 'Kit' : 'Equipamento'}
                  </span>
                </td>
              ))}
            </tr>
    <tr className="border-t border-border">
              <td className="p-4 font-medium">Especificações</td>
              {compareItems.map((item) => (
        <td key={item.id} className="p-4 text-center text-sm text-muted-foreground">
                  <div className="space-y-1">
                    {item.specifications ? (
                      Object.entries(item.specifications).map(([key, value]) => (
                        <div key={key}>
                          <strong>{key}:</strong> {String(value)}
                        </div>
                      ))
                    ) : (
                      <span className="italic text-muted-foreground">Sem especificações</span>
                    )}
                  </div>
                </td>
              ))}
            </tr>
            <tr className="border-t border-border bg-muted">
              <td className="p-4 font-medium">Adicionado em</td>
              {compareItems.map((item) => (
                <td key={item.id} className="p-4 text-center text-sm text-muted-foreground">
                  {item.addedAt ? (
                    item.addedAt.toLocaleDateString('pt-PT')
                  ) : (
                    <span className="italic text-muted-foreground">-</span>
                  )}
                </td>
              ))}
            </tr>
            <tr className="border-t border-border">
              <td className="p-4 font-medium">Ações</td>
              {compareItems.map((item) => (
                <td key={item.id} className="p-4 text-center">
                  <div className="space-y-2">
                    <a
                      href={`/${item.type}s/${item.id}`}
                      className="block w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors text-sm"
                    >
                      Ver Detalhes
                    </a>
                    <button className="w-full bg-muted text-foreground py-2 px-4 rounded-lg hover:bg-muted/70 transition-colors text-sm">
                      Adicionar ao Carrinho
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
