import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  changePassword,
  getCurrentUser,
  login,
  logout,
  requestPasswordReset,
  resetPasswordWithOtp,
  signup,
  touchSession,
  verifyPasswordResetOtp,
  type UserRecord,
  type UserRole,
} from './authService'
import { deliverOtpEmail } from './otpEmailService'

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
  verifyOtp: (email: string, otp: string) => { ok: boolean; error?: string }
  resetPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  updatePassword: (currentPassword: string, nextPassword: string) => Promise<{ ok: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserRecord | null>(() => getCurrentUser())

  useEffect(() => {
    const run = () => {
      const next = touchSession()
      setUser(next)
    }

    const activityEvents: Array<keyof WindowEventMap> = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart']
    const activityHandler = () => run()

    activityEvents.forEach((event) => window.addEventListener(event, activityHandler))
    const timer = window.setInterval(run, 60_000)

    return () => {
      activityEvents.forEach((event) => window.removeEventListener(event, activityHandler))
      clearInterval(timer)
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user),
    loginUser: async ({ email, password, rememberMe }) => {
      const result = await login({ email, password, rememberMe })
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
      const result = requestPasswordReset(email)
      if (!result.ok) return { ok: false, error: result.error }

      const otp = result.data?.otp ?? ''
      const delivery = await deliverOtpEmail(email, otp)
      if (!delivery.ok) {
        return { ok: false, error: delivery.error }
      }

      if (delivery.sentVia === 'demo') {
        return { ok: true, sentVia: 'demo', otp }
      }

      return { ok: true, sentVia: 'email' }
    },
    verifyOtp: (email, otp) => {
      const result = verifyPasswordResetOtp(email, otp)
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
      const result = await changePassword({ userId: user.id, currentPassword, nextPassword })
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
