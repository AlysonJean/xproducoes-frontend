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
import RoutePrefetch from './components/RoutePrefetch';

// Auth & Route Protection
import { useAuth } from './contexts/AuthContext';
import { getDashboardRoute } from './utils/authUtils';

// Performance Monitoring
import { usePerformanceMonitoring } from './hooks/usePerformanceMonitoring';
import { useBundleAnalytics } from './hooks/useBundleAnalytics';

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
const KitFormPage = lazy(() =>
  import('./components/forms/KitFormPage').then((m) => ({ default: m.KitFormPage }))
);
const BookingListPage = lazy(() =>
  import('./pages/admin/BookingListPage').then((m) => ({ default: m.BookingListPage }))
);
const BookingDetailPage = lazy(() =>
  import('./pages/admin/BookingDetailPage').then((m) => ({ default: m.BookingDetailPage }))
);
const BookingFormPage = lazy(() =>
  import('./components/forms/BookingFormPage').then((m) => ({ default: m.default }))
);
const BookingCalendarPage = lazy(() =>
  import('./pages/admin/BookingCalendarPage').then((m) => ({ default: m.BookingCalendarPage }))
);
// Calendários alternativos removidos (CalendarTest e CalendarEnterprisePage)

// More Admin Pages - Lazy Loading (Heavy admin components)
const ClientListPage = lazy(() =>
  import('./pages/admin/ClientListPage').then((m) => ({ default: m.ClientListPage }))
);
const ClientEditPage = lazy(() =>
  import('./pages/admin/ClientEditPage').then((m) => ({ default: m.ClientEditPage }))
);
const ClientFormPage = lazy(() =>
  import('./components/forms/ClientFormPage').then((m) => ({ default: m.ClientFormPage }))
);
const EquipmentListPage = lazy(() =>
  import('./pages/admin/EquipmentListPage').then((m) => ({ default: m.EquipmentListPage }))
);
const EquipmentFormPage = lazy(() => import('./components/forms/EquipmentFormPage'));
const CategoryListPage = lazy(() =>
  import('./pages/admin/CategoryListPage').then((m) => ({ default: m.CategoryListPage }))
);
const CategoryFormPage = lazy(() =>
  import('./components/forms/CategoryFormPage').then((m) => ({ default: m.CategoryFormPage }))
);
const FaqListPage = lazy(() =>
  import('./pages/admin/FaqListPage').then((m) => ({ default: m.FaqListPage }))
);
const FaqFormPage = lazy(() =>
  import('./components/forms/FaqFormPage').then((m) => ({ default: m.FaqFormPage }))
);
const PortfolioListPage = lazy(() =>
  import('./pages/admin/PortfolioListPage').then((m) => ({ default: m.PortfolioListPage }))
);
const PortfolioFormPage = lazy(() =>
  import('./components/forms/PortfolioFormPage').then((m) => ({ default: m.PortfolioFormPage }))
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
const CollaboratorFormPage = lazy(() =>
  import('./components/forms/CollaboratorFormPage').then((m) => ({ default: m.CollaboratorFormPage }))
);
const LogoSettingsPage = lazy(() =>
  import('./pages/admin/LogoSettingsPage').then((m) => ({ default: m.LogoSettingsPage }))
);
const MonitoringPage = lazy(() => import('./pages/admin/MonitoringPage'));
// ===== LOADING COMPONENT FOR SUSPENSE =====
const PageLoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-surface">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted">Carregando...</p>
    </div>
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
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
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
        return <Navigate to="/admin/dashboard" replace />;
      case 'COLLABORATOR':
        return <Navigate to="/collaborator/dashboard" replace />;
      case 'FREELANCER':
        return <Navigate to="/freelancer/dashboard" replace />;
      case 'CLIENT':
        return <Navigate to="/client/dashboard" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

// Auth Redirect Component (redirects authenticated users away from login/register)
const AuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
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
    if (typeof window !== 'undefined') {
  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
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
      <Route path="/kits/:id" element={<KitDetailPage />} />
      <Route path="/equipments" element={<PublicEquipmentListPage />} />
      <Route path="/equipments/:id" element={<EquipmentDetailPage />} />
      <Route path="/portfolio" element={<PortfolioPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/compare" element={<ComparePage />} />
  <Route path="/cart" element={<CartPage />} />
      <Route path="/quote-request" element={<QuoteRequestPage />} />
      <Route path="/quote-success" element={<QuoteSuccessPage />} />
  <Route path="/booking-success" element={<BookingSuccessPage />} />
  <Route path="/booking-success/:id" element={<BookingSuccessPage />} />

      {/* Institutional Pages */}
      <Route path="/about" element={<AboutPage />} />
  <Route path="/careers" element={<CareersPage />} />
  <Route path="/press" element={<PressPage />} />
  <Route path="/warranty" element={<WarrantyPage />} />
  <Route path="/cookies" element={<CookiesPage />} />
  <Route path="/licenses" element={<LicensesPage />} />
  <Route path="/lgpd" element={<LGPDPage />} />
  <Route path="/help" element={<HelpPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

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
  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
  <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/register"
        element={
          <AuthRedirect>
            <RegisterPage />
          </AuthRedirect>
        }
      />
  <Route path="/register-from-invite" element={<RegisterFromInvitePage />} />
      <Route
        path="/complete-registration"
        element={
          <CompleteRegistrationPage />
        }
      />
    <Route path="/auth/oauth-complete" element={<OAuthComplete />} />

      {/* Protected User Routes - Role specific dashboards only */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Navigate to="/client/dashboard" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/dashboard"
        element={
          <ProtectedRoute role="CLIENT">
            <ClientDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/collaborator/dashboard"
        element={
          <ProtectedRoute role="COLLABORATOR">
            <CollaboratorDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/collaborator/schedule"
        element={
          <ProtectedRoute role="COLLABORATOR">
            <CollaboratorWorkSchedule />
          </ProtectedRoute>
        }
      />
      <Route
        path="/collaborator/profile"
        element={
          <ProtectedRoute role="COLLABORATOR">
            <CollaboratorProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/collaborator/earnings"
        element={
          <ProtectedRoute role="COLLABORATOR">
            <CollaboratorEarningsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/collaborator/reports"
        element={
          <ProtectedRoute role="COLLABORATOR">
            <CollaboratorReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/collaborator/availability"
        element={
          <ProtectedRoute role="COLLABORATOR">
            <CollaboratorAvailabilityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/collaborator/notifications"
        element={
          <ProtectedRoute role="COLLABORATOR">
            <CollaboratorNotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/collaborator/settings"
        element={
          <ProtectedRoute role="COLLABORATOR">
            <CollaboratorSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/freelancer/dashboard"
        element={
          <ProtectedRoute role="FREELANCER">
            <FreelancerDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-bookings"
        element={
          <ProtectedRoute>
            <MyBookingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/bookings/:id"
        element={
          <ProtectedRoute>
            <BookingDetailsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/favorites"
        element={
          <ProtectedRoute>
            <FavoritesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
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
            <Navigate to="/admin/dashboard" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
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
      <Route
        path="/admin/kits/new"
        element={
          <ProtectedRoute adminOnly>
            <KitFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/kits/:id/edit"
        element={
          <ProtectedRoute adminOnly>
            <KitFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/bookings"
        element={
          <ProtectedRoute adminOnly>
            <BookingListPage />
          </ProtectedRoute>
        }
      />
      {/* Alias para calendário dentro de bookings */}
      <Route
        path="/admin/bookings/calendar"
        element={
          <ProtectedRoute adminOnly>
            <BookingCalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/bookings/new"
        element={
          <ProtectedRoute adminOnly>
            <BookingFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/bookings/:id/edit"
        element={
          <ProtectedRoute adminOnly>
            <BookingFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/bookings/:id"
        element={
          <ProtectedRoute adminOnly>
            <BookingDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/calendar"
        element={
          <ProtectedRoute adminOnly>
            <BookingCalendarPage />
          </ProtectedRoute>
        }
      />
      <Route
  path="/admin/clients"
        element={
          <ProtectedRoute adminOnly>
            <ClientListPage />
          </ProtectedRoute>
        }
      />
      <Route
  path="/admin/clients/:id/edit"
        element={
          <ProtectedRoute adminOnly>
            <ClientEditPage />
          </ProtectedRoute>
        }
      />
      <Route
  path="/admin/clients/new"
        element={
          <ProtectedRoute adminOnly>
            <ClientFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/equipment"
        element={
          <ProtectedRoute adminOnly>
            <EquipmentListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/equipment/new"
        element={
          <ProtectedRoute adminOnly>
            <EquipmentFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/equipment/:id/edit"
        element={
          <ProtectedRoute adminOnly>
            <EquipmentFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/categories"
        element={
          <ProtectedRoute adminOnly>
            <CategoryListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/categories/new"
        element={
          <ProtectedRoute adminOnly>
            <CategoryFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/categories/:id/edit"
        element={
          <ProtectedRoute adminOnly>
            <CategoryFormPage />
          </ProtectedRoute>
        }
      />
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
      <Route
        path="/admin/faq/new"
        element={
          <ProtectedRoute adminOnly>
            <FaqFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/faq/:id/edit"
        element={
          <ProtectedRoute adminOnly>
            <FaqFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/portfolio"
        element={
          <ProtectedRoute adminOnly>
            <PortfolioListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/portfolio/new"
        element={
          <ProtectedRoute adminOnly>
            <PortfolioFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/portfolio/:id/edit"
        element={
          <ProtectedRoute adminOnly>
            <PortfolioFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/contacts"
        element={
          <ProtectedRoute adminOnly>
            <ContactSubmissionsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/collaborators"
        element={
          <ProtectedRoute adminOnly>
            <AdminCollaboratorsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/collaborators/new"
        element={
          <ProtectedRoute adminOnly>
            <CollaboratorFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings/logo"
        element={
          <ProtectedRoute adminOnly>
            <LogoSettingsPage />
          </ProtectedRoute>
        }
      />
      {/* Alias antigo para /admin/settings: redireciona para /admin/settings/logo */}
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute adminOnly>
            <Navigate to="/admin/settings/logo" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/monitoring"
        element={
          <ProtectedRoute adminOnly>
            <MonitoringPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reviews"
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
