import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  CalendarCheck,
  CalendarDays,
  Zap,
  Camera,
  Briefcase,
  Package,
  Ticket,
  Tv,
  Handshake,
  Users,
  UserCog,
  ListChecks,
  Image as ImageIcon,
  Tags,
  Images,
  HelpCircle,
  Star,
  Mail,
  Newspaper,
  Menu,
  X,
  Search,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { normalizeString } from '../../utils/string';
import { useAuth } from '../../contexts/AuthContext';
import { usePendingRequests, formatPendingAge, PENDING_LEVEL_CLASSES } from '../../hooks/usePendingRequests';

interface MenuGroup {
  name: string;
  items: MenuItem[];
}

interface MenuItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  description?: string;
}

// Estrutura de navegação (todas as gestões).
// Achado (auditoria): os ícones eram SVGs inline com desenhos trocados (o de "Calendário" desenhava
// uma pessoa; o de "Equipamentos", barras de gráfico) e se repetiam (TagIcon em 4 itens). Agora lucide,
// como no resto do painel. WhatsApp, Proposta rápida e Funções tinham rota mas não apareciam no menu.
const menuGroups: MenuGroup[] = [
  {
    name: 'Visão geral',
    items: [
      { name: 'Dashboard', href: '/admin/painel', icon: LayoutDashboard, description: 'Visão geral e métricas' },
      { name: 'Monitoramento', href: '/admin/monitoramento', icon: Activity, description: 'Saúde do sistema' },
    ],
  },
  {
    name: 'Operações',
    items: [
      { name: 'Reservas', href: '/admin/reservas', icon: CalendarCheck, description: 'Gestão de agendamentos' },
      { name: 'Calendário', href: '/admin/reservas/calendario', icon: CalendarDays, description: 'Calendário de reservas' },
      { name: 'Proposta rápida', href: '/admin/orcamentos/novo', icon: Zap, description: 'Gerar orçamento' },
      { name: 'Equipamentos', href: '/admin/equipamentos', icon: Camera, description: 'Catálogo de equipamentos' },
      { name: 'Serviços', href: '/admin/servicos', icon: Briefcase, description: 'Gestão de serviços' },
      { name: 'Kits', href: '/admin/kits', icon: Package, description: 'Pacotes de equipamentos' },
      { name: 'Cupons', href: '/admin/cupons', icon: Ticket, description: 'Cupons de desconto' },
      { name: 'Mural social', href: '/admin/social', icon: Tv, description: 'Fotos dos convidados no telão' },
      { name: 'Patrocinadores', href: '/admin/social/sponsors', icon: Handshake, description: 'Logos exibidos nos murais' },
    ],
  },
  {
    name: 'Pessoas',
    items: [
      { name: 'Clientes', href: '/admin/clientes', icon: Users, description: 'Base de clientes' },
      { name: 'Colaboradores', href: '/admin/colaboradores', icon: UserCog, description: 'Equipe e parceiros' },
      { name: 'Funções', href: '/admin/colaboradores/funcoes', icon: ListChecks, description: 'Funções da equipe' },
    ],
  },
  {
    name: 'Conteúdo',
    items: [
      { name: 'Banners', href: '/admin/banners', icon: ImageIcon, description: 'Banners da página inicial' },
      { name: 'Categorias', href: '/admin/categorias', icon: Tags, description: 'Organização de produtos' },
      { name: 'Portfólio', href: '/admin/portfolio', icon: Images, description: 'Gestão de portfólio' },
      { name: 'FAQs', href: '/admin/faqs', icon: HelpCircle, description: 'Perguntas frequentes' },
      { name: 'Avaliações', href: '/admin/avaliacoes', icon: Star, description: 'Moderação de avaliações' },
    ],
  },
  {
    name: 'Comunicação',
    items: [
      { name: 'Contatos', href: '/admin/contatos', icon: Mail, description: 'Mensagens recebidas' },
      { name: 'Newsletter', href: '/admin/newsletter', icon: Newspaper, description: 'Inscritos para novidades' },
      // P14 (aprovada em 02/11/2026), parte 1: saiu "WhatsApp" (QR da automação não oficial, que pode banir o
      // número da empresa). Na parte 3 a tela saiu de vez; o endereço /admin/whatsapp leva ao painel.
    ],
  },
];

// Rotas que não têm item próprio, mas pertencem a um item do menu.
const ROUTE_ALIASES: Array<{ prefix: string; href: string }> = [
  { prefix: '/admin/faq', href: '/admin/faqs' },
  { prefix: '/admin/clients', href: '/admin/clientes' },
  { prefix: '/admin/events/', href: '/admin/social' },
];

const ALL_HREFS = menuGroups.flatMap((g) => g.items.map((i) => i.href));

const matchesPath = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

/**
 * Item ativo também nas telas de detalhe (/admin/reservas/:id, /admin/social/:id, /admin/clientes/:id).
 * Antes era `pathname === href` e essas telas ficavam sem item marcado. Vence o href mais longo que
 * casa, para /admin/reservas/calendario marcar "Calendário" (não "Reservas") e
 * /admin/social/sponsors marcar "Patrocinadores" (não "Mural social").
 */
const getActiveHref = (pathname: string): string | undefined => {
  const direct = ALL_HREFS.filter((href) => matchesPath(pathname, href)).sort((a, b) => b.length - a.length)[0];
  if (direct) return direct;
  return ROUTE_ALIASES.find((a) => pathname === a.prefix || pathname.startsWith(a.prefix.endsWith('/') ? a.prefix : `${a.prefix}/`))?.href;
};

export const AdminSidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const { user } = useAuth();
  const sidebarRef = useRef<HTMLDivElement>(null);
  // P3: número de pedidos de clientes aguardando resposta no item "Reservas", com a cor da idade do
  // mais antigo (cinza até 4 h, amarelo até 24 h, vermelho depois). Os outros itens seguem com o
  // badge fixo do menu, se houver.
  const pending = usePendingRequests(user?.role === 'ADMIN');
  const isReservas = (item: MenuItem) => item.href === '/admin/reservas';
  const badgeFor = (item: MenuItem) => (isReservas(item) ? pending?.count || 0 : item.badge || 0);
  const badgeClassFor = (item: MenuItem) =>
    isReservas(item) && pending?.level
      ? PENDING_LEVEL_CLASSES[pending.level]
      : 'bg-destructive/10 text-destructive border-destructive/20';
  const badgeTitleFor = (item: MenuItem) =>
    isReservas(item) && pending?.count
      ? `${pending.count} ${pending.count === 1 ? 'pedido aguardando' : 'pedidos aguardando'} resposta, o mais antigo ${formatPendingAge(pending.oldestAgeHours)}`
      : undefined;

  // Restaurar posição do scroll
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (sidebar) {
      const savedPosition = sessionStorage.getItem('adminSidebarScroll');
      if (savedPosition) {
        sidebar.scrollTop = parseInt(savedPosition, 10);
      }

      const handleScroll = () => {
        sessionStorage.setItem('adminSidebarScroll', sidebar.scrollTop.toString());
      };

      sidebar.addEventListener('scroll', handleScroll);
      return () => sidebar.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Don't show sidebar if not admin
  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  // Don't show on non-admin pages
  if (!location.pathname.startsWith('/admin')) {
    return null;
  }

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

  const activeHref = getActiveHref(location.pathname);

  return (
    <>
      {/* Botão do menu no celular */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-card border border-border rounded-lg shadow-lg md:hidden hover:bg-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={isOpen}
        aria-controls="admin-sidebar"
      >
        {isOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
      </button>

      {/* Fundo escurecido no celular */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        id="admin-sidebar"
        className={`fixed left-0 top-0 md:top-16 h-full md:h-[calc(100vh-4rem)] w-72 bg-card border-r border-border z-40 transform transition-all duration-300 ease-in-out overflow-hidden flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
        role="navigation"
        aria-label="Menu do painel administrativo"
      >
        {/* Cabeçalho */}
        <div className="p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <LayoutDashboard className="w-5 h-5 text-primary-foreground" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg">Painel administrativo</h2>
              <p className="text-xs text-muted-foreground">X Produções</p>
            </div>
          </div>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="text"
              name="admin-page-search"
              aria-label="Buscar páginas do painel"
              autoComplete="off"
              placeholder="Buscar páginas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring transition-colors duration-200"
            />
          </div>
        </div>

        {/* Navegação */}
        <div ref={sidebarRef} className="flex-1 overflow-y-auto">
          <div className="px-4 py-6 space-y-6">
            {filteredGroups.map((group) => (
              <div key={group.name} className="space-y-2">
                {searchQuery === '' && (
                  <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.name}
                  </div>
                )}

                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = item.href === activeHref;
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setIsOpen(false)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`group flex items-center justify-between px-3 py-2.5 rounded-lg border-l-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          isActive
                            ? 'bg-primary/10 text-primary border-primary'
                            : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <Icon
                            className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}
                            aria-hidden="true"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{item.name}</div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground truncate">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Ternário: com `&&`, badge 0 aparecia como um "0" solto no menu. */}
                        {badgeFor(item) ? (
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full border ${badgeClassFor(item)}`}
                            title={badgeTitleFor(item)}
                          >
                            {badgeFor(item)}
                            <span className="sr-only"> {badgeTitleFor(item)}</span>
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Usuário */}
        <div className="p-4 border-t border-border bg-card/95 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
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
            {/* Era um <button> sem onClick. /perfil tem dados da conta e troca de senha. */}
            <Link
              to="/perfil"
              className="p-1.5 hover:bg-muted rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Configurações de usuário"
            >
              <Settings className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {/* Espaço da sidebar no desktop (largura da sidebar e topo do header) */}
      <div className="hidden md:block w-72 flex-shrink-0 md:mt-16" />
    </>
  );
};

export default AdminSidebar;
