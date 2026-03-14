import { useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Box, ClipboardCheck, Package, Settings, Truck, Undo2, UserCircle2, Warehouse, LogOut, Lock } from 'lucide-react'
import AnimatedBackground from '../components/AnimatedBackground'
import { useAuth } from '../auth/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: Box },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/receipts', label: 'Receipts', icon: ClipboardCheck },
  { to: '/deliveries', label: 'Deliveries', icon: Truck },
  { to: '/transfers', label: 'Transfers', icon: Undo2 },
  { to: '/adjustments', label: 'Adjustments', icon: Warehouse },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function validPassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (!/[a-z]/.test(password)) return 'Add at least one lowercase letter'
  if (!/[A-Z]/.test(password)) return 'Add at least one uppercase letter'
  if (!/[0-9]/.test(password)) return 'Add at least one number'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Add at least one special character'
  return null
}

export default function InventoryLayout() {
  const { user, logoutUser, updatePassword } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isPasswordPanelOpen, setIsPasswordPanelOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const welcome = useMemo(() => {
    if (!user) return { name: 'User', warehouse: 'Main Inventory' }
    return { name: user.fullName.split(' ')[0] || user.fullName, warehouse: user.organization }
  }, [user])

  const handleLogout = () => {
    logoutUser()
    navigate('/login')
  }

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!currentPassword || !nextPassword || !confirmPassword) {
      setPasswordError('All password fields are required')
      return
    }

    const validationError = validPassword(nextPassword)
    if (validationError) {
      setPasswordError(validationError)
      return
    }

    if (nextPassword !== confirmPassword) {
      setPasswordError('New password and confirm password must match')
      return
    }

    setIsSaving(true)
    const result = await updatePassword(currentPassword, nextPassword)
    setIsSaving(false)

    if (!result.ok) {
      setPasswordError(result.error ?? 'Unable to change password')
      return
    }

    setCurrentPassword('')
    setNextPassword('')
    setConfirmPassword('')
    setPasswordSuccess('Password updated successfully')
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 min-h-screen p-4 md:p-6">
        <div className="mx-auto w-full max-w-7xl">
          <motion.header
            className="relative z-30 glass-strong neon-border-cyan rounded-2xl px-4 py-3 md:px-6 md:py-4"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-xl font-bold text-white md:text-2xl">
                  Welcome back, <span className="text-gradient">{welcome.name}</span>
                </h1>
                <p className="text-sm text-gray-300">
                  Warehouse: <span className="font-semibold text-cyan-300">{welcome.warehouse}</span>
                </p>
              </div>

              <div className="relative z-40 self-start md:self-auto">
                <button
                  type="button"
                  className="glass rounded-xl px-4 py-2 text-sm font-medium text-gray-200 transition hover:text-white"
                  onClick={() => setIsMenuOpen((value) => !value)}
                >
                  <span className="inline-flex items-center gap-2">
                    <UserCircle2 size={16} />
                    Profile
                  </span>
                </button>

                {isMenuOpen && user && (
                  <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-white/10 bg-gray-950/95 p-4 shadow-2xl">
                    <p className="text-sm font-semibold text-white">{user.fullName}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                    <p className="mt-1 text-xs text-gray-500">Role: {user.role.replace('_', ' ')}</p>
                    <div className="mt-4 space-y-2">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-left text-sm text-gray-200 hover:border-purple-400/50 hover:text-white"
                        onClick={() => {
                          setIsPasswordPanelOpen((value) => !value)
                          setPasswordError('')
                          setPasswordSuccess('')
                        }}
                      >
                        <Lock size={15} /> Change password
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-left text-sm text-red-300 hover:border-red-400 hover:text-red-200"
                        onClick={handleLogout}
                      >
                        <LogOut size={15} /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.header>

          <div className="relative z-10 mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
            <motion.aside
              className="glass-strong neon-border-purple rounded-2xl p-3"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <nav className="space-y-2">
                {navItems.map(({ to, label, icon: Icon }) => {
                  const active = location.pathname === to
                  return (
                    <Link
                      key={to}
                      to={to}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition"
                      style={{
                        background: active ? 'rgba(6, 182, 212, 0.16)' : 'rgba(255,255,255,0.02)',
                        border: active ? '1px solid rgba(6, 182, 212, 0.5)' : '1px solid rgba(255,255,255,0.06)',
                        color: active ? '#67e8f9' : '#d1d5db',
                      }}
                    >
                      <Icon size={16} />
                      {label}
                    </Link>
                  )
                })}
              </nav>
            </motion.aside>

            <motion.main
              className="glass-strong rounded-2xl border border-white/10 p-4 md:p-6"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {isPasswordPanelOpen && (
                <div className="mb-6 rounded-2xl border border-purple-400/30 bg-purple-500/5 p-4">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-purple-200">Change Password</h2>
                  <form onSubmit={handlePasswordChange} className="grid gap-3 md:grid-cols-3">
                    <input
                      className="input-field rounded-lg border border-white/10 px-3 py-2"
                      type="password"
                      placeholder="Current password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                    />
                    <input
                      className="input-field rounded-lg border border-white/10 px-3 py-2"
                      type="password"
                      placeholder="New password"
                      value={nextPassword}
                      onChange={(event) => setNextPassword(event.target.value)}
                    />
                    <input
                      className="input-field rounded-lg border border-white/10 px-3 py-2"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                    >
                      {isSaving ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                  {passwordError && <p className="mt-3 text-sm text-red-300">{passwordError}</p>}
                  {passwordSuccess && <p className="mt-3 text-sm text-emerald-300">{passwordSuccess}</p>}
                </div>
              )}

              <Outlet />
            </motion.main>
          </div>
        </div>
      </div>
    </div>
  )
}
