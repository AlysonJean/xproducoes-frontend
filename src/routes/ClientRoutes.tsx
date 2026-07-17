import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './RouteGuards';
import { PageLoadingSpinner } from '../components/ui/PageLoadingSpinner';

// Achado (auditoria de performance): mesmo motivo do AdminRoutes.tsx — BookingDetailsPage usa
// jsPDF/html2canvas (geração de PDF da proposta) e antes era lazy() direto em App.tsx.
const ClientDashboardPage = lazy(() =>
  import('../pages/client/ClientDashboardPage').then((m) => ({ default: m.ClientDashboardPage }))
);
const ClientCalendarPage = lazy(() =>
  import('../pages/client/ClientCalendarPage').then((m) => ({ default: m.ClientCalendarPage }))
);
const BookingDetailsPage = lazy(() =>
  import('../pages/client/BookingDetailsPage').then((m) => ({ default: m.BookingDetailsPage }))
);

// Rotas relativas ao prefixo /cliente (montado via <Route path="/cliente/*"> em App.tsx).
export default function ClientRoutes() {
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
      <Routes>
        <Route index element={<Navigate to="painel" replace />} />
        <Route
          path="painel"
          element={
            <ProtectedRoute role="CLIENT">
              <ClientDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="agenda"
          element={
            <ProtectedRoute role="CLIENT">
              <ClientCalendarPage />
            </ProtectedRoute>
          }
        />
        {/* Sem role específico (igual ao original): qualquer usuário autenticado pode ver
            os detalhes de uma reserva por este caminho. */}
        <Route
          path="reservas/:id"
          element={
            <ProtectedRoute>
              <BookingDetailsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}
