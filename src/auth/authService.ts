export type UserRole = 'inventory_manager' | 'warehouse_staff'
export type UserStatus = 'active' | 'disabled'

export interface UserRecord {
  id: string
  fullName: string
  email: string
  passwordHash: string
  role: UserRole
  organization: string
  status: UserStatus
  createdAt: string
  defaultWarehouse: string
  defaultCategory: string
  inventoryLedgerId: string
}

export interface SessionRecord {
  token: string
  userId: string
  createdAt: number
  lastActiveAt: number
  expiresAt: number
  rememberMe: boolean
}

interface LoginAttemptRecord {
  count: number
  lockedUntil: number | null
}

interface PasswordResetRecord {
  email: string
  otp: string
  expiresAt: number
  verified: boolean
}

interface AuthResult<T> {
  ok: boolean
  data?: T
  error?: string
}

interface SignupInput {
  fullName: string
  email: string
  password: string
  role?: UserRole
  organization?: string
}

interface LoginInput {
  email: string
  password: string
  rememberMe: boolean
}

interface PasswordChangeInput {
  userId: string
  currentPassword: string
  nextPassword: string
}

const USERS_KEY = 'indus_users'
const SESSION_KEY = 'indus_session'
const ATTEMPTS_KEY = 'indus_login_attempts'
const RESET_KEY = 'indus_password_reset'

const MAX_FAILED_ATTEMPTS = 5
const LOCK_MS = 5 * 60 * 1000
const OTP_MS = 5 * 60 * 1000
const SESSION_MS = 30 * 60 * 1000
const REMEMBER_MS = 7 * 24 * 60 * 60 * 1000

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function readJSON<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJSON<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function randomToken(length = 32): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function randomOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function nowISO(): string {
  return new Date().toISOString()
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

function getUsers(): UserRecord[] {
  return readJSON<UserRecord[]>(USERS_KEY, [])
}

function saveUsers(users: UserRecord[]): void {
  writeJSON(USERS_KEY, users)
}

function getAttempts(): Record<string, LoginAttemptRecord> {
  return readJSON<Record<string, LoginAttemptRecord>>(ATTEMPTS_KEY, {})
}

function saveAttempts(attempts: Record<string, LoginAttemptRecord>): void {
  writeJSON(ATTEMPTS_KEY, attempts)
}

function getResetRecord(): PasswordResetRecord | null {
  return readJSON<PasswordResetRecord | null>(RESET_KEY, null)
}

function setResetRecord(record: PasswordResetRecord | null): void {
  if (!record) {
    localStorage.removeItem(RESET_KEY)
    return
  }
  writeJSON(RESET_KEY, record)
}

function setSession(session: SessionRecord | null): void {
  if (!session) {
    localStorage.removeItem(SESSION_KEY)
    return
  }
  writeJSON(SESSION_KEY, session)
}

export function getSession(): SessionRecord | null {
  const session = readJSON<SessionRecord | null>(SESSION_KEY, null)
  if (!session) return null
  if (Date.now() > session.expiresAt) {
    setSession(null)
    return null
  }
  return session
}

export function getCurrentUser(): UserRecord | null {
  const session = getSession()
  if (!session) return null
  const user = getUsers().find((u) => u.id === session.userId)
  if (!user || user.status !== 'active') {
    setSession(null)
    return null
  }
  return user
}

export function touchSession(): UserRecord | null {
  const session = getSession()
  if (!session) return null

  const now = Date.now()
  const nextExpiresAt = session.rememberMe ? now + REMEMBER_MS : now + SESSION_MS
  setSession({ ...session, lastActiveAt: now, expiresAt: nextExpiresAt })
  return getCurrentUser()
}

export function logout(): void {
  setSession(null)
}

export async function signup(input: SignupInput): Promise<AuthResult<UserRecord>> {
  const email = normalizeEmail(input.email)
  const users = getUsers()
  const exists = users.some((u) => u.email === email)

  if (exists) {
    return { ok: false, error: 'Email already registered' }
  }

  const user: UserRecord = {
    id: randomToken(12),
    fullName: input.fullName.trim(),
    email,
    passwordHash: await hashPassword(input.password),
    role: input.role ?? 'inventory_manager',
    organization: input.organization?.trim() || 'Main Inventory',
    status: 'active',
    createdAt: nowISO(),
    defaultWarehouse: 'Default Warehouse',
    defaultCategory: 'General Products',
    inventoryLedgerId: randomToken(10),
  }

  saveUsers([...users, user])
  return { ok: true, data: user }
}

export async function login(input: LoginInput): Promise<AuthResult<UserRecord>> {
  const email = normalizeEmail(input.email)
  const users = getUsers()
  const user = users.find((u) => u.email === email)

  const attempts = getAttempts()
  const currentAttempt = attempts[email] ?? { count: 0, lockedUntil: null }
  const now = Date.now()

  if (currentAttempt.lockedUntil && now < currentAttempt.lockedUntil) {
    const seconds = Math.ceil((currentAttempt.lockedUntil - now) / 1000)
    return {
      ok: false,
      error: `Too many failed attempts. Try again in ${seconds}s.`,
    }
  }

  if (!user) {
    return { ok: false, error: 'Account does not exist' }
  }

  if (user.status !== 'active') {
    return { ok: false, error: 'Account disabled' }
  }

  const hash = await hashPassword(input.password)
  const valid = user.passwordHash === hash

  if (!valid) {
    const count = currentAttempt.count + 1
    const willLock = count >= MAX_FAILED_ATTEMPTS
    attempts[email] = {
      count: willLock ? 0 : count,
      lockedUntil: willLock ? now + LOCK_MS : null,
    }
    saveAttempts(attempts)

    return {
      ok: false,
      error: willLock
        ? 'Too many failed attempts. Account is temporarily locked for 5 minutes.'
        : 'Invalid email or password',
    }
  }

  attempts[email] = { count: 0, lockedUntil: null }
  saveAttempts(attempts)

  const session: SessionRecord = {
    token: randomToken(16),
    userId: user.id,
    createdAt: now,
    lastActiveAt: now,
    expiresAt: now + (input.rememberMe ? REMEMBER_MS : SESSION_MS),
    rememberMe: input.rememberMe,
  }

  setSession(session)
  return { ok: true, data: user }
}

export function requestPasswordReset(emailInput: string): AuthResult<{ otp: string }> {
  const email = normalizeEmail(emailInput)
  const user = getUsers().find((u) => u.email === email)

  if (!user) {
    return { ok: false, error: 'Account does not exist' }
  }

  const otp = randomOtp()
  setResetRecord({
    email,
    otp,
    expiresAt: Date.now() + OTP_MS,
    verified: false,
  })

  return { ok: true, data: { otp } }
}

export function verifyPasswordResetOtp(emailInput: string, otp: string): AuthResult<null> {
  const email = normalizeEmail(emailInput)
  const reset = getResetRecord()

  if (!reset || reset.email !== email) {
    return { ok: false, error: 'No reset request found for this email' }
  }

  if (Date.now() > reset.expiresAt) {
    setResetRecord(null)
    return { ok: false, error: 'OTP expired. Please request a new one' }
  }

  if (reset.otp !== otp.trim()) {
    return { ok: false, error: 'Invalid OTP code' }
  }

  setResetRecord({ ...reset, verified: true })
  return { ok: true, data: null }
}

export async function resetPasswordWithOtp(
  emailInput: string,
  password: string,
): Promise<AuthResult<null>> {
  const email = normalizeEmail(emailInput)
  const reset = getResetRecord()

  if (!reset || reset.email !== email || !reset.verified) {
    return { ok: false, error: 'OTP verification is required' }
  }

  if (Date.now() > reset.expiresAt) {
    setResetRecord(null)
    return { ok: false, error: 'OTP expired. Please request a new one' }
  }

  const users = getUsers()
  const index = users.findIndex((u) => u.email === email)

  if (index === -1) {
    return { ok: false, error: 'Account does not exist' }
  }

  users[index] = {
    ...users[index],
    passwordHash: await hashPassword(password),
  }
  saveUsers(users)
  setResetRecord(null)

  return { ok: true, data: null }
}

export async function changePassword(input: PasswordChangeInput): Promise<AuthResult<null>> {
  const users = getUsers()
  const index = users.findIndex((u) => u.id === input.userId)

  if (index === -1) {
    return { ok: false, error: 'User not found' }
  }

  const oldHash = await hashPassword(input.currentPassword)
  if (users[index].passwordHash !== oldHash) {
    return { ok: false, error: 'Current password is incorrect' }
  }

  users[index] = {
    ...users[index],
    passwordHash: await hashPassword(input.nextPassword),
  }
  saveUsers(users)

  return { ok: true, data: null }
}
