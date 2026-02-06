// src/components/Header.tsx

import { useState, useEffect } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import {
  HeartIcon,
  ChartBarSquareIcon,
  ShoppingCartIcon,
  Bars3Icon,
  XMarkIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  PhotoIcon,
  PhoneIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { useCompare } from '@/contexts/CompareContext';
import { useSettings } from '@/contexts/SettingsContext';
import { ThemeToggle } from './ui/ThemeToggle';
import ThemedLogo from './ui/ThemedLogo';
import RequestQuoteButton from './RequestQuoteButton';
import { useWhatsAppModal } from './modals/ModalContext';

export const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { itemCount } = useCart();
  const { items: compareItems } = useCompare();
  const { companyName } = useSettings();
  const navigate = useNavigate();
  const { openWhatsAppModal } = useWhatsAppModal();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;
  const navItems: { href: string; label: string; Icon: IconType }[] = [
    { href: '/equipamentos', label: 'Equipamentos', Icon: ClipboardDocumentListIcon },
    { href: '/kits', label: 'Kits', Icon: CubeIcon },
    { href: '/servicos', label: 'Serviços', Icon: ClipboardDocumentListIcon },
    { href: '/guias', label: 'Dicas', Icon: BookOpenIcon },
    { href: '/portfolio', label: 'Portfólio', Icon: PhotoIcon },
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
            <ThemedLogo
              title={companyName || 'Logo'}
              className="h-11 w-auto sm:h-[50px] lg:h-14 max-w-[200px] sm:max-w-[250px] lg:max-w-[315px] transition-all duration-300 group-hover:brightness-110"
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
              className="group relative icon-btn"
              title="Favoritos"
            >
              <HeartIcon className="w-6 h-6" strokeWidth={1.75} />
            </Link>

            {/* Comparar (primário) */}
            <Link
              to="/comparar"
              aria-label="Comparar"
              className="group relative icon-btn"
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
                  to="/painel"
                  className="hidden lg:block text-sm font-medium text-foreground/80 hover:text-foreground transition-colors duration-300"
                >
                  {user?.role === 'ADMIN'
                    ? '🎛️ Admin'
                    : user?.role === 'COLLABORATOR'
                    ? '👥 Colaborador'
                    : user?.role === 'FREELANCER'
                    ? '💼 Freelancer'
                    : '👤 Conta'}
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105"
                  aria-label="Logout"
                >
                  Sair
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 lg:px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/25"
              >
                Entrar
              </Link>
            )}

            {/* Menu Mobile */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden touch-target text-foreground/80 hover:text-primary transition-colors"
              aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
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
        <div className="lg:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-xl">
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
                  onClick={() => {
                    openWhatsAppModal({
                      phoneNumber: '+55 31 98925 2272',
                      title: 'Pedir Orçamento',
                      subject: 'Pedido de Orçamento',
                      message:
                        'Olá! Gostaria de receber um orçamento para o meu evento.\n- Tipo de evento: \n- Data (aprox.): \n- Cidade: Belo Horizonte, MG\n- Número aproximado de pessoas: \n- Observações / referências (link ou breve descrição): ',
                    });
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-4 p-4 rounded-2xl text-lg font-medium transition-all duration-300 hover:bg-muted/50 text-foreground/80"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Solicitar Orçamento</span>
                </button>

                {/* Favoritos */}
                <Link
                  to="/favoritos"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-4 p-4 rounded-2xl text-lg font-medium transition-all duration-300 hover:bg-muted/50 text-foreground/80"
                >
                  <HeartIcon className="w-6 h-6" strokeWidth={1.75} />
                  <span>Favoritos</span>
                </Link>

              {/* Comparar */}
              <Link
                to="/comparar"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between p-4 rounded-2xl text-lg font-medium transition-all duration-300 hover:bg-muted/50 text-foreground/80"
              >
                <div className="flex items-center space-x-4">
                  <ChartBarSquareIcon className="w-6 h-6" strokeWidth={1.75} />
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
                  <ShoppingCartIcon className="w-6 h-6" strokeWidth={1.75} />
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
                  to="/painel"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center space-x-4 p-4 rounded-2xl text-lg font-medium transition-all duration-300 hover:bg-muted/50 text-foreground/80"
                >
                  <span className="text-2xl">
                    {user?.role === 'ADMIN'
                      ? '🎛️'
                      : user?.role === 'COLLABORATOR'
                      ? '👥'
                      : user?.role === 'FREELANCER'
                      ? '💼'
                      : '👤'}
                  </span>
                  <span>
                    {user?.role === 'ADMIN'
                      ? 'Painel Admin'
                      : user?.role === 'COLLABORATOR'
                      ? 'Painel Colaborador'
                      : user?.role === 'FREELANCER'
                      ? 'Painel Freelancer'
                      : 'Minha Conta'}
                  </span>
                </Link>

                {/* Logout */}
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-4 p-4 rounded-2xl text-lg font-medium transition-all duration-300 hover:bg-destructive/10 text-destructive"
                >
                  <span className="text-2xl">🚪</span>
                  <span>Sair</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center space-x-2 p-4 rounded-2xl text-lg font-medium transition-all duration-300 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <span>🔐</span>
                <span>Entrar</span>
              </Link>
            )}

            {/* Theme Toggle */}
            <div className="pt-4 border-t border-border/50">
              <ThemeToggle showLabel={true} className="justify-start" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
