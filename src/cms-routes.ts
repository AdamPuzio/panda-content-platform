import type { Express, Request } from 'express'
import type { MongoContentRepository } from './content-store.js'
import { clearSession, createSession, getCredentials, getSessionRole, isAuthenticated, requireAuth, requireRole } from './auth.js'

interface LoginBody {
  username?: string
  password?: string
}

interface PostBody {
  slug?: string
  title?: string
}

export function registerCmsRoutes(app: Express, repository: MongoContentRepository): void {
  app.post('/api/admin/login', (req, res) => {
    const body = req.body as LoginBody
    const credentials = getCredentials()
    if (body.username !== credentials.username || body.password !== credentials.password) {
      res.status(401).json({ error: 'Invalid username or password' })
      return
    }
    createSession(res, credentials.role)
    res.json({ authenticated: true, role: credentials.role })
  })

  app.get('/api/admin/session', (req, res) => {
    res.json({ authenticated: isAuthenticated(req), role: getSessionRole(req) ?? null })
  })

  app.post('/api/admin/logout', (req, res) => {
    clearSession(req, res)
    res.status(204).end()
  })

  app.get('/api/admin/posts', requireAuth, async (_req, res) => {
    res.json({ posts: await repository.list(true), area: 'cms-admin' })
  })

  app.post('/api/admin/posts/:slug/publish', requireRole('admin', 'editor'), async (req: Request<{ slug: string }>, res) => {
    try {
      res.json({ post: await repository.publish(req.params.slug) })
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Post not found' })
    }
  })

  app.post('/api/admin/posts', requireRole('admin', 'editor'), async (req, res) => {
    try {
      const body = req.body as PostBody
      res.status(201).json({ post: await repository.saveDraft({ slug: body.slug ?? '', title: body.title ?? '' }) })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to save draft' })
    }
  })

  app.put('/api/admin/posts/:slug', requireRole('admin', 'editor'), async (req: Request<{ slug: string }>, res) => {
    try {
      const body = req.body as PostBody
      res.json({ post: await repository.saveDraft({ slug: req.params.slug, title: body.title ?? '' }) })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to save draft' })
    }
  })
}
