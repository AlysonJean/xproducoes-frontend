import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  User,
  DollarSign,
  BarChart3,
  Calendar,
  Clock,
  MessageSquare,
  Bell,
  Settings,
  Menu,
  X,
  Search,
  ChevronDown,
} from 'lucide-react';
import { normalizeString } from '../../utils/string';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';

interface MenuGroup {
  name: string;
  items: MenuItem[];
}

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  description?: string;
}

// Estrutura de navegação do portal do colaborador. Ícones do lucide (antes, SVGs à mão — o de
// "Cronograma" e o de "Notificações" tinham o desenho corrompido).
const menuGroups: MenuGroup[] = [
  {
    name: 'Visão Geral',
    items: [
      {
        name: 'Dashboard',
        href: '/colaborador/painel',
        icon: Home,
        description: 'Visão geral e métricas',
      },
    ],
  },
  {
    name: 'Perfil',
    items: [
      {
        name: 'Meu Perfil',
        href: '/colaborador/perfil',
        icon: User,
        description: 'Informações pessoais',
      },
    ],
  },
  {
    name: 'Financeiro',
    items: [
      {
        name: 'Ganhos',
        href: '/colaborador/ganhos',
        icon: DollarSign,
        description: 'Receitas e pagamentos',
      },
      {
        name: 'Relatórios',
        href: '/colaborador/relatorios',
        icon: BarChart3,
        description: 'Análises detalhadas',
      },
    ],
  },
  {
    name: 'Agenda',
    items: [
      {
        name: 'Agenda de Trabalho',
        href: '/colaborador/agenda',
        icon: Calendar,
        description: 'Eventos e calendário',
      },
      {
        name: 'Disponibilidade',
        href: '/colaborador/disponibilidade',
        icon: Clock,
        description: 'Configurar horários',
      },
    ],
  },
  {
    name: 'Comunicação',
    items: [
      // Achado (auditoria): a rota /colaborador/mensagens existia, mas não estava no menu —
      // só era alcançável pelo atalho do Dashboard.
      {
        name: 'Mensagens',
        href: '/colaborador/mensagens',
        icon: MessageSquare,
        description: 'Conversas com a produção',
      },
      {
        name: 'Notificações',
        href: '/colaborador/notificacoes',
        icon: Bell,
        description: 'Alertas e avisos',
      },
    ],
  },
  {
    name: 'Sistema',
    items: [
      {
        name: 'Configurações',
        href: '/colaborador/configuracoes',
        icon: Settings,
        description: 'Preferências da conta',
      },
    ],
  },
];

interface CollaboratorSidebarProps {
  /** Menu aberto no celular (controlado pelo CollaboratorLayout, que mostra o botão de menu). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CollaboratorSidebar: React.FC<CollaboratorSidebarProps> = ({ open, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const { user } = useAuth();

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = (value: boolean) => {
    if (!isControlled) setInternalOpen(value);
    onOpenChange?.(value);
  };

  // Esc fecha o menu no celular.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isControlled) setInternalOpen(false);
        onOpenChange?.(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isControlled, onOpenChange]);

  // Don't show sidebar if not authenticated
  if (!user) {
    return null;
  }

  // O portal vive em /colaborador/* (CollaboratorRoutes); /collaborator/* são só redirects
  // legados. Testar só /collaborator fazia a barra nunca aparecer.
  if (!location.pathname.startsWith('/colaborador') && !location.pathname.startsWith('/collaborator')) {
    return null;
  }

  const toggleGroup = (groupName: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupName)) {
      newCollapsed.delete(groupName);
    } else {
      newCollapsed.add(groupName);
    }
    setCollapsedGroups(newCollapsed);
  };

  const isGroupCollapsed = (groupName: string) => collapsedGroups.has(groupName);

  // Filter items based on search query
  const q = normalizeString(searchQuery);
  const filteredGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item =>
      q === '' ||
      normalizeString(item.name).includes(q) ||
      normalizeString(item.description).includes(q)
    )
  })).filter(group => group.items.length > 0);

  return (
    <>
      {/* Sem o CollaboratorLayout (que tem o botão de menu na barra do topo), mantém um botão
          próprio — no canto inferior, para não cobrir o Header global fixo. */}
      {!isControlled && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-4 left-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          aria-label={isOpen ? 'Fechar menu do colaborador' : 'Abrir menu do colaborador'}
          aria-expanded={isOpen}
          aria-controls="collaborator-sidebar"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      )}

      {/* Fundo escurecido no celular (abaixo do Header global, que tem h-16) */}
      {isOpen && (
        <div
          className="fixed inset-x-0 bottom-0 top-16 z-30 bg-background/80 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Achado (auditoria mobile): a barra começava em top-0 no celular — ficava por baixo do
          Header global fixo (z-50, h-16). Agora começa abaixo dele (h-16; h-20 a partir de lg).
          Fechada no celular, fica `invisible` para os links não receberem foco do teclado. */}
      <div
        id="collaborator-sidebar"
        className={cn(
          'fixed left-0 top-16 z-40 flex h-[calc(100dvh-4rem)] w-72 max-w-[85vw] flex-col overflow-hidden border-r border-border bg-card transition-[transform,visibility] duration-300 ease-in-out',
          'md:visible md:max-w-none md:translate-x-0 md:h-[calc(100vh-4rem)] lg:top-20 lg:h-[calc(100vh-5rem)]',
          isOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'
        )}
        role="navigation"
        aria-label="Menu do colaborador"
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex-shrink-0">
          {/* Fechar dentro do menu (celular): a sidebar aberta cobre a barra com o botão do layout. */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="md:hidden absolute top-3 right-3 inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground font-bold text-lg" aria-hidden="true">C</span>
            </div>
            <div>
              <p className="font-bold text-foreground text-lg">Painel Colaborador</p>
              <p className="text-xs text-muted-foreground">Área do Profissional</p>
            </div>
          </div>

          {/* Busca no menu */}
          <form className="relative" onSubmit={(e) => e.preventDefault()} role="search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />

            {/* Fake inputs to trap browser autofill */}
            <input type="text" className="hidden" aria-hidden="true" autoComplete="off" tabIndex={-1} />
            <input type="password" className="hidden" aria-hidden="true" autoComplete="off" tabIndex={-1} />

            <input
              type="text"
              name="search_query_sidebar_collaborator_unique"
              id="search_query_sidebar_collaborator_unique"
              autoComplete="off"
              aria-label="Buscar páginas do menu"
              placeholder="Buscar páginas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-muted border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-200"
              data-form-type="other"
            />
          </form>
        </div>

        {/* Navegação */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-6 space-y-6">
            {filteredGroups.map((group, groupIndex) => {
              const isCollapsed = isGroupCollapsed(group.name);
              const isEven = groupIndex % 2 === 0;
              const groupId = `collaborator-menu-group-${groupIndex}`;

              return (
                <div
                  key={group.name}
                  className={`space-y-2 rounded-lg transition-colors duration-200 ${
                    isEven ? 'bg-muted/30' : 'bg-card/50'
                  }`}
                >
                  {searchQuery === '' && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.name)}
                      aria-expanded={!isCollapsed}
                      aria-controls={groupId}
                      className="flex items-center justify-between w-full min-h-10 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors duration-200 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span>{group.name}</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
                        aria-hidden="true"
                      />
                    </button>
                  )}

                  {(searchQuery !== '' || !isCollapsed) && (
                    <div id={groupId} className="space-y-1 px-2 pb-2">
                      {group.items.map((item, itemIndex) => {
                        const isActive = location.pathname === item.href;
                        const Icon = item.icon;
                        const isItemEven = itemIndex % 2 === 0;

                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            onClick={() => setIsOpen(false)}
                            aria-current={isActive ? 'page' : undefined}
                            className={`group flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                              isActive
                                ? 'bg-primary/10 text-primary border-l-2 border-primary shadow-sm'
                                : isItemEven
                                ? 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                : 'text-muted-foreground hover:bg-card/80 hover:text-foreground'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0">
                              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{item.name}</div>
                                {item.description && (
                                  <div className="text-xs text-muted-foreground truncate">
                                    {item.description}
                                  </div>
                                )}
                              </div>
                            </div>

                            {!!item.badge && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Usuário */}
        <div className="p-4 border-t border-border bg-card/95 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-foreground font-semibold text-xs" aria-hidden="true">
                  {user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Colaborador
              </p>
            </div>
            {/* Era um <button> sem onClick — mesmo destino do item "Configurações" do menu. */}
            <Link
              to="/colaborador/configuracoes"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Configurações de usuário"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </div>

      {/* Espaço da barra fixa no desktop (largura da sidebar) */}
      <div className="hidden md:block w-72 flex-shrink-0" />
    </>
  );
};

export default CollaboratorSidebar;
