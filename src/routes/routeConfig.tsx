import React, { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

/**
 * Route-Based Code Splitting (2026 Pattern)
 * 
 * Each route is a separate bundle chunk:
 * - Only loaded when route is visited
 * - Cached by browser after first visit
 * - Improves initial page load time
 * - Perfect for admin, collaborator sections
 * 
 * Updated with actual project page names and paths
 */

// 🎯 CRITICAL PATH - Load immediately (vendor-react chunk)
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';

// 📦 LAZY LOADED - Public pages (feature-shop chunk)
const EquipmentListPage = lazy(() => 
  import('@/pages/EquipmentListPage').then(m => ({ default: m.EquipmentListPage }))
);
const EquipmentDetailPage = lazy(() => 
  import('@/pages/EquipmentDetailPage').then(m => ({ default: m.EquipmentDetailPage }))
);
const KitListPage = lazy(() => 
  import('@/pages/KitListPage').then(m => ({ default: m.KitListPage }))
);
const KitDetailPage = lazy(() => 
  import('@/pages/KitDetailPage').then(m => ({ default: m.KitDetailPage }))
);
const ServiceListPage = lazy(() => 
  import('@/pages/ServiceListPage').then(m => ({ default: m.ServiceListPage }))
);
const ServiceDetailPage = lazy(() => 
  import('@/pages/ServiceDetailPage').then(m => ({ default: m.ServiceDetailPage }))
);

// 🔒 CLIENT ROUTES - Lazy loaded, protected (feature-booking chunk)
const ClientDashboardPage = lazy(() => 
  import('@/pages/client/ClientDashboardPage').then(m => ({ default: m.ClientDashboardPage }))
);
const ClientCalendarPage = lazy(() => 
  import('@/pages/client/ClientCalendarPage').then(m => ({ default: m.ClientCalendarPage }))
);
const MyBookingsPage = lazy(() => 
  import('@/pages/client/MyBookingsPage').then(m => ({ default: m.MyBookingsPage }))
);
const BookingDetailsPage = lazy(() => 
  import('@/pages/client/BookingDetailsPage').then(m => ({ default: m.BookingDetailsPage }))
);
const CartPage = lazy(() => 
  import('@/pages/client/CartPage').then(m => ({ default: m.CartPage }))
);
const FavoritesPage = lazy(() => 
  import('@/pages/client/FavoritesPage').then(m => ({ default: m.FavoritesPage }))
);
const QuoteRequestPage = lazy(() => 
  import('@/pages/client/QuoteRequestPage').then(m => ({ default: m.QuoteRequestPage }))
);
const ClientProfilePage = lazy(() => 
  import('@/pages/client/ProfilePage').then(m => ({ default: m.ProfilePage }))
);

// 👨‍💼 ADMIN ROUTES - Lazy loaded, protected (feature-admin chunk)
const AdminDashboardPage = lazy(() => 
  import('@/pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage }))
);
const AdminCollaboratorsPage = lazy(() => 
  import('@/pages/admin/AdminCollaboratorsPage').then(m => ({ default: m.AdminCollaboratorsPage }))
);
const BookingListPage = lazy(() => 
  import('@/pages/admin/BookingListPage').then(m => ({ default: m.BookingListPage }))
);
const AdminEquipmentListPage = lazy(() => 
  import('@/pages/admin/EquipmentListPage').then(m => ({ default: m.EquipmentListPage }))
);
const AdminKitListPage = lazy(() => 
  import('@/pages/admin/AdminKitListPage').then(m => ({ default: m.AdminKitListPage }))
);
const AdminServiceListPage = lazy(() => 
  import('@/pages/admin/AdminServiceListPage').then(m => ({ default: m.AdminServiceListPage }))
);
const MonitoringPage = lazy(() => 
  import('@/pages/admin/MonitoringPage').then(m => ({ default: m.MonitoringPage }))
);

// 👥 COLLABORATOR ROUTES - Lazy loaded, protected (feature-collaborator chunk)
const CollaboratorDashboard = lazy(() => 
  import('@/pages/collaborator/CollaboratorDashboard').then(m => ({ default: m.default }))
);
const CollaboratorWorkSchedule = lazy(() => 
  import('@/pages/collaborator/CollaboratorWorkSchedule').then(m => ({ default: m.default }))
);
const CollaboratorProfilePage = lazy(() => 
  import('@/pages/collaborator/CollaboratorProfilePage').then(m => ({ default: m.default }))
);
const CollaboratorAvailabilityPage = lazy(() => 
  import('@/pages/collaborator/CollaboratorAvailabilityPage').then(m => ({ default: m.default }))
);
const CollaboratorEarningsPage = lazy(() => 
  import('@/pages/collaborator/CollaboratorEarningsPage').then(m => ({ default: m.default }))
);

/**
 * Loading fallback component
 */
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-primary/60">Carregando página...</p>
    </div>
  </div>
);

/**
 * Protected route wrapper for admin/collaborator sections
 */
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredRole: 'ADMIN' | 'COLLABORATOR' | 'CLIENT';
  userRole?: string;
}> = ({ children, requiredRole, userRole }) => {
  if (!userRole) {
    return <LoginPage />;
  }

  if (userRole !== 'ADMIN' && requiredRole === 'ADMIN') {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Acesso Negado</h2>
        <p className="text-gray-600 mb-8">Você não tem permissão para acessar esta seção. Requer privilégios de administrador.</p>
        <a href="/" className="text-primary hover:underline">
          Voltar para home
        </a>
      </div>
    );
  }

  if (userRole !== 'COLLABORATOR' && requiredRole === 'COLLABORATOR') {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Acesso Negado</h2>
        <p className="text-gray-600 mb-8">Você não tem permissão para acessar esta seção. Requer privilégios de colaborador.</p>
        <a href="/" className="text-primary hover:underline">
          Voltar para home
        </a>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Main Routes Configuration with Code-Splitting (2026 standard)
 * 
 * CHUNK DISTRIBUTION:
 * - Critical: HomePage, LoginPage, RegisterPage (~95KB)
 * - feature-shop: Equipment, Kit, Service listings (~150KB)
 * - feature-booking: Client dashboard, calendar, bookings (~200KB)
 * - feature-admin: Admin dashboard, monitoring (~250KB)
 * - feature-collaborator: Collaborator area (~180KB)
 */
export function AppRoutes({ userRole }: { userRole?: string }) {
  return (
    <Routes>
      {/* ✅ CRITICAL PATH - Immediate load */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* 🛍️ PUBLIC SHOP ROUTES - feature-shop chunk */}
      <Route
        path="/equipamentos"
        element={
          <Suspense fallback={<PageLoader />}>
            <EquipmentListPage />
          </Suspense>
        }
      />
      <Route
        path="/equipamentos/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <EquipmentDetailPage />
          </Suspense>
        }
      />
      <Route
        path="/kits"
        element={
          <Suspense fallback={<PageLoader />}>
            <KitListPage />
          </Suspense>
        }
      />
      <Route
        path="/kits/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <KitDetailPage />
          </Suspense>
        }
      />
      <Route
        path="/servicos"
        element={
          <Suspense fallback={<PageLoader />}>
            <ServiceListPage />
          </Suspense>
        }
      />
      <Route
        path="/servicos/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <ServiceDetailPage />
          </Suspense>
        }
      />

      {/* 📅 CLIENT ROUTES - feature-booking chunk, requires auth */}
      <Route
        path="/cliente/painel"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute requiredRole="CLIENT" userRole={userRole}>
              <ClientDashboardPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/cliente/agenda"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute requiredRole="CLIENT" userRole={userRole}>
              <ClientCalendarPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/cliente/minhas-reservas"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute requiredRole="CLIENT" userRole={userRole}>
              <MyBookingsPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/cliente/reservas/:id"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute requiredRole="CLIENT" userRole={userRole}>
              <BookingDetailsPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/cliente/carrinho"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute requiredRole="CLIENT" userRole={userRole}>
              <CartPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/cliente/favoritos"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute requiredRole="CLIENT" userRole={userRole}>
              <FavoritesPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/cliente/orcamento"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute requiredRole="CLIENT" userRole={userRole}>
              <QuoteRequestPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/cliente/perfil"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute requiredRole="CLIENT" userRole={userRole}>
              <ClientProfilePage />
            </ProtectedRoute>
          </Suspense>
        }
      />

      {/* 🔴 ADMIN ROUTES - feature-admin chunk, requires admin role */}
      <Route
        path="/admin/painel"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute requiredRole="ADMIN" userRole={userRole}>
              <AdminDashboardPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/reservas"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute requiredRole="ADMIN" userRole={userRole}>
              <BookingListPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/equipamentos"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute requiredRole="ADMIN" userRole={userRole}>
              <AdminEquipmentListPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/kits"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute requiredRole="ADMIN" userRole={userRole}>
              <AdminKitListPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/servicos"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute requiredRole="ADMIN" userRole={userRole}>
              <AdminServiceListPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/colaboradores"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute requiredRole="ADMIN" userRole={userRole}>
              <AdminCollaboratorsPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/admin/monitoramento"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute requiredRole="ADMIN" userRole={userRole}>
              <MonitoringPage />
            </ProtectedRoute>
          </Suspense>
        }
      />

      {/* 🟣 COLLABORATOR ROUTES - feature-collaborator chunk, requires collaborator role */}
      <Route
        path="/colaborador/painel"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute requiredRole="COLLABORATOR" userRole={userRole}>
              <CollaboratorDashboard />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/colaborador/agenda"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute requiredRole="COLLABORATOR" userRole={userRole}>
              <CollaboratorWorkSchedule />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/colaborador/perfil"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute requiredRole="COLLABORATOR" userRole={userRole}>
              <CollaboratorProfilePage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/colaborador/disponibilidade"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute requiredRole="COLLABORATOR" userRole={userRole}>
              <CollaboratorAvailabilityPage />
            </ProtectedRoute>
          </Suspense>
        }
      />
      <Route
        path="/colaborador/ganhos"
        element={
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute requiredRole="COLLABORATOR" userRole={userRole}>
              <CollaboratorEarningsPage />
            </ProtectedRoute>
          </Suspense>
        }
      />

      {/* 404 - Not Found */}
      <Route
        path="*"
        element={
          <div className="flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-4xl font-bold mb-4">404</h1>
            <p className="text-gray-600 mb-8">Página não encontrada</p>
            <a href="/" className="text-primary hover:underline">
              Voltar para home
            </a>
          </div>
        }
      />
    </Routes>
  );
}

/**
 * PREFETCH HINTS - Preload chunks when hovering
 * 
 * Usage in components:
 * import { prefetchChunk } from './routePrefetch';
 * <Link to="/admin" onMouseEnter={() => prefetchChunk('admin')}>
 *   Admin Dashboard
 * </Link>
 */

/**
 * Route-based lazy loading and code-splitting utilities moved to routePrefetch.ts
 * See routePrefetch.ts for prefetchChunk() and initializePrefetching() functions
 */
