import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './RouteGuards';
import { PageLoadingSpinner } from '../components/ui/PageLoadingSpinner';

// Achado (auditoria de performance): todas as páginas admin (várias delas puxando
// recharts/jsPDF/html2canvas) eram lazy() diretamente dentro de App.tsx — que faz parte da
// árvore de toda página, inclusive a home pública. O algoritmo de preload do Vike
// (collectAssets em retrievePageAssetsProd.js) caminha recursivamente o grafo de imports do
// manifest a partir dali, então todo esse peso admin era pré-carregado até para visitantes
// anônimos da home. Isolar as rotas /admin/* neste módulo próprio, ele mesmo lazy(), quebra
// esse link direto: só quem navega para /admin/* dispara o import deste arquivo e, com ele,
// dos componentes abaixo.
const AdminDashboardPage = lazy(() =>
  import('../pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage }))
);
const AdminWhatsappPage = lazy(() =>
  import('../pages/admin/WhatsappPage').then((m) => ({ default: m.default }))
);
const ReviewManagementPage = lazy(() =>
  import('../pages/admin/ReviewManagementPage').then((m) => ({ default: m.default }))
);
const BookingListPage = lazy(() =>
  import('../pages/admin/BookingListPage').then((m) => ({ default: m.BookingListPage }))
);
const BookingCalendarPage = lazy(() =>
  import('../pages/admin/BookingCalendarPage').then((m) => ({ default: m.BookingCalendarPage }))
);
const EquipmentListPage = lazy(() =>
  import('../pages/admin/EquipmentListPage').then((m) => ({ default: m.EquipmentListPage }))
);
const CategoryListPage = lazy(() =>
  import('../pages/admin/CategoryListPage').then((m) => ({ default: m.CategoryListPage }))
);
const FaqListPage = lazy(() =>
  import('../pages/admin/FaqListPage').then((m) => ({ default: m.FaqListPage }))
);
const PortfolioListPage = lazy(() =>
  import('../pages/admin/PortfolioListPage').then((m) => ({ default: m.PortfolioListPage }))
);
const BannerManagementPage = lazy(() =>
  import('../pages/admin/BannerManagementPage').then((m) => ({ default: m.BannerManagementPage }))
);
const CouponManagementPage = lazy(() =>
  import('../pages/admin/CouponManagementPage').then((m) => ({ default: m.CouponManagementPage }))
);
const ContactSubmissionsListPage = lazy(() =>
  import('../pages/admin/ContactSubmissionsListPage').then((m) => ({
    default: m.ContactSubmissionsListPage,
  }))
);
const AdminCollaboratorsPage = lazy(() =>
  import('../pages/admin/AdminCollaboratorsPage').then((m) => ({
    default: m.AdminCollaboratorsPage,
  }))
);
const AdminCollaboratorFunctionsPage = lazy(() =>
  import('../pages/admin/AdminCollaboratorFunctionsPage').then((m) => ({
    default: m.AdminCollaboratorFunctionsPage,
  }))
);
const MonitoringPage = lazy(() => import('../pages/admin/MonitoringPage'));
const NewsletterSubscribersPage = lazy(() =>
  import('../pages/admin/NewsletterSubscribersPage').then((m) => ({ default: m.NewsletterSubscribersPage }))
);
const AdminSocialListPage = lazy(() => import('../pages/admin/AdminSocialListPage'));
const AdminSocialPage = lazy(() =>
  import('../pages/admin/AdminSocialPage').then((m) => ({ default: m.default }))
);
const AdminSponsorPage = lazy(() => import('../pages/admin/AdminSponsorPage'));
const AdminServiceListPage = lazy(() =>
  import('../pages/admin/AdminServiceListPage').then((m) => ({ default: m.AdminServiceListPage }))
);
const AdminKitListPage = lazy(() =>
  import('../pages/admin/AdminKitListPage').then((m) => ({ default: m.AdminKitListPage }))
);
const ClientListPage = lazy(() => import('../pages/admin/ClientListPage'));
const ClientEditPage = lazy(() =>
  import('../pages/admin/ClientEditPage').then((m) => ({ default: m.ClientEditPage }))
);
const AdminQuickProposalPage = lazy(() =>
  import('../pages/admin/AdminQuickProposalPage').then((m) => ({ default: m.default }))
);
const AdminBookingDetailPage = lazy(() =>
  import('../pages/admin/BookingDetailPage').then((m) => ({ default: m.BookingDetailPage }))
);
const AdminAnnouncementPage = lazy(() => import('../pages/admin/AdminAnnouncementPage'));

// Rotas relativas ao prefixo /admin (montado via <Route path="/admin/*"> em App.tsx).
export default function AdminRoutes() {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <Routes>
        <Route index element={<Navigate to="painel" replace />} />
        <Route
          path="painel"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="whatsapp"
          element={
            <ProtectedRoute adminOnly>
              <AdminWhatsappPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="kits"
          element={
            <ProtectedRoute adminOnly>
              <AdminKitListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reservas"
          element={
            <ProtectedRoute adminOnly>
              <BookingListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="reservas/:id"
          element={
            <ProtectedRoute adminOnly>
              <AdminBookingDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orcamentos/novo"
          element={
            <ProtectedRoute adminOnly>
              <AdminQuickProposalPage />
            </ProtectedRoute>
          }
        />
        {/* Alias para calendário dentro de bookings */}
        <Route
          path="reservas/calendario"
          element={
            <ProtectedRoute adminOnly>
              <BookingCalendarPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="equipamentos"
          element={
            <ProtectedRoute adminOnly>
              <EquipmentListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="categorias"
          element={
            <ProtectedRoute adminOnly>
              <CategoryListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="faq"
          element={
            <ProtectedRoute adminOnly>
              <FaqListPage />
            </ProtectedRoute>
          }
        />
        {/* Alias plural para FAQs */}
        <Route
          path="faqs"
          element={
            <ProtectedRoute adminOnly>
              <FaqListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="portfolio"
          element={
            <ProtectedRoute adminOnly>
              <PortfolioListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="contatos"
          element={
            <ProtectedRoute adminOnly>
              <ContactSubmissionsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="newsletter"
          element={
            <ProtectedRoute adminOnly>
              <NewsletterSubscribersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="colaboradores"
          element={
            <ProtectedRoute adminOnly>
              <AdminCollaboratorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="colaboradores/funcoes"
          element={
            <ProtectedRoute adminOnly>
              <AdminCollaboratorFunctionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="clientes"
          element={
            <ProtectedRoute adminOnly>
              <ClientListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="clients"
          element={
            <ProtectedRoute adminOnly>
              <Navigate to="/admin/clientes" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="clientes/:id"
          element={
            <ProtectedRoute adminOnly>
              <ClientEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="clients/:id"
          element={
            <ProtectedRoute adminOnly>
              <ClientEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="servicos"
          element={
            <ProtectedRoute adminOnly>
              <AdminServiceListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="social"
          element={
            <ProtectedRoute adminOnly>
              <AdminSocialListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="social/:id"
          element={
            <ProtectedRoute adminOnly>
              <AdminSocialPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="social/sponsors"
          element={
            <ProtectedRoute adminOnly>
              <AdminSponsorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="events/:id/social/announcements"
          element={
            <ProtectedRoute adminOnly>
              <AdminAnnouncementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="banners"
          element={
            <ProtectedRoute adminOnly>
              <BannerManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="cupons"
          element={
            <ProtectedRoute adminOnly>
              <CouponManagementPage />
            </ProtectedRoute>
          }
        />
        {/* Alias antigo para /admin/settings: redireciona para /painel */}
        <Route
          path="configuracoes"
          element={
            <ProtectedRoute adminOnly>
              <Navigate to="/painel" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="monitoramento"
          element={
            <ProtectedRoute adminOnly>
              <MonitoringPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="avaliacoes"
          element={
            <ProtectedRoute adminOnly>
              <ReviewManagementPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}
