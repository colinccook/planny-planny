import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { HouseholdProvider } from './hooks/useHousehold'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CalendarPage from './pages/CalendarPage'
import IngredientsPage from './pages/IngredientsPage'
import SettingsPage from './pages/SettingsPage'
import JoinInvitePage from './pages/JoinInvitePage'
import PublicHouseholdPage from './pages/PublicHouseholdPage'

function App() {
  return (
    <AuthProvider>
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
                <AppShell>
                  <Routes>
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/ingredients" element={<IngredientsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/calendar" replace />} />
                  </Routes>
                </AppShell>
              </HouseholdProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  )
}

export default App
