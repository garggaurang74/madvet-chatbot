import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'madvetkaboss'

export interface AdminToken {
  authenticated: boolean
  timestamp: number
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10)
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash)
}

export function generateAdminToken(): string {
  const payload: AdminToken = {
    authenticated: true,
    timestamp: Date.now()
  }
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

export function verifyAdminToken(token: string): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminToken
    
    // Check if token is not too old (24 hours)
    const now = Date.now()
    const tokenAge = now - decoded.timestamp
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    
    return decoded.authenticated && tokenAge < maxAge
  } catch {
    return false
  }
}

export function getStoredAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('madvet_admin_token')
}

export function setStoredAdminToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('madvet_admin_token', token)
}

export function clearStoredAdminToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('madvet_admin_token')
}

export function isAdminAuthenticated(): boolean {
  const token = getStoredAdminToken()
  if (!token) return false
  return verifyAdminToken(token)
}
