export function generateAdminToken(): string {
  return JSON.stringify({ authenticated: true, timestamp: Date.now() })
}

export function verifyAdminToken(token: string): boolean {
  try {
    const decoded = JSON.parse(token)
    const tokenAge = Date.now() - decoded.timestamp
    const maxAge = 24 * 60 * 60 * 1000
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
