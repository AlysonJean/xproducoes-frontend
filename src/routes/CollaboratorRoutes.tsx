import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './RouteGuards';
import { PageLoadingSpinner } from '../components/ui/PageLoadingSpinner';

// Achado (auditoria de performance): mesmo motivo do AdminRoutes.tsx — isola o peso das
// páginas de colaborador (relatórios/ganhos usam recharts) da árvore de toda página.
const CollaboratorDashboardPage = lazy(() =>
  import('../pages/collaborator/CollaboratorDashboard').then((m) => ({ default: m.default }))
);
const CollaboratorWorkSchedule = lazy(() =>
  import('../pages/collaborator/CollaboratorWorkSchedule').then((m) => ({ default: m.default }))
);
const CollaboratorProfilePage = lazy(() =>
  import('../pages/collaborator/CollaboratorProfilePage').then((m) => ({ default: m.default }))
);
const CollaboratorEventRoadmapPage = lazy(() =>
  import('../pages/collaborator/CollaboratorEventRoadmapPage').then((m) => ({ default: m.default }))
);
const CollaboratorEarningsPage = lazy(() =>
  import('../pages/collaborator/CollaboratorEarningsPage').then((m) => ({ default: m.default }))
);
const CollaboratorReportsPage = lazy(() =>
  import('../pages/collaborator/CollaboratorReportsPage').then((m) => ({ default: m.default }))
);
const CollaboratorAvailabilityPage = lazy(() =>
  import('../pages/collaborator/CollaboratorAvailabilityPage').then((m) => ({ default: m.default }))
);
const CollaboratorNotificationsPage = lazy(() =>
  import('../pages/collaborator/CollaboratorNotificationsPage').then((m) => ({ default: m.default }))
);
const CollaboratorSettingsPage = lazy(() =>
  import('../pages/collaborator/CollaboratorSettingsPage').then((m) => ({ default: m.default }))
);
const CollaboratorMessagesPage = lazy(() =>
  import('../pages/collaborator/CollaboratorMessagesPage').then((m) => ({ default: m.default }))
);

// Rotas relativas ao prefixo /colaborador (montado via <Route path="/colaborador/*"> em App.tsx).
export default function CollaboratorRoutes() {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <Routes>
        <Route index element={<Navigate to="painel" replace />} />
        <Route
          path="painel"
          element={
            <ProtectedRoute role="COLLABORATOR">
              <CollaboratorDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="agenda"
          element={
            <ProtectedRoute role="COLLABORATOR">
              <CollaboratorWorkSchedule />
            </ProtectedRoute>
          }
        />
        <Route
          path="perfil"
          element={
            <ProtectedRoute role="COLLABORATOR">
              <CollaboratorProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="evento/:id/roadmap"
          element={
            <ProtectedRoute role="COLLABORATOR">
              <CollaboratorEventRoadmapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="ganhos"
          element={
            <ProtectedRoute role="COLLABORATOR">
              <CollaboratorEarningsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="relatorios"
          element={
            <ProtectedRoute role="COLLABORATOR">
              <CollaboratorReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="disponibilidade"
          element={
            <ProtectedRoute role="COLLABORATOR">
              <CollaboratorAvailabilityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="notificacoes"
          element={
            <ProtectedRoute role="COLLABORATOR">
              <CollaboratorNotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="configuracoes"
          element={
            <ProtectedRoute role="COLLABORATOR">
              <CollaboratorSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="mensagens"
          element={
            <ProtectedRoute role="COLLABORATOR">
              <CollaboratorMessagesPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}
