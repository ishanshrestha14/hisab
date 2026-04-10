import { Routes, Route, Navigate } from "react-router";
import { useSession } from "./lib/auth-client";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import ClientsPage from "./pages/ClientsPage";
import InvoicesPage from "./pages/InvoicesPage";
import InvoiceNewPage from "./pages/InvoiceNewPage";
import InvoiceDetailPage from "./pages/InvoiceDetailPage";
import QuotesPage from "./pages/QuotesPage";
import QuoteNewPage from "./pages/QuoteNewPage";
import QuoteDetailPage from "./pages/QuoteDetailPage";
import RecurringPage from "./pages/RecurringPage";
import RecurringNewPage from "./pages/RecurringNewPage";
import PortalPage from "./pages/PortalPage";
import SettingsPage from "./pages/SettingsPage";
import AppLayout from "./components/AppLayout";

// Wraps any route that requires auth
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/portal/:token" element={<PortalPage />} />

      {/* Protected app routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/new" element={<InvoiceNewPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="quotes" element={<QuotesPage />} />
        <Route path="quotes/new" element={<QuoteNewPage />} />
        <Route path="quotes/:id" element={<QuoteDetailPage />} />
        <Route path="recurring" element={<RecurringPage />} />
        <Route path="recurring/new" element={<RecurringNewPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
