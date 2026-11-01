// src/components/Header.tsx

import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  HeartIcon,
  ChartBarSquareIcon,
  ShoppingCartIcon,
  Bars3Icon,
  XMarkIcon,
  SpeakerWaveIcon,
  UserGroupIcon,
  CubeIcon,
  PhotoIcon,
  PhoneIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowLeftEndOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { getWhatsAppPhone } from '@/utils/whatsapp';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { useCompare } from '@/contexts/CompareContext';
import { useSettings } from '@/contexts/SettingsContext';
import { ThemeToggle } from './ui/ThemeToggle';
import ThemedLogo from './ui/ThemedLogo';
import RequestQuoteButton from './RequestQuoteButton';
import { useWhatsAppModal } from './modals/ModalContext';
import { getDashboardRoute } from '@/utils/authUtils';

export const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { itemCount } = useCart();
  const { items: compareItems } = useCompare();
  const { companyName } = useSettings();
  const { openWhatsAppModal } = useWhatsAppModal();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userDisplayName = user?.name?.trim() || 'Usuário';
  const userDashboardRoute = user ? getDashboardRoute(user.role) : '/painel';

  // Formata contador para badges (padrão grandes e-commerces)
  const formatCount = (n: number) => (n > 99 ? '99+' : String(n));

  // Detecta scroll para efeito de glassmorphism
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Menu mobile: Esc fecha e a página de trás não rola enquanto ele está aberto
  // (antes o overlay não tinha nenhum dos dois).
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    // Em lg o overlay some (lg:hidden): passar para lg com o menu aberto fecha o menu, senão a
    // trava de rolagem ficava presa sem botão para soltar.
    const desktop = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 1024px)') : null;
    const onDesktop = (e: MediaQueryListEvent) => { if (e.matches) setIsMobileMenuOpen(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    desktop?.addEventListener('change', onDesktop);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      desktop?.removeEventListener('change', onDesktop);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  // logout() encerra a sessão no servidor e redireciona para /login.
  const handleLogout = () => {
    void logout();
  };

  type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;
  const navItems: { href: string; label: string; Icon: IconType }[] = [
    // Equipamentos e Serviços usavam o mesmo ícone.
    { href: '/equipamentos', label: 'Equipamentos', Icon: SpeakerWaveIcon },
    { href: '/kits', label: 'Kits', Icon: CubeIcon },
    { href: '/servicos', label: 'Serviços', Icon: UserGroupIcon },
    { href: '/portfolio', label: 'Portfólio', Icon: PhotoIcon },
    { href: '/guias', label: 'Dicas', Icon: BookOpenIcon },
    { href: '/contato', label: 'Contato', Icon: PhoneIcon },
  ];

  return (
    <>
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          isScrolled
            ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <nav className="container mx-auto px-4 lg:px-6 h-16 lg:h-20 flex items-center justify-between">
          {/* Logo com micro-animação */}
          <Link
            to="/"
            className="group flex items-center transition-transform duration-300 hover:scale-105"
          >
            {/* Achado: em 375px, logo (até 200px) + 3 ícones + Entrar + menu somavam ~485px para
                343px úteis — o botão de menu ficava fora da tela. Logo menor no celular e
                Favoritos/Comparar só a partir de sm (no celular eles estão no menu). */}
            <ThemedLogo
              title={companyName || 'Logo'}
              className="h-11 w-auto sm:h-[50px] lg:h-14 max-w-[150px] sm:max-w-[250px] lg:max-w-[315px] transition-all duration-300 group-hover:brightness-110"
            />
          </Link>

          {/* Navegação desktop */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  `group relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:bg-muted/50 ${
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-foreground/80 hover:text-foreground'
                  }`
                }
              >
                <span className="flex items-center space-x-2">
                  <item.Icon className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
                  <span>{item.label}</span>
                </span>
                {/* Indicador ativo */}
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-6" />
              </NavLink>
            ))}
          </div>

          {/* Ações */}
          <div className="flex items-center space-x-2 lg:space-x-4">
            {/* Request Quote CTA (desktop/tablet) */}
            <div className="hidden md:block">
              <RequestQuoteButton />
            </div>
            {/* Theme Toggle */}
            <div className="hidden lg:block">
              <ThemeToggle showLabel={false} />
            </div>

            {/* Favoritos */}
            <Link
              to="/favoritos"
              aria-label="Favoritos"
              className="group relative icon-btn hidden sm:inline-grid"
              title="Favoritos"
            >
              <HeartIcon className="w-6 h-6" strokeWidth={1.75} />
            </Link>

            {/* Comparar (primário) */}
            <Link
              to="/comparar"
              aria-label="Comparar"
              className="group relative icon-btn hidden sm:inline-grid"
              title="Comparar"
            >
              <ChartBarSquareIcon className="w-6 h-6" strokeWidth={1.75} />
              {compareItems.length > 0 && (
                <span className="icon-badge">{formatCount(compareItems.length)}</span>
              )}
            </Link>

            {/* Carrinho */}
            <Link
              to="/carrinho"
              aria-label="Carrinho"
              className="group relative icon-btn"
              title="Carrinho"
            >
              <ShoppingCartIcon className="w-6 h-6" strokeWidth={1.75} />
              {itemCount > 0 && (
                <span className="icon-badge">{formatCount(itemCount)}</span>
              )}
            </Link>

            {/* Divisor */}
            <div className="hidden lg:block w-px h-6 bg-border/50" />

            {/* Autenticação */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <Link
                  to={userDashboardRoute}
                  className="hidden lg:flex items-center space-x-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-all duration-300 group"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/20 group-hover:border-primary transition-all duration-300">
                    {user?.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt={user.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <span className="max-w-[100px] truncate">
                    {userDisplayName}
                  </span>
                </Link>
                {/* aria-label="Logout" (inglês) sobrescrevia o texto visível "Sair" — removido. */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Sair
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 lg:px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Entrar
              </Link>
            )}

            {/* Menu Mobile */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden touch-target text-foreground/80 hover:text-primary transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              title={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="w-8 h-8" strokeWidth={2} />
              ) : (
                <Bars3Icon className="w-8 h-8" strokeWidth={2} />
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        // <nav> e não role="dialog" aria-modal: o botão de fechar fica no <header> (fora do overlay)
        // e um diálogo modal o esconderia de leitores de tela.
        <nav
          id="mobile-menu"
          aria-label="Menu principal"
          className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-xl"
        >
          <div className="flex flex-col h-full pt-20 pb-6 px-6 space-y-4 overflow-y-auto">
            {/* Links de Navegação */}
            <div className="space-y-2">
              {navItems.map((item, index) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-4 p-4 rounded-2xl text-lg font-medium transition-all duration-300 hover:bg-muted/50 ${
                      isActive ? 'text-primary bg-primary/10' : 'text-foreground/80'
                    }`
                  }
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <item.Icon className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>

            {/* Separador */}
            <div className="border-t border-border/50" />

            {/* Links de Ação Mobile */}
            <div className="space-y-2">
                {/* Solicitar Orçamento (mobile) */}
                <button
                  type="button"
                  onClick={() => {
                    openWhatsAppModal({
                      phoneNumber: getWhatsAppPhone(),
                      title: 'Pedir Orçamento',
                      subject: 'Pedido de Orçamento',
                      message:
                        'Olá! Gostaria de receber um orçamento para o meu evento.\n- Tipo de evento: \n- Data (aprox.): \n- Cidade: Belo Horizonte, MG\n- Número aproximado de pessoas: \n- Observações / referências (link ou breve descrição): ',
                    });
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-4 p-4 rounded-2xl text-lg font-medium transition-all duration-300 hover:bg-muted/50 text-foreground/80"
                >
                  {/* Ícone de conversa (era um envelope, mas a ação abre o WhatsApp). */}
                  <ChatBubbleLeftRightIcon className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />
                  <span>Solicitar Orçamento</span>
                </button>

                {/* Favoritos */}
                <Link
                  to="/favoritos"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-4 p-4 rounded-2xl text-lg font-medium transition-all duration-300 hover:bg-muted/50 text-foreground/80"
                >
                  <HeartIcon className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />
                  <span>Favoritos</span>
                </Link>

              {/* Comparar */}
              <Link
                to="/comparar"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between p-4 rounded-2xl text-lg font-medium transition-all duration-300 hover:bg-muted/50 text-foreground/80"
              >
                <div className="flex items-center space-x-4">
                  <ChartBarSquareIcon className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />
                  <span>Comparar</span>
                </div>
                {compareItems.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">
                    {formatCount(compareItems.length)}
                  </span>
                )}
              </Link>

              {/* Carrinho */}
              <Link
                to="/carrinho"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between p-4 rounded-2xl text-lg font-medium transition-all duration-300 hover:bg-muted/50 text-foreground/80"
              >
                <div className="flex items-center space-x-4">
                  <ShoppingCartIcon className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />
                  <span>Carrinho</span>
                </div>
                {itemCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-full">
                    {formatCount(itemCount)}
                  </span>
                )}
              </Link>
            </div>

            {/* Separador */}
            <div className="border-t border-border/50" />

            {/* Autenticação Mobile */}
            {isAuthenticated ? (
              <div className="space-y-2">
                {/* Dashboard/Conta */}
                <Link
                  to={userDashboardRoute}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-4 p-4 rounded-2xl text-lg font-medium transition-all duration-300 hover:bg-muted/50 text-foreground/80"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary/20">
                    {user?.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt={user.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <span>
                    {userDisplayName}
                  </span>
                </Link>

                {/* Logout */}
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-4 p-4 rounded-2xl text-lg font-medium transition-all duration-300 hover:bg-destructive/10 text-destructive"
                >
                  {/* Ícones do design system no lugar dos emojis 🚪/🔐 */}
                  <ArrowRightStartOnRectangleIcon className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />
                  <span>Sair</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center space-x-2 p-4 rounded-2xl text-lg font-medium transition-all duration-300 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <ArrowLeftEndOnRectangleIcon className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />
                <span>Entrar</span>
              </Link>
            )}

            {/* Theme Toggle */}
            <div className="pt-4 border-t border-border/50">
              <ThemeToggle showLabel={true} className="justify-start" />
            </div>
          </div>
        </nav>
      )}
    </>
  );
};
