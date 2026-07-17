import OAuthComplete from './pages/auth/OAuthComplete';
import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';

// Service Worker and PWA hooks
import { useServiceWorker, useOfflineDetector } from './hooks/useServiceWorker';

// Layout Components
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AllContextsProvider } from './contexts/AllContextsProvider';
import { ModalProvider } from './components/modals/ModalContext';
import { ModalManager } from './components/modals/ModalManager';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import CookieConsentBanner from './components/CookieConsentBanner';
import PWAInstallBanner from './components/PWAInstallBanner';
import RoutePrefetch from './components/RoutePrefetch';
import { PageLoadingSpinner } from './components/ui/PageLoadingSpinner';

// Auth & Route Protection
// Achado (auditoria de performance): ver comentário em routes/AdminRoutes.tsx — estes 3
// grupos de rotas isolam o peso de admin/colaborador/cliente-autenticado (recharts, jsPDF,
// html2canvas) da árvore de toda página, inclusive a home pública.
import { ProtectedRoute, AuthRedirect, DashboardRedirect } from './routes/RouteGuards';
const AdminRoutes = lazy(() => import('./routes/AdminRoutes'));
const CollaboratorRoutes = lazy(() => import('./routes/CollaboratorRoutes'));
const ClientRoutes = lazy(() => import('./routes/ClientRoutes'));

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
const ServiceListPage = lazy(() =>
  import('./pages/ServiceListPage').then((m) => ({ default: m.ServiceListPage }))
);
const ServiceDetailPage = lazy(() =>
  import('./pages/ServiceDetailPage').then((m) => ({ default: m.ServiceDetailPage }))
);
const CompleteProfilePage = lazy(() =>
  import('./pages/auth/CompleteProfilePage').then((m) => ({ default: m.CompleteProfilePage }))
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
const CityLandingPage = lazy(() => import('./pages/CityLandingPage').then((m) => ({ default: m.CityLandingPage })));
const GuideListPage = lazy(() => import('./pages/GuideListPage').then((m) => ({ default: m.GuideListPage })));
const GuideDetailPage = lazy(() => import('./pages/GuideDetailPage').then((m) => ({ default: m.GuideDetailPage })));

// Protected User Pages - Lazy Loading (as que não migraram para routes/*Routes.tsx: sem
// dependências pesadas, sem prefixo de URL limpo o suficiente para valer o isolamento).
const FreelancerDashboardPage = lazy(() =>
  import('./pages/freelancer/FreelancerDashboardPage').then((m) => ({ default: m.FreelancerDashboardPage }))
);
const MyBookingsPage = lazy(() =>
  import('./pages/client/MyBookingsPage').then((m) => ({ default: m.MyBookingsPage }))
);
const FavoritesPage = lazy(() =>
  import('./pages/client/FavoritesPage').then((m) => ({ default: m.FavoritesPage }))
);
const ProfilePage = lazy(() =>
  import('./pages/client/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);

// TV Page
const TVPage = lazy(() => import('./pages/tv/TVPage'));
const ProposalViewPage = lazy(() => import('./pages/ProposalViewPage'));

// Social Interaction Pages
const ParticipatePage = lazy(() => import('./pages/social/ParticipatePage'));
const UploadSocialPage = lazy(() => import('./pages/social/UploadSocialPage'));

// Alias legado em inglês para /colaborador/evento/:id/roadmap — mantido como redirect leve
// (sem importar CollaboratorEventRoadmapPage aqui, que agora só existe dentro de
// routes/CollaboratorRoutes.tsx) para não recriar o mesmo link direto que estamos eliminando.
const CollaboratorEventRoadmapRedirect: React.FC = () => {
  const { id } = useParams();
  return <Navigate to={`/colaborador/evento/${id}/roadmap`} replace />;
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
  const isTVPage = location.pathname.startsWith('/tv');

  if (isTVPage) {
     return <div className="min-h-screen bg-black">{children}</div>;
  }

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
      <CookieConsentBanner />
    </div>
  );
};

// App Routes Component
const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <Routes>
        <Route path="/tv" element={<TVPage />} />
        <Route path="/participate/:slug" element={<ParticipatePage />} />
        <Route path="/upload/:slug" element={<UploadSocialPage />} />
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/kits" element={<KitListPage />} />
        {/* Route uses :slug but falls back to matching by ID if needed inside component logic */}
        <Route path="/kits/:slug" element={<KitDetailPage />} />
      <Route path="/equipamentos" element={<PublicEquipmentListPage />} />
      <Route path="/equipamentos/:slug" element={<EquipmentDetailPage />} />
      <Route path="/portfolio" element={<PortfolioPage />} />
      <Route path="/portfolio/:slug" element={<PortfolioPage />} />
      <Route path="/servicos" element={<ServiceListPage />} />
      <Route path="/servicos/:slug" element={<ServiceDetailPage />} />
      <Route path="/depoimentos/:slug" element={<ReviewDetailPage />} />
      <Route path="/contato" element={<ContactPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/comparar" element={<ComparePage />} />
      <Route path="/carrinho" element={<CartPage />} />
      <Route path="/orcamento" element={<QuoteRequestPage />} />
      <Route path="/orcamento-sucesso" element={<QuoteSuccessPage />} />
      <Route path="/reserva-sucesso" element={<BookingSuccessPage />} />
      <Route path="/reserva-sucesso/:id" element={<BookingSuccessPage />} />
      <Route path="/proposta/:id" element={<ProposalViewPage />} />

      {/* Blog / Guides Routes */}
      <Route path="/guias" element={<GuideListPage />} />
      <Route path="/guias/:slug" element={<GuideDetailPage />} />
      
      {/* Local SEO Landing Pages — achado: React Router não suporta dois parâmetros dinâmicos
          separados por um caractere literal dentro do mesmo segmento (":a-:b" nunca casava
          com nada, confirmado via matchPath); usa um único segmento e desambigua em
          parseServiceCitySlug (localSeoConfig.ts). */}
      <Route path="/:seoSlug" element={<CityLandingPage />} />

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
      <Route
        path="/completar-perfil"
        element={
          <ProtectedRoute>
            <CompleteProfilePage />
          </ProtectedRoute>
        }
      />
      <Route path="/auth/oauth-concluido" element={<OAuthComplete />} />

      {/* Protected User Routes - Role specific dashboards only */}
      <Route
        path="/painel"
        element={
          <ProtectedRoute>
            <DashboardRedirect />
          </ProtectedRoute>
        }
      />
      {/* Achado (auditoria de performance): admin/colaborador/cliente-autenticado isolados
          em routes/*Routes.tsx, cada um seu próprio lazy() — ver comentário em
          routes/AdminRoutes.tsx. A guarda de role/auth acontece dentro de cada sub-rota. */}
      <Route path="/cliente/*" element={<ClientRoutes />} />
      <Route path="/colaborador/*" element={<CollaboratorRoutes />} />
      {/* Legacy aliases for collaborator routes (EN -> PT-BR) */}
      <Route path="/collaborator" element={<Navigate to="/colaborador/painel" replace />} />
      <Route path="/collaborator/dashboard" element={<Navigate to="/colaborador/painel" replace />} />
      <Route path="/collaborator/schedule" element={<Navigate to="/colaborador/agenda" replace />} />
      <Route path="/collaborator/events" element={<Navigate to="/colaborador/agenda" replace />} />
      <Route path="/collaborator/profile" element={<Navigate to="/colaborador/perfil" replace />} />
      <Route path="/collaborator/earnings" element={<Navigate to="/colaborador/ganhos" replace />} />
      <Route path="/collaborator/reports" element={<Navigate to="/colaborador/relatorios" replace />} />
      <Route path="/collaborator/availability" element={<Navigate to="/colaborador/disponibilidade" replace />} />
      <Route path="/collaborator/notifications" element={<Navigate to="/colaborador/notificacoes" replace />} />
      <Route path="/collaborator/settings" element={<Navigate to="/colaborador/configuracoes" replace />} />
      {/* Legacy aliases from old dashboard routes */}
      <Route path="/dashboard" element={<Navigate to="/painel" replace />} />
      <Route path="/client/dashboard" element={<Navigate to="/cliente/painel" replace />} />
      <Route path="/admin/dashboard" element={<Navigate to="/admin/painel" replace />} />
      <Route path="/collaborator/event/:id/roadmap" element={<CollaboratorEventRoadmapRedirect />} />
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
      <Route path="/admin/*" element={<AdminRoutes />} />
      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
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
      <PWAInstallBanner />

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
      <ModalProvider>
        <AppWithMonitoring />
      </ModalProvider>
    </AllContextsProvider>
  );
};

export default App;
