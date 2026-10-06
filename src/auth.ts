import { randomBytes } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'

const SESSION_COOKIE = 'panda_cms_session'
const sessions = new Map<string, CmsRole>()

export const CMS_ROLES = ['admin', 'editor', 'viewer'] as const
export type CmsRole = (typeof CMS_ROLES)[number]

export interface CmsCredentials {
  username: string
  password: string
  role: CmsRole
}

export function getCredentials(): CmsCredentials {
  if (process.env.NODE_ENV === 'production' && (!process.env.CMS_ADMIN_USER || !process.env.CMS_ADMIN_PASSWORD)) {
    throw new Error('CMS_ADMIN_USER and CMS_ADMIN_PASSWORD are required in production')
  }
  return {
    username: process.env.CMS_ADMIN_USER ?? 'admin',
    password: process.env.CMS_ADMIN_PASSWORD ?? 'panda-local',
    role: normalizeRole(process.env.CMS_ADMIN_ROLE ?? 'admin'),
  }
}

function normalizeRole(value: string): CmsRole {
  if (CMS_ROLES.includes(value as CmsRole)) return value as CmsRole
  throw new Error(`CMS_ADMIN_ROLE must be one of: ${CMS_ROLES.join(', ')}`)
}

export function createSession(res: Response, username: string, role: CmsRole): void {
  const token = randomBytes(32).toString('hex')
  sessions.set(token, role)
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8,
  })
}

export function clearSession(req: Request, res: Response): void {
  const token = req.cookies?.[SESSION_COOKIE]
  if (token) sessions.delete(token)
  res.clearCookie(SESSION_COOKIE)
}

export function isAuthenticated(req: Request): boolean {
  return getSessionRole(req) !== undefined
}

export function getSessionRole(req: Request): CmsRole | undefined {
  const token = req.cookies?.[SESSION_COOKIE]
  return typeof token === 'string' ? sessions.get(token) : undefined
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (isAuthenticated(req)) {
    next()
    return
  }
  res.status(401).json({ error: 'Authentication required' })
}

export function requireRole(...allowedRoles: CmsRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = getSessionRole(req)
    if (!role) {
      res.status(401).json({ error: 'Authentication required' })
      return
    }
    if (!allowedRoles.includes(role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }
    next()
  }
}
