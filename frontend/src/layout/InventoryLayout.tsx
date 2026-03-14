import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Box, Package, Settings, UserCircle2, Activity, History, LogOut, Lock, Menu, X, ChevronRight } from 'lucide-react'
import AnimatedBackground from '../components/AnimatedBackground'
import { useAuth } from '../auth/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', hint: 'Analytics and performance', icon: Box },
  { to: '/products', label: 'Stock', hint: 'Realtime inventory edits', icon: Package },
  { to: '/operations', label: 'Operations', hint: 'Receipts, deliveries, adjustments', icon: Activity },
  { to: '/move-history', label: 'Move History', hint: 'Inbound and outbound timeline', icon: History },
  { to: '/settings', label: 'Settings', hint: 'Warehouse and location setup', icon: Settings },
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
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
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

  const nextPasswordError = useMemo(() => (nextPassword ? validPassword(nextPassword) : null), [nextPassword])
  const passwordsMatch = useMemo(() => (confirmPassword ? nextPassword === confirmPassword : true), [nextPassword, confirmPassword])

  useEffect(() => {
    setIsSidebarOpen(false)
    setIsProfileOpen(false)
  }, [location.pathname])

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

      <div className="relative z-10 min-h-screen p-3 md:p-5">
        <div className="mx-auto w-full max-w-[1600px]">
          <motion.header
            className="surface-panel-strong relative z-30 rounded-2xl px-4 py-3 md:px-6"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              <button
                type="button"
                className="btn-muted lg:hidden"
                onClick={() => setIsSidebarOpen((value) => !value)}
                aria-label="Toggle navigation"
              >
                {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
              </button>

              <div className="hidden sm:block mr-3">
                <div className="w-14 h-14 flex items-center justify-center rounded-xl p-1 shadow-inner">
                  <img src="/assets/novault-logo.png" alt="NoVault Logo" className="object-contain w-full h-full drop-shadow-md" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Inventory Control Center</p>
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-lg font-semibold text-white md:text-2xl">
                    NoVault <span className="text-cyan-300">Workspace</span>
                  </h1>
                </div>
                <p className="text-xs text-slate-300 md:text-sm">
                  Welcome back, <span className="font-semibold text-white">{welcome.name}</span> · Warehouse: <span className="font-semibold text-cyan-200">{welcome.warehouse}</span>
                </p>
              </div>

              <div className="relative z-40 ml-auto">
                <button
                  type="button"
                  className="btn-muted"
                  onClick={() => setIsProfileOpen((value) => !value)}
                >
                  <span className="inline-flex items-center gap-2">
                    <UserCircle2 size={16} />
                    Profile
                  </span>
                </button>

                {isProfileOpen && user && (
                  <div className="surface-panel absolute right-0 z-50 mt-2 w-[290px] rounded-xl p-4 shadow-2xl">
                    <p className="text-sm font-semibold text-white">{user.fullName}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                    <p className="mt-1 text-xs text-gray-500">Role: {user.role.replace('_', ' ')}</p>
                    <div className="mt-4 space-y-2">
                      <button
                        type="button"
                        className="btn-muted w-full justify-start"
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
                        className="inline-flex w-full items-center justify-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200 transition hover:border-rose-300"
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

          <div className="relative z-20 mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {navItems.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to
              return (
                <NavLink key={to} to={to} className={`nav-chip whitespace-nowrap ${active ? 'nav-chip-active' : ''}`}>
                  <Icon size={14} />
                  {label}
                </NavLink>
              )
            })}
          </div>

          <div className="relative z-10 mt-4 grid gap-4 lg:grid-cols-[240px_1fr] xl:gap-5">
            <motion.aside
              className={`surface-panel rounded-2xl p-3 ${isSidebarOpen ? 'block' : 'hidden'} lg:block`}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <p className="px-3 pb-3 text-xs uppercase tracking-[0.2em] text-cyan-200/70">Navigation</p>
              <nav className="space-y-2 px-1">
                {navItems.map(({ to, label, hint, icon: Icon }) => {
                  const active = location.pathname === to
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      className={`group flex items-center gap-3 rounded-xl border px-3 py-3 text-sm transition ${
                        active
                          ? 'border-cyan-300/60 bg-cyan-500/15 text-cyan-100'
                          : 'border-slate-500/20 bg-slate-900/25 text-slate-200 hover:border-cyan-400/40 hover:bg-cyan-500/5'
                      }`}
                    >
                      <Icon size={16} className={active ? 'text-cyan-200' : 'text-slate-300'} />
                      <span className="flex-1">
                        <span className="block font-medium">{label}</span>
                        <span className="block text-xs text-slate-400">{hint}</span>
                      </span>
                      <ChevronRight size={15} className={active ? 'text-cyan-200' : 'text-slate-500 group-hover:text-cyan-300'} />
                    </NavLink>
                  )
                })}
              </nav>
            </motion.aside>

            <motion.main
              className="surface-panel-strong rounded-2xl p-4 md:p-5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {isPasswordPanelOpen && (
                <div className="surface-subtle mb-5 rounded-2xl p-4">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-cyan-200">Change Password</h2>
                  <form onSubmit={handlePasswordChange} className="grid gap-3 md:grid-cols-3">
                    <input
                      className="form-field"
                      type="password"
                      placeholder="Current password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                    />
                    <input
                      className="form-field"
                      type="password"
                      placeholder="New password"
                      value={nextPassword}
                      onChange={(event) => setNextPassword(event.target.value)}
                    />
                    <input
                      className="form-field"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="btn-accent disabled:opacity-70"
                    >
                      {isSaving ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                  {nextPassword && nextPasswordError && <p className="mt-2 text-xs text-amber-200">{nextPasswordError}</p>}
                  {!passwordsMatch && <p className="mt-2 text-xs text-rose-300">Confirm password does not match.</p>}
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
