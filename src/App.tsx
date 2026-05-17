import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { HouseholdProvider } from './hooks/useHousehold'
import ToastProvider from './components/ui/Toast'
import { OverlayProvider } from './components/ui/OverlayProvider'
import ErrorBoundary from './components/ui/ErrorBoundary'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CalendarPage from './pages/CalendarPage'
import DayDetailPage from './pages/DayDetailPage'
import MealFormPage from './pages/MealFormPage'
import TodoFormPage from './pages/TodoFormPage'
import IngredientsPage from './pages/IngredientsPage'
import StoreCupboardPage from './pages/StoreCupboardPage'
import SettingsPage from './pages/SettingsPage'
import JoinInvitePage from './pages/JoinInvitePage'
import PublicHouseholdPage from './pages/PublicHouseholdPage'

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <Routes>
        {/* Unauthenticated and public routes are wrapped in their own
            ErrorBoundary so a render-time exception in one page can
            never blank the whole app shell. Authenticated pages are
            wrapped by the boundary inside AppShell (per-route, keyed
            on location.pathname so it resets on navigation). See
            docs/error-boundaries.md. */}
        <Route
          path="/login"
          element={
            <ErrorBoundary area="Sign in">
              <LoginPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/register"
          element={
            <ErrorBoundary area="Register">
              <RegisterPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/invite/:token"
          element={
            <ErrorBoundary area="Invite">
              <JoinInvitePage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/shared/:token"
          element={
            <ErrorBoundary area="Shared household">
              <PublicHouseholdPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <HouseholdProvider>
                <OverlayProvider>
                <AppShell>
                  <Routes>
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/calendar/:date" element={<DayDetailPage />} />
                    <Route path="/calendar/:date/add" element={<MealFormPage />} />
                    <Route path="/calendar/:date/edit/:mealId" element={<MealFormPage />} />
                    <Route path="/calendar/:date/todos/add" element={<TodoFormPage />} />
                    <Route path="/calendar/:date/todos/edit/:todoId" element={<TodoFormPage />} />
                    <Route path="/ingredients" element={<IngredientsPage />} />
                    <Route path="/store-cupboard" element={<StoreCupboardPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/calendar" replace />} />
                  </Routes>
                </AppShell>
                </OverlayProvider>
              </HouseholdProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
