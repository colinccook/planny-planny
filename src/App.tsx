import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { HouseholdProvider } from './hooks/useHousehold'
import ToastProvider from './components/ui/Toast'
import { OverlayProvider } from './components/ui/OverlayProvider'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CalendarPage from './pages/CalendarPage'
import DayDetailPage from './pages/DayDetailPage'
import MealFormPage from './pages/MealFormPage'
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/invite/:token" element={<JoinInvitePage />} />
        <Route path="/shared/:token" element={<PublicHouseholdPage />} />
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
