// Caminho do arquivo: frontend/src/pages/CartPage.tsx


import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/useCart';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatPrice } from '../../utils/formatPrice';
import { apiFetch } from '../../services/api';

export const CartPage = () => {
  const { cart, removeItem, itemCount, clearCart } = useCart();
  
  // Normalizar equipments para uma estrutura consistente
  // Equipamentos
  const equipmentItems = (cart?.equipments || []).map((item) => {
    if ('equipmentId' in item) {
      return {
        id: item.equipmentId,
        name: item.equipment.name,
        price: item.equipment.pricePerHour || 0,
        images: item.equipment.images,
        type: 'equipment' as const,
      };
    }
    return {
      id: item.id,
      name: item.name,
      price: item.pricePerHour || 0,
      images: item.images,
      type: 'equipment' as const,
    };
  });

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

  const items = [...equipmentItems, ...kitItem];

  const totalPrice = items.reduce((acc, item) => acc + (item.price || 0), 0);
  const { addNotification } = useNotifications();
  const navigate = useNavigate();

  const subtotal = totalPrice;

  const totalItems = items.length;


  const handleRemoveItem = async (itemId: string, itemName: string, type: 'equipment' | 'kit') => {
    if (type === 'kit') {
      // Remove o kit do carrinho
  await apiFetch('/api/cart/clear-kit', { method: 'POST' });
      addNotification({
        type: 'success',
        title: 'Kit removido',
        message: `${itemName} foi removido do carrinho`,
        duration: 3000,
      });
      window.location.reload(); // força atualização do carrinho
      return;
    }
    await removeItem(itemId);
    addNotification({
      type: 'success',
      title: 'Item removido',
      message: `${itemName} foi removido do carrinho`,
      duration: 3000,
    });
  };

  const handleProceedToQuote = () => {
    if (itemCount > 0) {
      addNotification({
        type: 'info',
        title: 'Redirecionando...',
        message: 'Direcionando para solicitar orçamento',
        duration: 2000,
      });
      navigate('/quote-request');
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
      <div className="text-center bg-card p-8 rounded-lg border border-border">
        <h1 className="text-3xl font-bold mb-4 text-foreground">
          Seu Carrinho está Vazio
        </h1>
        <p className="text-muted-foreground mb-6">
          Parece que você ainda não adicionou nenhum item.
        </p>
        <Link
          to="/"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-6 rounded-lg transition-colors"
        >
          Ver Equipamentos
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card p-6 md:p-8 rounded-lg shadow-2xl border border-border">
      <h1 className="text-3xl font-bold mb-6 border-b border-border pb-4 text-foreground">
        Seu Carrinho
      </h1>
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between bg-background p-4 rounded-lg border border-border"
          >
            <div className="flex items-center gap-4">
              <img
                src={item.images?.[0] || `https://placehold.co/100x100/1f2937/ffffff?text=Img`}
                alt={item.name}
                className="w-16 h-16 rounded-md object-cover"
              />
              <div>
                <h2 className="font-bold text-lg text-foreground">{item.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(item.price)} {item.type === 'equipment' ? '/ hora' : ''}
                    </p>
              </div>
            </div>
            {item.type === 'kit' ? (
              <button
                onClick={() => handleRemoveItem(item.id, item.name, 'kit')}
                className="text-destructive hover:text-destructive/80 transition-colors"
                title="Remover kit"
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
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => handleRemoveItem(item.id, item.name, 'equipment')}
                className="text-destructive hover:text-destructive/80 transition-colors"
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
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-8 border-t border-border pt-6">
        <div className="flex justify-between items-center text-xl">
          <span className="text-muted-foreground">Subtotal (por hora)</span>
          <span className="font-bold text-2xl text-primary">
            {formatPrice(subtotal)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Custos de entrega e taxas serão calculados no próximo passo.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <button
            onClick={async () => {
              await clearCart();
            }}
            className="w-full sm:w-auto bg-muted text-muted-foreground hover:bg-muted/80 font-semibold py-3 px-4 rounded-lg transition-colors border border-border"
          >
            Limpar carrinho
          </button>
          <button
            onClick={handleProceedToQuote}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-4 rounded-lg text-lg transition-colors"
          >
            Pedir Orçamento
          </button>
        </div>
      </div>
    </div>
  );
};
