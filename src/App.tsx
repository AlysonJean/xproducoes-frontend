import OAuthComplete from './pages/auth/OAuthComplete';
import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Service Worker and PWA hooks
import { useServiceWorker, useOfflineDetector } from './hooks/useServiceWorker';

// Providers
import { NotificationProvider } from './contexts/NotificationContext';
import { AllContextsProvider } from './contexts/AllContextsProvider';
import { ModalProvider } from './components/modals/ModalContext';
import { ModalManager } from './components/modals/ModalManager';

// Layout Components
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import RoutePrefetch from './components/RoutePrefetch';
import BrandLoader from './components/ui/BrandLoader';

// Auth & Route Protection
import { useAuth } from './contexts/AuthContext';
import { getDashboardRoute } from './utils/authUtils';

// Performance Monitoring
import { usePerformanceMonitoring } from './hooks/usePerformanceMonitoring';
import { useBundleAnalytics } from './hooks/useBundleAnalytics';
import { useGoogleAnalytics } from './hooks/useGoogleAnalytics';

// ===== CORE PAGES (Carregamento imediato) =====
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import { NotFoundPage } from './pages/NotFoundPage';

// ===== LAZY LOADED PAGES (ETAPA 3 - Code Splitting) =====

// Public Pages - Lazy Loading
const KitListPage = lazy(() =>
  import('./pages/KitListPage').then((m) => ({ default: m.KitListPage }))
);
const KitDetailPage = lazy(() =>
  import('./pages/KitDetailPage').then((m) => ({ default: m.KitDetailPage }))
);
const PublicEquipmentListPage = lazy(() =>
  import('./pages/EquipmentListPage').then((m) => ({ default: m.EquipmentListPage }))
);
const EquipmentDetailPage = lazy(() =>
  import('./pages/EquipmentDetailPage').then((m) => ({ default: m.EquipmentDetailPage }))
);
const PortfolioPage = lazy(() =>
  import('./pages/PortfolioPage').then((m) => ({ default: m.PortfolioPage }))
);
const ReviewDetailPage = lazy(() =>
  import('./pages/ReviewDetailPage').then((m) => ({ default: m.ReviewDetailPage }))
);
const ContactPage = lazy(() =>
  import('./pages/ContactPage').then((m) => ({ default: m.ContactPage }))
);
const FaqPage = lazy(() => import('./pages/FaqPage').then((m) => ({ default: m.FaqPage })));
const CompleteRegistrationPage = lazy(() => import('./pages/auth/CompleteRegistrationPage').then((m) => ({ default: m.CompleteRegistrationPage })));
const RegisterFromInvitePage = lazy(() => import('./pages/auth/RegisterFromInvitePage').then((m) => ({ default: m.RegisterFromInvitePage })));
const ComparePage = lazy(() =>
  import('./pages/ComparePage').then((m) => ({ default: m.ComparePage }))
);
const QuoteRequestPage = lazy(() =>
  import('./pages/client/QuoteRequestPage').then((m) => ({ default: m.QuoteRequestPage }))
);
const QuoteSuccessPage = lazy(() =>
  import('./pages/client/QuoteSuccessPage').then((m) => ({ default: m.QuoteSuccessPage }))
);
const BookingSuccessPage = lazy(() =>
  import('./pages/client/BookingSuccessPage').then((m) => ({ default: m.BookingSuccessPage }))
);
const CartPage = lazy(() =>
  import('./pages/client/CartPage').then((m) => ({ default: m.CartPage }))
);

// Institutional Pages - Lazy Loading
const AboutPage = lazy(() =>
  import('./pages/AboutPage').then((m) => ({ default: m.AboutPage }))
);
const TermsPage = lazy(() =>
  import('./pages/TermsPage').then((m) => ({ default: m.TermsPage }))
);
const PrivacyPage = lazy(() =>
  import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage }))
);
const CareersPage = lazy(() => import('./pages/CareersPage').then((m) => ({ default: m.CareersPage })));
const PressPage = lazy(() => import('./pages/PressPage').then((m) => ({ default: m.PressPage })));
const WarrantyPage = lazy(() => import('./pages/WarrantyPage').then((m) => ({ default: m.WarrantyPage })));
const CookiesPage = lazy(() => import('./pages/CookiesPage').then((m) => ({ default: m.CookiesPage })));
const LicensesPage = lazy(() => import('./pages/LicensesPage').then((m) => ({ default: m.LicensesPage })));
const LGPDPage = lazy(() => import('./pages/LGPDPage').then((m) => ({ default: m.LGPDPage })));
const HelpPage = lazy(() => import('./pages/HelpPage').then((m) => ({ default: m.HelpPage })));
const DataDeletionStatusPage = lazy(() => import('./pages/DataDeletionStatusPage').then((m) => ({ default: m.DataDeletionStatusPage })));

// Protected User Pages - Lazy Loading
const ClientDashboardPage = lazy(() =>
  import('./pages/client/ClientDashboardPage').then((m) => ({ default: m.ClientDashboardPage }))
);
const CollaboratorDashboardPage = lazy(() =>
  import('./pages/collaborator/CollaboratorDashboard').then((m) => ({ default: m.default }))
);
const CollaboratorWorkSchedule = lazy(() =>
  import('./pages/collaborator/CollaboratorWorkSchedule').then((m) => ({ default: m.default }))
);
const FreelancerDashboardPage = lazy(() =>
  import('./pages/freelancer/FreelancerDashboardPage').then((m) => ({ default: m.FreelancerDashboardPage }))
);
const MyBookingsPage = lazy(() =>
  import('./pages/client/MyBookingsPage').then((m) => ({ default: m.MyBookingsPage }))
);
const BookingDetailsPage = lazy(() =>
  import('./pages/client/BookingDetailsPage').then((m) => ({ default: m.BookingDetailsPage }))
);
const FavoritesPage = lazy(() =>
  import('./pages/client/FavoritesPage').then((m) => ({ default: m.FavoritesPage }))
);
const ProfilePage = lazy(() =>
  import('./pages/client/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const CollaboratorProfilePage = lazy(() =>
  import('./pages/collaborator/CollaboratorProfilePage').then((m) => ({ default: m.default }))
);
const CollaboratorEarningsPage = lazy(() =>
  import('./pages/collaborator/CollaboratorEarningsPage').then((m) => ({ default: m.default }))
);
const CollaboratorReportsPage = lazy(() =>
  import('./pages/collaborator/CollaboratorReportsPage').then((m) => ({ default: m.default }))
);
const CollaboratorAvailabilityPage = lazy(() =>
  import('./pages/collaborator/CollaboratorAvailabilityPage').then((m) => ({ default: m.default }))
);
const CollaboratorNotificationsPage = lazy(() =>
  import('./pages/collaborator/CollaboratorNotificationsPage').then((m) => ({ default: m.default }))
);
const CollaboratorSettingsPage = lazy(() =>
  import('./pages/collaborator/CollaboratorSettingsPage').then((m) => ({ default: m.default }))
);

// Admin Pages - Lazy Loading (Heavy components)
const AdminDashboardPage = lazy(() =>
  import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const ReviewManagementPage = lazy(() =>
  import('./pages/admin/ReviewManagementPage').then((m) => ({ default: m.default }))
);
const AdminKitListPage = lazy(() =>
  import('./pages/admin/AdminKitListPage').then((m) => ({ default: m.AdminKitListPage }))
);
// const KitFormPage = lazy(() =>
//   import('./components/forms/KitFormPage').then((m) => ({ default: m.KitFormPage }))
// );
const BookingListPage = lazy(() =>
  import('./pages/admin/BookingListPage').then((m) => ({ default: m.BookingListPage }))
);
const BookingDetailPage = lazy(() =>
  import('./pages/admin/BookingDetailPage').then((m) => ({ default: m.BookingDetailPage }))
);
// const BookingFormPage = lazy(() =>
//   import('./components/forms/BookingFormPage').then((m) => ({ default: m.default }))
// );
const BookingCalendarPage = lazy(() =>
  import('./pages/admin/BookingCalendarPage').then((m) => ({ default: m.BookingCalendarPage }))
);
// Calendários alternativos removidos (CalendarTest e CalendarEnterprisePage)

// More Admin Pages - Lazy Loading (Heavy admin components)
const ClientListPage = lazy(() =>
  import('./pages/admin/ClientListPage').then((m) => ({ default: m.ClientListPage }))
);
// const ClientEditPage = lazy(() =>
//   import('./pages/admin/ClientEditPage').then((m) => ({ default: m.ClientEditPage }))
// );
// const ClientFormPage = lazy(() =>
//   import('./components/forms/ClientFormPage').then((m) => ({ default: m.ClientFormPage }))
// );
const EquipmentListPage = lazy(() =>
  import('./pages/admin/EquipmentListPage').then((m) => ({ default: m.EquipmentListPage }))
);
// const EquipmentFormPage = lazy(() => import('./components/forms/EquipmentFormPage'));
const CategoryListPage = lazy(() =>
  import('./pages/admin/CategoryListPage').then((m) => ({ default: m.CategoryListPage }))
);
// const CategoryFormPage = lazy(() =>
//   import('./components/forms/CategoryFormPage').then((m) => ({ default: m.CategoryFormPage }))
// );
const FaqListPage = lazy(() =>
  import('./pages/admin/FaqListPage').then((m) => ({ default: m.FaqListPage }))
);
// const FaqFormPage = lazy(() =>
//   import('./components/forms/FaqFormPage').then((m) => ({ default: m.FaqFormPage }))
// );
const PortfolioListPage = lazy(() =>
  import('./pages/admin/PortfolioListPage').then((m) => ({ default: m.PortfolioListPage }))
);
// const PortfolioFormPage = lazy(() =>
//   import('./components/forms/PortfolioFormPage').then((m) => ({ default: m.PortfolioFormPage }))
// );
// lazy load banner page
const BannerManagementPage = lazy(() =>
  import('./pages/admin/BannerManagementPage').then((m) => ({ default: m.BannerManagementPage }))
);

const ContactSubmissionsListPage = lazy(() =>
  import('./pages/admin/ContactSubmissionsListPage').then((m) => ({
    default: m.ContactSubmissionsListPage,
  }))
);
const AdminCollaboratorsPage = lazy(() =>
  import('./pages/admin/AdminCollaboratorsPage').then((m) => ({
    default: m.AdminCollaboratorsPage,
  }))
);
// const CollaboratorFormPage = lazy(() =>
//   import('./components/forms/CollaboratorFormPage').then((m) => ({ default: m.CollaboratorFormPage }))
// );

const MonitoringPage = lazy(() => import('./pages/admin/MonitoringPage'));
const NewsletterSubscribersPage = lazy(() => 
  import('./pages/admin/NewsletterSubscribersPage').then((m) => ({ default: m.NewsletterSubscribersPage }))
);
// ===== LOADING COMPONENT FOR SUSPENSE =====
const PageLoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center w-full min-h-[calc(100vh-200px)] py-20">
    <BrandLoader size={120} label="Carregando..." />
  </div>
);

// Route Protection Component
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  adminOnly?: boolean;
  role?: string; // Aceitar role específico
}> = ({
  children,
  adminOnly = false,
  role,
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <BrandLoader fullScreen size={140} label="Verificando acesso..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirecionamento específico por role
  if (role && user?.role !== role) {
    switch (user?.role) {
      case 'ADMIN':
        return <Navigate to="/admin/painel" replace />;
      case 'COLLABORATOR':
        return <Navigate to="/colaborador/painel" replace />;
      case 'FREELANCER':
        return <Navigate to="/freelancer/painel" replace />;
      case 'CLIENT':
        return <Navigate to="/cliente/painel" replace />;
      default:
        return <Navigate to="/painel" replace />;
    }
  }

  return <>{children}</>;
};

// Auth Redirect Component (redirects authenticated users away from login/register)
const AuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <BrandLoader fullScreen size={140} label="Iniciando..." />;
  }

  // Só redireciona se estiver na página de login ou registro
  if (isAuthenticated && user && (location.pathname === '/login' || location.pathname === '/register')) {
    const dashboardRoute = getDashboardRoute(user.role);
    return <Navigate to={dashboardRoute} replace />;
  }

  return <>{children}</>;
};

// Component para notificação offline
function OfflineNotification() {
  const isOffline = useOfflineDetector();

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50">
      📱 Você está offline. Algumas funcionalidades podem estar limitadas.
    </div>
  );
}


// Scroll to top em mudanças de rota
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Scroll instantâneo para o topo (sem smooth) para garantir que funcione em todas as trocas de rota
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Main Layout Component
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen bg-surface text-primary transition-colors duration-300 flex flex-col">
      {/* API TEST PANEL DISABLED FOR PRODUCTION */}
      {/* {import.meta.env?.MODE === 'development' && (
        <div className="fixed bottom-4 left-4 z-50">
          <details className="bg-surface shadow-lg rounded-lg">
            <summary className="p-3 cursor-pointer font-medium">🔗 API Test</summary>
            <div className="p-4 border-t"></div>
          </details>
        </div>
      )} */}
  <Header />
  {/* Força scroll para o topo a cada mudança de rota */}
  <ScrollToTop />
      <main className={`flex-grow ${isAdminPage ? 'pt-16' : 'pt-20'}`}>{children}</main>
      <FloatingWhatsApp />
      <Footer />
    </div>
  );
};

// App Routes Component
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/kits" element={<KitListPage />} />
      {/* Route uses :slug but falls back to matching by ID if needed inside component logic */}
      <Route path="/kits/:slug" element={<KitDetailPage />} />
      <Route path="/equipamentos" element={<PublicEquipmentListPage />} />
      <Route path="/equipamentos/:slug" element={<EquipmentDetailPage />} />
      <Route path="/portfolio" element={<PortfolioPage />} />
      <Route path="/portfolio/:slug" element={<PortfolioPage />} />
      <Route path="/depoimentos/:slug" element={<ReviewDetailPage />} />
      <Route path="/contato" element={<ContactPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/comparar" element={<ComparePage />} />
      <Route path="/carrinho" element={<CartPage />} />
      <Route path="/orcamento" element={<QuoteRequestPage />} />
      <Route path="/orcamento-sucesso" element={<QuoteSuccessPage />} />
      <Route path="/reserva-sucesso" element={<BookingSuccessPage />} />
      <Route path="/reserva-sucesso/:id" element={<BookingSuccessPage />} />

      {/* Institutional Pages */}
      <Route path="/sobre" element={<AboutPage />} />
      <Route path="/carreiras" element={<CareersPage />} />
      <Route path="/imprensa" element={<PressPage />} />
      <Route path="/garantia" element={<WarrantyPage />} />
      <Route path="/cookies" element={<CookiesPage />} />
      <Route path="/licencas" element={<LicensesPage />} />
      <Route path="/lgpd" element={<LGPDPage />} />
      <Route path="/ajuda" element={<HelpPage />} />
      <Route path="/termos" element={<TermsPage />} />
      <Route path="/privacidade" element={<PrivacyPage />} />
      <Route path="/data-deletion-status" element={<DataDeletionStatusPage />} />

      {/* Development Modal Examples */}

      {/* Auth Routes (redirect if authenticated) */}
      <Route
        path="/login"
        element={
          <AuthRedirect>
            <LoginPage />
          </AuthRedirect>
        }
      />
      <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
      <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      <Route
        path="/cadastro"
        element={
          <AuthRedirect>
            <RegisterPage />
          </AuthRedirect>
        }
      />
      <Route path="/cadastro-convite" element={<RegisterFromInvitePage />} />
      <Route
        path="/completar-cadastro"
        element={
          <CompleteRegistrationPage />
        }
      />
      <Route path="/auth/oauth-concluido" element={<OAuthComplete />} />

      {/* Protected User Routes - Role specific dashboards only */}
      <Route
        path="/painel"
        element={
          <ProtectedRoute>
            <Navigate to="/cliente/painel" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cliente/painel"
        element={
          <ProtectedRoute role="CLIENT">
            <ClientDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/colaborador/painel"
        element={
          <ProtectedRoute role="COLLABORATOR">
            <CollaboratorDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/colaborador/agenda"
        element={
          <ProtectedRoute role="COLLABORATOR">
            <CollaboratorWorkSchedule />
          </ProtectedRoute>
        }
      />
      <Route
        path="/colaborador/perfil"
        element={
          <ProtectedRoute role="COLLABORATOR">
            <CollaboratorProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/colaborador/ganhos"
        element={
          <ProtectedRoute role="COLLABORATOR">
            <CollaboratorEarningsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/colaborador/relatorios"
        element={
          <ProtectedRoute role="COLLABORATOR">
            <CollaboratorReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/colaborador/disponibilidade"
        element={
          <ProtectedRoute role="COLLABORATOR">
            <CollaboratorAvailabilityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/colaborador/notificacoes"
        element={
          <ProtectedRoute role="COLLABORATOR">
            <CollaboratorNotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/colaborador/configuracoes"
        element={
          <ProtectedRoute role="COLLABORATOR">
            <CollaboratorSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/freelancer/painel"
        element={
          <ProtectedRoute role="FREELANCER">
            <FreelancerDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/minhas-reservas"
        element={
          <ProtectedRoute>
            <MyBookingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cliente/reservas/:id"
        element={
          <ProtectedRoute>
            <BookingDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/favoritos"
        element={
          <ProtectedRoute>
            <FavoritesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <Navigate to="/admin/painel" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/painel"
        element={
          <ProtectedRoute adminOnly>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/kits"
        element={
          <ProtectedRoute adminOnly>
            <AdminKitListPage />
          </ProtectedRoute>
        }
      />
      {/* <Route
        path="/admin/kits/novo"
        element={
          <ProtectedRoute adminOnly>
            <KitFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/kits/:id/editar"
        element={
          <ProtectedRoute adminOnly>
            <KitFormPage />
          </ProtectedRoute>
        }
      /> */}
      <Route
        path="/admin/reservas"
        element={
          <ProtectedRoute adminOnly>
            <BookingListPage />
          </ProtectedRoute>
        }
      />
      {/* Alias para calendário dentro de bookings */}
      <Route
        path="/admin/reservas/calendario"
        element={
          <ProtectedRoute adminOnly>
            <BookingCalendarPage />
          </ProtectedRoute>
        }
      />
      {/* <Route
        path="/admin/reservas/nova"
        element={
          <ProtectedRoute adminOnly>
            <BookingFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reservas/:id/editar"
        element={
          <ProtectedRoute adminOnly>
            <BookingFormPage />
          </ProtectedRoute>
        }
      /> */}
      <Route
        path="/admin/reservas/:id"
        element={
          <ProtectedRoute adminOnly>
            <BookingDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/calendario"
        element={
          <ProtectedRoute adminOnly>
            <BookingCalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
  path="/admin/clientes"
        element={
          <ProtectedRoute adminOnly>
            <ClientListPage />
          </ProtectedRoute>
        }
      />
      {/* <Route
  path="/admin/clientes/:id/editar"
        element={
          <ProtectedRoute adminOnly>
            <ClientEditPage />
          </ProtectedRoute>
        }
      />
      <Route
  path="/admin/clientes/novo"
        element={
          <ProtectedRoute adminOnly>
            <ClientFormPage />
          </ProtectedRoute>
        }
      /> */}
      <Route
        path="/admin/equipamentos"
        element={
          <ProtectedRoute adminOnly>
            <EquipmentListPage />
          </ProtectedRoute>
        }
      />
      {/* <Route
        path="/admin/equipamentos/novo"
        element={
          <ProtectedRoute adminOnly>
            <EquipmentFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/equipamentos/:id/editar"
        element={
          <ProtectedRoute adminOnly>
            <EquipmentFormPage />
          </ProtectedRoute>
        }
      /> */}
      <Route
        path="/admin/categorias"
        element={
          <ProtectedRoute adminOnly>
            <CategoryListPage />
          </ProtectedRoute>
        }
      />
      {/* <Route
        path="/admin/categorias/nova"
        element={
          <ProtectedRoute adminOnly>
            <CategoryFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/categorias/:id/editar"
        element={
          <ProtectedRoute adminOnly>
            <CategoryFormPage />
          </ProtectedRoute>
        }
      /> */}
      <Route
        path="/admin/faq"
        element={
          <ProtectedRoute adminOnly>
            <FaqListPage />
          </ProtectedRoute>
        }
      />
      {/* Alias plural para FAQs */}
      <Route
        path="/admin/faqs"
        element={
          <ProtectedRoute adminOnly>
            <FaqListPage />
          </ProtectedRoute>
        }
      />
      {/* <Route
        path="/admin/faq/nova"
        element={
          <ProtectedRoute adminOnly>
            <FaqFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/faq/:id/editar"
        element={
          <ProtectedRoute adminOnly>
            <FaqFormPage />
          </ProtectedRoute>
        }
      /> */}
      <Route
        path="/admin/portfolio"
        element={
          <ProtectedRoute adminOnly>
            <PortfolioListPage />
          </ProtectedRoute>
        }
      />
      {/* <Route
        path="/admin/portfolio/novo"
        element={
          <ProtectedRoute adminOnly>
            <PortfolioFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/portfolio/:id/editar"
        element={
          <ProtectedRoute adminOnly>
            <PortfolioFormPage />
          </ProtectedRoute>
        }
      /> */}
      <Route
        path="/admin/contatos"
        element={
          <ProtectedRoute adminOnly>
            <ContactSubmissionsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/newsletter"
        element={
          <ProtectedRoute adminOnly>
            <NewsletterSubscribersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/colaboradores"
        element={
          <ProtectedRoute adminOnly>
            <AdminCollaboratorsPage />
          </ProtectedRoute>
        }
      />
      {/* <Route
        path="/admin/colaboradores/novo"
        element={
          <ProtectedRoute adminOnly>
            <CollaboratorFormPage />
          </ProtectedRoute>
        }
      /> */}

      
      <Route
        path="/admin/banners"
        element={
          <ProtectedRoute adminOnly>
            <BannerManagementPage />
          </ProtectedRoute>
        }
      />

      {/* Alias antigo para /admin/settings: redireciona para /painel */}
      <Route
        path="/admin/configuracoes"
        element={
          <ProtectedRoute adminOnly>
            <Navigate to="/painel" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/monitoramento"
        element={
          <ProtectedRoute adminOnly>
            <MonitoringPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/avaliacoes"
        element={
          <ProtectedRoute adminOnly>
            <ReviewManagementPage />
          </ProtectedRoute>
        }
      />

      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

// Main App Component with Performance Monitoring
const AppWithMonitoring: React.FC = () => {
  // Initialize performance monitoring
  usePerformanceMonitoring();
  useBundleAnalytics();
  useGoogleAnalytics();

  // Service Worker and PWA features
  const { updateAvailable, update } = useServiceWorker();

  return (
    <Layout>
      {/* Offline notification */}
      <OfflineNotification />

      {/* Update notification */}
      {updateAvailable && (
        <div className="fixed top-12 left-0 right-0 bg-blue-600 text-white text-center py-2 z-40">
          <span>Nova versão disponível! </span>
          <button onClick={update} className="underline hover:no-underline">
            Atualizar agora
          </button>
        </div>
      )}

      {/* PWA Install prompt */}
      

      {/* ⚡ ROUTE PREFETCH - ETAPA 3 Performance */}
      <RoutePrefetch />
      {/* ⚡ SUSPENSE WRAPPER - ETAPA 3 Performance */}
      <Suspense fallback={<PageLoadingSpinner />}>
        <AppRoutes />
      </Suspense>

      {/* Modal Manager - Renders all modals */}
      <ModalManager />
    </Layout>
  );
};

// Main App Component
const App: React.FC = () => {
  return (
    <AllContextsProvider>
      <NotificationProvider>
        <ModalProvider>
          <AppWithMonitoring />
        </ModalProvider>
      </NotificationProvider>
    </AllContextsProvider>
  );
};

export default App;
