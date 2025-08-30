import React from 'react';
import type { SidebarItemComponentProps } from '../../types/types';

/**
 * SidebarItemComponent - inspired em painéis de grandes players (Stripe, Notion, Linear)
 * - spore a multipeds níveis de menu
 * - Acessibilidade: navegação por teclado, roles e aria
 * - Feedback visual robusto
 * - Badge, ícone e children
 */
const SidebarItemComponent: React.FC<SidebarItemComponentProps> = React.memo((props) => {
  const {
    item,
    level = 0,
    setActiveItem,
    activeItem,
    setSidebarOpen,
    sidebarOpen = false,
    isActive = false,
  } = props;
  const [isExpanded, setIsExpanded] = React.useState(false);
  const hasChildren = !!item.children?.length;
  const indentClass = `pl-${Math.min((level + 1) * 4, 12)}`;

  // Expande automaticamente se algum filho estiver ativo
  React.useEffect(() => {
    if (hasChildren && item.children?.some((c) => c.id === activeItem)) {
      setIsExpanded(true);
    }
  }, [activeItem, hasChildren, item.children]);

  // O container deve ser <nav>, subníveis <ul>, itens <li> e botões <button>
  // Para navegação de sidebar, usamos roles de navegação ao invés de menu
  
  return (
    <ul
      className={level === 0 ? '' : 'ml-4 border-l border '}
    >
      <li>
        <button
          type="button"
          className={`flex items-center justify-between w-full px-4 py-3 cursor-pointer transition-colors duration-200 rounded-lg mx-2 mb-1 ${
            isActive
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-card-foreground  hover:bg-muted'
          } ${indentClass}`}
          onClick={() => {
            setActiveItem(item.id);
            if (hasChildren) setIsExpanded((v) => !v);
            if (!hasChildren && setSidebarOpen) setSidebarOpen(false);
          }}
          tabIndex={0}
          {...(hasChildren && { 'aria-expanded': isExpanded })}
          aria-label={item.label}
          onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setActiveItem(item.id);
              if (hasChildren) setIsExpanded((v) => !v);
              if (!hasChildren && setSidebarOpen) setSidebarOpen(false);
            }
          }}
        >
          <div className="flex items-center space-x-3">
            {item.icon && (
              <span className="text-lg" aria-hidden="true">
                {item.icon}
              </span>
            )}
            <span className="font-medium truncate max-w-[120px]">{item.label}</span>
            {item.badge && (
              <span className="bg-destructive/100 text-white text-xs px-2 py-1 rounded-full">
                {item.badge}
              </span>
            )}
          </div>
          {hasChildren && (
            <span
              className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              aria-hidden="true"
            >
              ▶️
            </span>
          )}
        </button>
        {hasChildren &&
          isExpanded &&
          item.children?.map((child) => (
            <SidebarItemComponent
              key={child.id}
              item={child}
              level={level + 1}
              isActive={activeItem === child.id}
              setActiveItem={setActiveItem}
              activeItem={activeItem}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
            />
          ))}
      </li>
    </ul>
  );
});

SidebarItemComponent.displayName = 'SidebarItemComponent';

export default SidebarItemComponent;
