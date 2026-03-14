import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, User, Zap, ArrowRight, Github, Chrome, Check, X } from 'lucide-react'
import AnimatedBackground from '../components/AnimatedBackground'

interface FormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

interface PasswordStrength {
  score: number
  label: string
  color: string
}

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const levels: PasswordStrength[] = [
    { score: 0, label: '', color: 'transparent' },
    { score: 1, label: 'Weak', color: '#ef4444' },
    { score: 2, label: 'Fair', color: '#f59e0b' },
    { score: 3, label: 'Good', color: '#10b981' },
    { score: 4, label: 'Strong', color: '#06b6d4' },
  ]
  return levels[score]
}

interface Requirement {
  label: string
  met: boolean
}

function getRequirements(password: string): Requirement[] {
  return [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character', met: /[^A-Za-z0-9]/.test(password) },
  ]
}

export default function SignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const strength = getPasswordStrength(password)
  const requirements = getRequirements(password)

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!name.trim()) newErrors.name = 'Full name is required'
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
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0 && agreedToTerms
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)
    // Simulate API call — replace with real auth logic
    await new Promise((r) => setTimeout(r, 1800))
    setIsLoading(false)
    navigate('/login')
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  }

  const inputStyle = (field: string, hasError?: boolean) => ({
    borderColor: focusedField === field
      ? hasError ? 'rgba(239,68,68,0.6)' : 'rgba(168,85,247,0.6)'
      : hasError ? 'rgba(239,68,68,0.4)' : undefined,
    boxShadow: focusedField === field
      ? hasError ? '0 0 20px rgba(239,68,68,0.15)' : '0 0 20px rgba(168,85,247,0.15)'
      : undefined,
  })

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
          <h1 className="text-3xl font-bold text-white mb-2">Create account</h1>
          <p className="text-gray-400 text-sm">Join thousands of builders today</p>
        </motion.div>

        {/* Card */}
        <motion.div variants={itemVariants} className="glass-strong rounded-2xl p-8 neon-border-purple">
          {/* Social Signups */}
          <div className="flex gap-3 mb-6">
            {[{ icon: Github, label: 'GitHub' }, { icon: Chrome, label: 'Google' }].map(({ icon: Icon, label }) => (
              <button
                key={label}
                type="button"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-gray-300 transition-all duration-300 hover:text-white"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.4)'; e.currentTarget.style.background = 'rgba(168,85,247,0.08)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-xs text-gray-500 font-mono uppercase tracking-widest">or sign up with email</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
              <div className="input-wrapper" style={inputStyle('name', !!errors.name)}>
                <User size={16} className="text-gray-500 mr-3 flex-shrink-0" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })) }}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="John Doe"
                  className="input-field"
                  autoComplete="name"
                />
              </div>
              {errors.name && (
                <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-red-400" />{errors.name}
                </motion.p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
              <div className="input-wrapper" style={inputStyle('email', !!errors.email)}>
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
                <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-red-400" />{errors.email}
                </motion.p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</label>
              <div className="input-wrapper" style={inputStyle('password', !!errors.password)}>
                <Lock size={16} className="text-gray-500 mr-3 flex-shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })) }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Create a strong password"
                  className="input-field"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="ml-2 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-red-400" />{errors.password}
                </motion.p>
              )}

              {/* Password strength meter */}
              <AnimatePresence>
                {password.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex-1 h-1 rounded-full transition-all duration-500"
                          style={{ background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.08)' }} />
                      ))}
                    </div>
                    {strength.label && (
                      <p className="text-xs mb-2 font-medium" style={{ color: strength.color }}>
                        {strength.label} password
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-1">
                      {requirements.map((req) => (
                        <div key={req.label} className="flex items-center gap-1.5">
                          {req.met
                            ? <Check size={10} style={{ color: '#10b981' }} />
                            : <X size={10} style={{ color: 'rgba(255,255,255,0.2)' }} />}
                          <span className="text-xs" style={{ color: req.met ? '#10b981' : 'rgba(255,255,255,0.3)' }}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Confirm Password</label>
              <div className="input-wrapper" style={inputStyle('confirm', !!errors.confirmPassword)}>
                <Lock size={16} className="text-gray-500 mr-3 flex-shrink-0" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: undefined })) }}
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Repeat your password"
                  className="input-field"
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="ml-2 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {confirmPassword && password === confirmPassword && (
                  <Check size={16} className="ml-2 flex-shrink-0" style={{ color: '#10b981' }} />
                )}
              </div>
              {errors.confirmPassword && (
                <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-red-400" />{errors.confirmPassword}
                </motion.p>
              )}
            </div>

            {/* Terms */}
            <label className="flex items-start gap-3 cursor-pointer group mt-2">
              <div
                onClick={() => setAgreedToTerms(!agreedToTerms)}
                className="mt-0.5 w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200 cursor-pointer"
                style={{
                  background: agreedToTerms ? 'linear-gradient(135deg, #7c3aed, #06b6d4)' : 'transparent',
                  border: agreedToTerms ? 'none' : '1px solid rgba(255,255,255,0.2)',
                  boxShadow: agreedToTerms ? '0 0 10px rgba(124,58,237,0.4)' : 'none',
                }}
              >
                {agreedToTerms && <Check size={12} className="text-white" />}
              </div>
              <span className="text-xs text-gray-400 leading-relaxed">
                I agree to the{' '}
                <span className="font-medium cursor-pointer" style={{ color: '#a855f7' }}>Terms of Service</span>
                {' '}and{' '}
                <span className="font-medium cursor-pointer" style={{ color: '#a855f7' }}>Privacy Policy</span>
              </span>
            </label>
            {!agreedToTerms && isLoading === false && (
              <></>
            )}

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isLoading || !agreedToTerms}
              whileHover={{ scale: agreedToTerms ? 1.01 : 1 }}
              whileTap={{ scale: agreedToTerms ? 0.99 : 1 }}
              className="btn-primary w-full py-3.5 rounded-xl text-white text-sm mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold transition-colors duration-200"
              style={{ color: '#a855f7' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#06b6d4' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#a855f7' }}
            >
              Sign in →
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
