import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  changePassword,
  getCurrentUser,
  login,
  logout,
  requestPasswordReset,
  resetPasswordWithOtp,
  signup,
  verifyPasswordResetOtp,
  type UserRecord,
  type UserRole,
} from './authService'

interface AuthContextValue {
  user: UserRecord | null
  isAuthenticated: boolean
  loginUser: (payload: { email: string; password: string; rememberMe: boolean }) => Promise<{ ok: boolean; error?: string }>
  signupUser: (payload: {
    fullName: string
    email: string
    password: string
    role?: UserRole
    organization?: string
  }) => Promise<{ ok: boolean; error?: string }>
  logoutUser: () => void
  refreshSession: () => void
  requestOtp: (email: string) => Promise<{ ok: boolean; error?: string; otp?: string; sentVia?: 'email' | 'demo' }>
  verifyOtp: (email: string, otp: string) => Promise<{ ok: boolean; error?: string }>
  resetPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  updatePassword: (currentPassword: string, nextPassword: string) => Promise<{ ok: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserRecord | null>(() => getCurrentUser())

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user),
    loginUser: async ({ email, password }) => {
      const result = await login({ email, password, rememberMe: true })
      if (!result.ok || !result.data) return { ok: false, error: result.error }
      setUser(result.data)
      return { ok: true }
    },
    signupUser: async ({ fullName, email, password, role, organization }) => {
      const result = await signup({ fullName, email, password, role, organization })
      if (!result.ok) return { ok: false, error: result.error }
      return { ok: true }
    },
    logoutUser: () => {
      logout()
      setUser(null)
    },
    refreshSession: () => {
      setUser(getCurrentUser())
    },
    requestOtp: async (email) => {
      const result = await requestPasswordReset(email)
      if (!result.ok) return { ok: false, error: result.error }

      const otp = result.data?.otp ?? ''
      const sentVia = result.data?.sentVia ?? 'demo'

      if (sentVia === 'demo') {
        return { ok: true, sentVia: 'demo', otp }
      }

      return { ok: true, sentVia: 'email' }
    },
    verifyOtp: async (email, otp) => {
      const result = await verifyPasswordResetOtp(email, otp)
      if (!result.ok) return { ok: false, error: result.error }
      return { ok: true }
    },
    resetPassword: async (email, password) => {
      const result = await resetPasswordWithOtp(email, password)
      if (!result.ok) return { ok: false, error: result.error }
      return { ok: true }
    },
    updatePassword: async (currentPassword, nextPassword) => {
      if (!user) return { ok: false, error: 'Please login again' }
      const result = await changePassword({ currentPassword, nextPassword })
      if (!result.ok) return { ok: false, error: result.error }
      return { ok: true }
    },
  }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
