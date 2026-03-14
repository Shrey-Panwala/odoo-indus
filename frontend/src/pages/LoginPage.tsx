import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import AnimatedBackground from '../components/AnimatedBackground'
import { useAuth } from '../auth/AuthContext'

interface FormErrors {
  email?: string
  password?: string
}

interface LoginState {
  message?: string
  from?: string
}

export default function LoginPage() {
  const { loginUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? {}) as LoginState

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Enter a valid email address'
    }
    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError('')
    if (!validate()) return

    setIsLoading(true)
    const result = await loginUser({ email, password, rememberMe })
    setIsLoading(false)

    if (!result.ok) {
      setServerError(result.error ?? 'Login failed')
      return
    }

    const redirectTo = state.from || '/dashboard'
    navigate(redirectTo, { replace: true })
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <AnimatedBackground />

      <motion.div
        className="relative z-10 w-full max-w-md"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo / Brand */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-16 h-16 flex items-center justify-center -ml-3">
              <img src="/assets/novault-logo.png" alt="NoVault Logo" className="object-contain w-full h-full drop-shadow-xl" />
            </div>
            <span className="text-4xl font-extrabold font-sans tracking-tight text-white drop-shadow-md ml-1" style={{ textShadow: '0 4px 15px rgba(255,255,255,0.2)' }}>NoVault</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-gray-400 text-sm">Sign in to access your inventory workspace</p>
        </motion.div>

        {/* Card */}
        <motion.div variants={itemVariants} className="glass-strong rounded-2xl p-8 neon-border-purple">
          {state.message && (
            <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              {state.message}
            </p>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div
                className="input-wrapper"
                style={{
                  borderColor: focusedField === 'email'
                    ? errors.email ? 'rgba(239,68,68,0.6)' : 'rgba(168,85,247,0.6)'
                    : errors.email ? 'rgba(239,68,68,0.4)' : undefined,
                  boxShadow: focusedField === 'email'
                    ? errors.email ? '0 0 20px rgba(239,68,68,0.15)' : '0 0 20px rgba(168,85,247,0.15)'
                    : undefined,
                }}
              >
                <Mail size={16} className="text-gray-500 mr-3 flex-shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })) }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@example.com"
                  className="input-field"
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 text-xs text-red-400 flex items-center gap-1"
                >
                  <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
                  {errors.email}
                </motion.p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
                <button type="button" className="text-xs font-medium transition-colors duration-200"
                  style={{ color: '#a855f7' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#06b6d4' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#a855f7' }}
                  onClick={() => navigate('/forgot-password')}>
                  Forgot password?
                </button>
              </div>
              <div
                className="input-wrapper"
                style={{
                  borderColor: focusedField === 'password'
                    ? errors.password ? 'rgba(239,68,68,0.6)' : 'rgba(168,85,247,0.6)'
                    : errors.password ? 'rgba(239,68,68,0.4)' : undefined,
                  boxShadow: focusedField === 'password'
                    ? errors.password ? '0 0 20px rgba(239,68,68,0.15)' : '0 0 20px rgba(168,85,247,0.15)'
                    : undefined,
                }}
              >
                <Lock size={16} className="text-gray-500 mr-3 flex-shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })) }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  className="input-field"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="ml-2 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 text-xs text-red-400 flex items-center gap-1"
                >
                  <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
                  {errors.password}
                </motion.p>
              )}
            </div>

            <label className="flex items-center gap-3 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border border-white/20 bg-transparent"
              />
              Remember me
            </label>

            {serverError && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {serverError}
              </p>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="btn-primary w-full py-3.5 rounded-xl text-white text-sm mt-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="font-semibold transition-colors duration-200"
              style={{ color: '#a855f7' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#06b6d4' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#a855f7' }}
            >
              Create account →
            </Link>
          </p>
        </motion.div>

        {/* Bottom badge */}
        <motion.p variants={itemVariants} className="text-center text-xs text-gray-600 mt-6 font-mono">
          256-bit hashed credentials · session protected · inventory ready
        </motion.p>
      </motion.div>
    </div>
  )
}
