import { Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { UnifiedReviewProvider } from './contexts/UnifiedReviewContext'
import './utils/monitoringInit.js'
import './index.css'

// Importações diretas dos componentes críticos (login, dashboard principal)
import App from './App.jsx'
import LoginPage from './pages/auth/LoginPage.jsx'
import RegisterPage from './pages/auth/RegisterPage.jsx'
import ReviewFlashcardsPage from './pages/dashboard/flashcards/ReviewFlashcardsPage.jsx'
import ReviewSessionPage from './components/review/ReviewSessionPage.jsx'
// Lazy loading apenas para páginas de admin (menos críticas)
const AdminDashboard = lazy(() => import('./features/admin/AdminDashboard'))
const AdminLayout = lazy(() => import('./features/admin/AdminLayout'))
const AdminQuestionsPage = lazy(() => import('./features/admin/AdminQuestionsPage'))
const AdminQuestionsBulkCreatePage = lazy(() => import('./features/admin/AdminQuestionsBulkCreatePage'))
const AdminFiltersPage = lazy(() => import('./features/admin/AdminFiltersPage'))
const UsersAdminPage = lazy(() => import('./features/admin/UsersAdminPage'))
const AdminNotificationsPage = lazy(() => import('./features/admin/AdminNotificationsPage'))
const AdminPulseAIPage = lazy(() => import('./features/admin/AdminPulseAIPage'))
const AdminAuditLogsPage = lazy(() => import('./features/admin/AdminAuditLogsPage'))
const AdminTasksPage = lazy(() => import('./features/admin/AdminTasksPage'))
const AdminPaymentsPage = lazy(() => import('./features/admin/AdminPaymentsPage'))
const MonitoringDashboard = lazy(() => import('./features/admin/MonitoringDashboard'))
const AdminFlashcardsPage = lazy(() => import('./features/admin/flashcards/AdminFlashcardsPage'))
const DeckViewPage = lazy(() => import('./features/admin/flashcards/DeckViewPage').then(module => ({ default: module.DeckViewPage })))
const CardEditPage = lazy(() => import('./features/admin/flashcards/CardEditPage').then(module => ({ default: module.CardEditPage })))

// Componente de loading para páginas de admin
const AdminLoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
  </div>
);

// Componente para redirecionar usuários logados
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Componente de proteção para dashboard
const ProtectedRoute = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user || !isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

// Componente de proteção para admin
const AdminProtectedRoute = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user || !isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

createRoot(document.getElementById('root')).render(
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}
  >
    <AuthProvider>
      <UnifiedReviewProvider>
        <NotificationProvider>
            <Routes>
              <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
                
                {/* Rotas do dashboard */}
                <Route path="/dashboard" element={<ProtectedRoute><App /></ProtectedRoute>} />
                <Route path="/dashboard/revisoes" element={<ProtectedRoute><App /></ProtectedRoute>} />
                <Route path="/dashboard/flashcards" element={<ProtectedRoute><App /></ProtectedRoute>} />
                <Route path="/dashboard/flashcards/review/:deckId" element={<ProtectedRoute><ReviewFlashcardsPage /></ProtectedRoute>} />
                <Route path="/dashboard/review-session" element={<ProtectedRoute><ReviewSessionPage /></ProtectedRoute>} />
                <Route path="/dashboard/review-session/config" element={<ProtectedRoute><App /></ProtectedRoute>} />

                <Route path="/dashboard/retencao" element={<ProtectedRoute><App /></ProtectedRoute>} />
                <Route path="/dashboard/planner" element={<ProtectedRoute><App /></ProtectedRoute>} />

                <Route path="/dashboard/questoes" element={<ProtectedRoute><App /></ProtectedRoute>} />
                <Route path="/dashboard/listas-questoes" element={<ProtectedRoute><App /></ProtectedRoute>} />
                <Route path="/dashboard/questoes-resolver" element={<ProtectedRoute><App /></ProtectedRoute>} />
                <Route path="/dashboard/simulados" element={<ProtectedRoute><App /></ProtectedRoute>} />
                <Route path="/dashboard/estatisticas" element={<ProtectedRoute><App /></ProtectedRoute>} />
                <Route path="/dashboard/conquistas" element={<ProtectedRoute><App /></ProtectedRoute>} />
                <Route path="/dashboard/perfil" element={<ProtectedRoute><App /></ProtectedRoute>} />
                <Route path="/dashboard/configuracoes" element={<ProtectedRoute><App /></ProtectedRoute>} />

                
                {/* Rotas protegidas de admin com lazy loading */}
                <Route path="/admin" element={
                  <AdminProtectedRoute>
                    <Suspense fallback={<AdminLoadingFallback />}>
                      <AdminLayout />
                    </Suspense>
                  </AdminProtectedRoute>
                }>
                  <Route index element={<Suspense fallback={<AdminLoadingFallback />}><AdminDashboard /></Suspense>} />
                  <Route path="questions" element={<Suspense fallback={<AdminLoadingFallback />}><AdminQuestionsPage /></Suspense>} />
                  <Route path="questions/bulk" element={<Suspense fallback={<AdminLoadingFallback />}><AdminQuestionsBulkCreatePage /></Suspense>} />
                  <Route path="filters" element={<Suspense fallback={<AdminLoadingFallback />}><AdminFiltersPage /></Suspense>} />
                  <Route path="users" element={<Suspense fallback={<AdminLoadingFallback />}><UsersAdminPage /></Suspense>} />
                  <Route path="notifications" element={<Suspense fallback={<AdminLoadingFallback />}><AdminNotificationsPage /></Suspense>} />
                  <Route path="audit" element={<Suspense fallback={<AdminLoadingFallback />}><AdminAuditLogsPage /></Suspense>} />
                  <Route path="payments" element={<Suspense fallback={<AdminLoadingFallback />}><AdminPaymentsPage /></Suspense>} />
                  <Route path="tasks" element={<Suspense fallback={<AdminLoadingFallback />}><AdminTasksPage /></Suspense>} />
                  <Route path="flashcards" element={<Suspense fallback={<AdminLoadingFallback />}><AdminFlashcardsPage /></Suspense>} />
                  <Route path="flashcards/deck/:deckId" element={<Suspense fallback={<AdminLoadingFallback />}><DeckViewPage /></Suspense>} />
                  <Route path="flashcards/deck/:deckId/edit" element={<Suspense fallback={<AdminLoadingFallback />}><DeckViewPage /></Suspense>} />
                  <Route path="flashcards/card/:cardId" element={<Suspense fallback={<AdminLoadingFallback />}><CardEditPage /></Suspense>} />
                  <Route path="flashcards/card/:cardId/edit" element={<Suspense fallback={<AdminLoadingFallback />}><CardEditPage /></Suspense>} />
                  <Route path="pulse-ai" element={<Suspense fallback={<AdminLoadingFallback />}><AdminPulseAIPage /></Suspense>} />
                  <Route path="monitoring" element={<Suspense fallback={<AdminLoadingFallback />}><MonitoringDashboard /></Suspense>} />
                </Route>
                
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
           </NotificationProvider>
         </UnifiedReviewProvider>
       </AuthProvider>
     </BrowserRouter>,
)
