import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, KeyRound, Mail, ShieldCheck } from 'lucide-react'
import AnimatedBackground from '../components/AnimatedBackground'
import { useAuth } from '../auth/AuthContext'

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[a-z]/.test(password)) return 'Add at least one lowercase letter'
  if (!/[A-Z]/.test(password)) return 'Add at least one uppercase letter'
  if (!/[0-9]/.test(password)) return 'Add at least one number'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Add at least one special character'
  return null
}

export default function ForgotPasswordPage() {
  const { requestOtp, verifyOtp, resetPassword } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleRequestOtp = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setInfo('')

    setIsLoading(true)
    const result = await requestOtp(email)
    setIsLoading(false)
    if (!result.ok) {
      setError(result.error ?? 'Could not send OTP')
      return
    }

    if (result.sentVia === 'email') {
      setInfo('OTP sent successfully to your email.')
    } else {
      setInfo(`Email service is not configured, using demo OTP: ${result.otp}`)
    }
    setStep(2)
  }

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setInfo('')

    const result = await verifyOtp(email, otp)
    if (!result.ok) {
      setError(result.error ?? 'OTP verification failed')
      return
    }

    setInfo('OTP verified. Set your new password.')
    setStep(3)
  }

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setInfo('')

    const validation = validatePassword(newPassword)
    if (validation) {
      setError(validation)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    const result = await resetPassword(email, newPassword)
    setIsLoading(false)

    if (!result.ok) {
      setError(result.error ?? 'Unable to reset password')
      return
    }

    navigate('/login', {
      replace: true,
      state: { message: 'Password reset successful. Please login with your new password.' },
    })
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <AnimatedBackground />

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-white">Reset Password</h1>
          <p className="text-sm text-gray-400">Secure OTP flow for inventory system access</p>
        </div>

        <div className="glass-strong neon-border-cyan rounded-2xl p-7">
          <div className="mb-5 flex items-center justify-between text-xs uppercase tracking-wider text-gray-400">
            <span className={step >= 1 ? 'text-cyan-300' : ''}>Request OTP</span>
            <span className={step >= 2 ? 'text-cyan-300' : ''}>Verify</span>
            <span className={step >= 3 ? 'text-cyan-300' : ''}>New Password</span>
          </div>

          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Registered Email</label>
              <div className="input-wrapper">
                <Mail size={16} className="mr-3 text-gray-500" />
                <input
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-70"
              >
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Enter OTP</label>
              <div className="input-wrapper">
                <ShieldCheck size={16} className="mr-3 text-gray-500" />
                <input
                  type="text"
                  className="input-field tracking-[0.3em]"
                  placeholder="000000"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  maxLength={6}
                  required
                />
              </div>
              <button type="submit" className="btn-primary w-full rounded-xl py-3 text-sm font-semibold text-white">
                Verify OTP
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">New Password</label>
              <div className="input-wrapper">
                <KeyRound size={16} className="mr-3 text-gray-500" />
                <input
                  type="password"
                  className="input-field"
                  placeholder="Create new password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
              </div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Confirm Password</label>
              <div className="input-wrapper">
                <CheckCircle2 size={16} className="mr-3 text-gray-500" />
                <input
                  type="password"
                  className="input-field"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-70"
              >
                {isLoading ? 'Updating password...' : 'Update Password'}
              </button>
            </form>
          )}

          {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
          {info && <p className="mt-4 text-sm text-emerald-300">{info}</p>}

          <div className="mt-6 border-t border-white/10 pt-4 text-sm text-gray-400">
            <Link to="/login" className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200">
              Back to login <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
