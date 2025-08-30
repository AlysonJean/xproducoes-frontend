import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { SidebarItem, DashboardLayoutProps } from '../../types/types';
import SidebarItemComponent from './SidebarItemComponent';

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title = 'Dashboard',
  subtitle,
  headerActions,
}) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [activeItem, setActiveItem] = React.useState('dashboard');

  // Menu items baseado no role do usuário
  const menuItems: SidebarItem[] = [
    // Exemplo de item, ajuste conforme sua lógica de permissões/rotas
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '🏠',
      path: '/dashboard',
    },
    // ...adicione outros itens conforme necessário
  ];

  // Componente UserMenu
  const UserMenu: React.FC = () => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
            {user?.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            {/* Exibe o papel do usuário apenas se existir (exemplo para claims customizadas) */}
            {user?.role && <p className="text-xs text-muted-foreground">{user.role}</p>}
          </div>
          <span className="text-muted-foreground">⬇️</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border z-50">
            <div className="py-1">
              <a
                href="/dashboard/profile"
                className="flex items-center px-4 py-2 text-sm text-card-foreground hover:bg-muted"
              >
                <span className="mr-3">👤</span>
                Perfil
              </a>
              <a
                href="/dashboard/settings"
                className="flex items-center px-4 py-2 text-sm text-card-foreground hover:bg-muted"
              >
                <span className="mr-3">⚙️</span>
                Configurações
              </a>
              <hr className="border my-1" />
              <button
                onClick={logout}
                className="w-full flex items-center px-4 py-2 text-sm text-destructive hover:bg-muted"
              >
                <span className="mr-3">🚪</span>
                Sair
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-muted">
      {/* Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-card  shadow-lg transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}
      >
        {/* Logo */}
        <div className="flex items-center justify-center h-16 px-4 border-b border">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">X</span>
            </div>
            <span className="text-xl font-bold text-foreground">X Produções</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3 flex-1 overflow-y-auto">
          {menuItems.map((item) => (
            <div key={item.id}>
              <SidebarItemComponent
                item={item}
                isActive={activeItem === item.id}
                setActiveItem={setActiveItem}
                activeItem={activeItem}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
              />
            </div>
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="p-4 border-t border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
              {user?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.name}
              </p>
              {/* Exibe o papel do usuário apenas se existir (exemplo para claims customizadas) */}
              {user?.role && (
                <p className="text-xs text-muted-foreground">{user.role}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        <header className="flex items-center justify-between px-6 py-4 border-b border bg-card">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center space-x-4">
            {headerActions}
            {/* Notifications */}
            <button className="p-2 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-lg">
              <span className="text-xl">🔔</span>
            </button>
            {/* User menu */}
            <UserMenu />
          </div>
        </header>
        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};
