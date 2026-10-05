import { randomBytes } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'

const SESSION_COOKIE = 'panda_cms_session'
const sessions = new Set<string>()

export interface CmsCredentials {
  username: string
  password: string
}

export function getCredentials(): CmsCredentials {
  if (process.env.NODE_ENV === 'production' && (!process.env.CMS_ADMIN_USER || !process.env.CMS_ADMIN_PASSWORD)) {
    throw new Error('CMS_ADMIN_USER and CMS_ADMIN_PASSWORD are required in production')
  }
  return {
    username: process.env.CMS_ADMIN_USER ?? 'admin',
    password: process.env.CMS_ADMIN_PASSWORD ?? 'panda-local',
  }
}

export function createSession(res: Response): void {
  const token = randomBytes(32).toString('hex')
  sessions.add(token)
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
  const token = req.cookies?.[SESSION_COOKIE]
  return typeof token === 'string' && sessions.has(token)
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (isAuthenticated(req)) {
    next()
    return
  }
  res.status(401).json({ error: 'Authentication required' })
}
