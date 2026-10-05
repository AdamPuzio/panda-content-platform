import type { Express, Request } from 'express'
import type { MongoContentRepository } from './content-store.js'
import { clearSession, createSession, getCredentials, isAuthenticated, requireAuth } from './auth.js'

interface LoginBody {
  username?: string
  password?: string
}

export function registerCmsRoutes(app: Express, repository: MongoContentRepository): void {
  app.post('/api/admin/login', (req, res) => {
    const body = req.body as LoginBody
    const credentials = getCredentials()
    if (body.username !== credentials.username || body.password !== credentials.password) {
      res.status(401).json({ error: 'Invalid username or password' })
      return
    }
    createSession(res)
    res.json({ authenticated: true })
  })

  app.get('/api/admin/session', (req, res) => {
    res.json({ authenticated: isAuthenticated(req) })
  })

  app.post('/api/admin/logout', (req, res) => {
    clearSession(req, res)
    res.status(204).end()
  })

  app.get('/api/admin/posts', requireAuth, async (_req, res) => {
    res.json({ posts: await repository.list(true), area: 'cms-admin' })
  })

  app.post('/api/admin/posts/:slug/publish', requireAuth, async (req: Request<{ slug: string }>, res) => {
    try {
      res.json({ post: await repository.publish(req.params.slug) })
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Post not found' })
    }
  })
}
