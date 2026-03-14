import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, Zap, ArrowRight, Github, Chrome } from 'lucide-react'
import AnimatedBackground from '../components/AnimatedBackground'

interface FormErrors {
  email?: string
  password?: string
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
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
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)
    // Simulate API call — replace with real auth logic
    await new Promise((r) => setTimeout(r, 1500))
    setIsLoading(false)
    navigate('/dashboard') // adjust route as needed
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
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', boxShadow: '0 0 20px rgba(124,58,237,0.5)' }}
            >
              <Zap size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold font-mono tracking-wider text-gradient">AuthX</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-gray-400 text-sm">Sign in to continue your journey</p>
        </motion.div>

        {/* Card */}
        <motion.div variants={itemVariants} className="glass-strong rounded-2xl p-8 neon-border-purple">
          {/* Social Logins */}
          <div className="flex gap-3 mb-6">
            {[
              { icon: Github, label: 'GitHub', color: 'rgba(255,255,255,0.05)' },
              { icon: Chrome, label: 'Google', color: 'rgba(255,255,255,0.05)' },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                type="button"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-gray-300 transition-all duration-300 hover:text-white group"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(168,85,247,0.4)'
                  e.currentTarget.style.background = 'rgba(168,85,247,0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                }}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs text-gray-500 font-mono uppercase tracking-widest">or continue with</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

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
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#a855f7' }}>
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
          🔒 256-bit encrypted &nbsp;·&nbsp; SOC 2 compliant &nbsp;·&nbsp; GDPR ready
        </motion.p>
      </motion.div>
    </div>
  )
}
