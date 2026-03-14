import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import InventoryLayout from './layout/InventoryLayout'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import Dashboard from './modules/dashboard/Dashboard.jsx'
import Products from './modules/dashboard/Products.jsx'
import Operations from './modules/dashboard/Operations.jsx'
import MoveHistory from './modules/dashboard/MoveHistory.jsx'
import Settings from './modules/dashboard/Settings.jsx'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<InventoryLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/operations" element={<Operations />} />
              <Route path="/move-history" element={<MoveHistory />} />
              <Route path="/settings" element={<Settings />} />

              <Route path="/receipts" element={<Operations />} />
              <Route path="/deliveries" element={<Operations />} />
              <Route path="/transfers" element={<MoveHistory />} />
              <Route path="/adjustments" element={<Settings />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
