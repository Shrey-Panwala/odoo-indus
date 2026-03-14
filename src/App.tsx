import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import InventoryLayout from './layout/InventoryLayout'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import InventoryModulePage from './pages/inventory/InventoryModulePage'

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
              <Route
                path="/dashboard"
                element={
                  <InventoryModulePage
                    title="Inventory Dashboard"
                    description="Track stock health, recent moves, and alerts from one central place."
                  />
                }
              />
              <Route
                path="/products"
                element={
                  <InventoryModulePage
                    title="Products"
                    description="Manage product catalog, SKUs, and category-level stock visibility."
                  />
                }
              />
              <Route
                path="/receipts"
                element={
                  <InventoryModulePage
                    title="Receipts"
                    description="Capture inbound stock receipts and verify quantities against expected orders."
                  />
                }
              />
              <Route
                path="/deliveries"
                element={
                  <InventoryModulePage
                    title="Deliveries"
                    description="Prepare outbound deliveries and track dispatch status by warehouse."
                  />
                }
              />
              <Route
                path="/transfers"
                element={
                  <InventoryModulePage
                    title="Transfers"
                    description="Move inventory across zones and warehouses with secure transfer records."
                  />
                }
              />
              <Route
                path="/adjustments"
                element={
                  <InventoryModulePage
                    title="Adjustments"
                    description="Create stock corrections, count updates, and reason-coded adjustment logs."
                  />
                }
              />
              <Route
                path="/settings"
                element={
                  <InventoryModulePage
                    title="Settings"
                    description="Configure organization preferences, operational defaults, and auth behavior."
                  />
                }
              />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
