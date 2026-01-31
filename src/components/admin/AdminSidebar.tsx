import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { normalizeString } from '../../utils/string';
import { useAuth } from '../../contexts/AuthContext';

// Ícones otimizados com tamanhos consistentes
const HomeIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const AnalyticsIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const CalendarIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const CameraIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const UsersIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const CollectionIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const TagIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const SettingsIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const MailIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SearchIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

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

// Estrutura de navegação otimizada (todas as gestões)
const menuGroups: MenuGroup[] = [
  {
    name: 'Visão Geral',
    items: [
      {
        name: 'Dashboard',
        href: '/admin/painel',
        icon: HomeIcon,
        description: 'Visão geral e métricas',
      },
      {
        name: 'Monitoramento',
        href: '/admin/monitoramento',
        icon: AnalyticsIcon,
        description: 'Monitoramento Enterprise',
      },
    ],
  },
  {
    name: 'Operações',
    items: [
      {
        name: 'Reservas',
        href: '/admin/reservas',
        icon: CalendarIcon,
        description: 'Gestão de agendamentos',
      },
      {
        name: 'Calendário',
        href: '/admin/reservas/calendario',
        icon: CalendarIcon,
        description: 'Calendário de reservas',
      },
      {
        name: 'Equipamentos',
        href: '/admin/equipamentos',
        icon: CameraIcon,
        description: 'Catálogo de equipamentos',
      },
      {
        name: 'Kits',
        href: '/admin/kits',
        icon: CollectionIcon,
        description: 'Pacotes de equipamentos',
      },
    ],
  },
  {
    name: 'Pessoas',
    items: [
      {
        name: 'Clientes',
        href: '/admin/clientes',
        icon: UsersIcon,
        description: 'Base de clientes',
      },
      {
        name: 'Colaboradores',
        href: '/admin/colaboradores',
        icon: UsersIcon,
        description: 'Equipe e parceiros',
      },
    ],
  },
  {
    name: 'Conteúdo',
    items: [
      {
        name: 'Categorias',
        href: '/admin/categorias',
        icon: TagIcon,
        description: 'Organização de produtos',
      },
      {
        name: 'Portfólio',
        href: '/admin/portfolio',
        icon: CameraIcon,
        description: 'Gestão de portfólio',
      },
      {
        name: 'FAQs',
        href: '/admin/faqs',
        icon: TagIcon,
        description: 'Perguntas frequentes',
      },
      {
        name: 'Avaliações',
        href: '/admin/avaliacoes',
        icon: AnalyticsIcon,
        description: 'Moderação de avaliações',
      },
    ],
  },
  {
    name: 'Comunicação',
    items: [
      {
        name: 'Contatos',
        href: '/admin/contatos',
        icon: MailIcon,
        description: 'Mensagens recebidas',
      },
      {
        name: 'Newsletter',
        href: '/admin/newsletter',
        icon: MailIcon,
        description: 'Inscritos para novidades',
      },
    ],
  },
  {
    name: 'Sistema',
    items: [
      {
        name: 'Logo e Marca',
        href: '/admin/configuracoes/logo',
        icon: SettingsIcon,
        description: 'Identidade visual',
      },
    ],
  },
];

export const AdminSidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const { user } = useAuth();

  // Don't show sidebar if not admin
  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  // Don't show on non-admin pages
  if (!location.pathname.startsWith('/admin')) {
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
      {/* Mobile menu button - estilizado com design system */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-card border border-border rounded-lg shadow-lg md:hidden hover:bg-muted transition-colors duration-200"
        aria-label="Abrir menu"
      >
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - estilizado com design system e alternância */}
      <div
        className={`fixed left-0 top-0 md:top-16 h-full md:h-[calc(100vh-4rem)] w-72 bg-card border-r border-border z-40 transform transition-all duration-300 ease-in-out overflow-hidden flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
        role="navigation"
        aria-label="Admin Sidebar"
      >
        {/* Header - estilizado com design system */}
        <div className="p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground font-bold text-lg">A</span>
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg">Admin Panel</h2>
              <p className="text-xs text-muted-foreground">Sistema de Gestão</p>
            </div>
          </div>

          {/* Search Bar - estilizado com design system */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar páginas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors duration-200"
            />
          </div>
        </div>

        {/* Navigation - com alternância de cores */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-6 space-y-6">
            {filteredGroups.map((group, groupIndex) => {
              const isCollapsed = isGroupCollapsed(group.name);
              const isEven = groupIndex % 2 === 0;
              
              return (
                <div 
                  key={group.name} 
                  className={`space-y-2 rounded-lg transition-colors duration-200 ${
                    isEven ? 'bg-muted/30' : 'bg-card/50'
                  }`}
                >
                  {/* Group Header - com alternância */}
                  {searchQuery === '' && (
                    <button
                      onClick={() => toggleGroup(group.name)}
                      className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors duration-200 group"
                    >
                      <span>{group.name}</span>
                      <div className={`transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}>
                        <ChevronDownIcon />
                      </div>
                    </button>
                  )}

                  {/* Group Items - com alternância de hover */}
                  {(searchQuery !== '' || !isCollapsed) && (
                    <div className="space-y-1 px-2 pb-2">
                      {group.items.map((item, itemIndex) => {
                        const isActive = location.pathname === item.href;
                        const Icon = item.icon;
                        const isItemEven = itemIndex % 2 === 0;
                        
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            onClick={() => setIsOpen(false)}
                            className={`group flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 ${
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
                            
                            <div className="flex items-center space-x-2">
                              {item.badge && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive rounded-full">
                                  {item.badge}
                                </span>
                              )}
                            </div>
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

        {/* User Profile - estilizado com design system */}
        <div className="p-4 border-t border-border bg-card/95 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-semibold text-xs">
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Administrador
              </p>
            </div>
            <button 
              className="p-1.5 hover:bg-muted rounded-md transition-colors"
              aria-label="Configurações de usuário"
            >
              <SettingsIcon className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

  {/* Main content offset for desktop (largura da sidebar e topo do header) */}
  <div className="hidden md:block w-72 flex-shrink-0 md:mt-16" />
    </>
  );
};

export default AdminSidebar;
