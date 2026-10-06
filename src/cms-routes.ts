import type { Express, Request } from 'express'
import type { MongoContentRepository } from './content-store.js'
import { clearSession, createSession, getSessionRole, isAuthenticated, requireAuth, requireRole } from './auth.js'
import type { CmsIdentityStore } from './identity-store.js'

interface LoginBody {
  username?: string
  password?: string
}

interface PostBody {
  slug?: string
  title?: string
  summary?: string
  body?: string
  author?: string
  seoTitle?: string
  seoDescription?: string
}

export function registerCmsRoutes(app: Express, repository: MongoContentRepository, identity: CmsIdentityStore): void {
  app.post('/api/admin/login', async (req, res) => {
    const body = req.body as LoginBody
    const user = await identity.authenticate(body.username ?? '', body.password ?? '')
    if (!user) {
      await identity.record({ event: 'auth.login.failed', username: body.username })
      res.status(401).json({ error: 'Invalid username or password' })
      return
    }
    createSession(res, user.username, user.role)
    await identity.record({ event: 'auth.login.succeeded', username: user.username, role: user.role })
    res.json({ authenticated: true, role: user.role })
  })

  app.get('/api/admin/session', (req, res) => {
    res.json({ authenticated: isAuthenticated(req), role: getSessionRole(req) ?? null })
  })

  app.post('/api/admin/logout', (req, res) => {
    clearSession(req, res)
    res.status(204).end()
  })

  app.get('/api/admin/audit', requireRole('admin'), async (_req, res) => {
    res.json({ events: await identity.recent() })
  })

  app.get('/api/admin/posts', requireAuth, async (_req, res) => {
    res.json({ posts: await repository.list(true), area: 'cms-admin' })
  })

  app.get('/api/admin/summary', requireAuth, async (_req, res) => {
    res.json(await repository.summary())
  })

  app.post('/api/admin/posts/:slug/transition', requireRole('admin', 'editor'), async (req: Request<{ slug: string }>, res) => {
    try {
      const target = (req.body as { status?: string }).status
      if (!['draft', 'review', 'published', 'archived'].includes(target ?? '')) {
        res.status(400).json({ error: 'Invalid target status' })
        return
      }
      const post = await repository.transition(req.params.slug, target as 'draft' | 'review' | 'published' | 'archived')
      await identity.record({ event: `post.transition.${target}`, target: req.params.slug })
      res.json({ post })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to transition post' })
    }
  })

  app.post('/api/admin/posts', requireRole('admin', 'editor'), async (req, res) => {
    try {
      const body = req.body as PostBody
      const post = await repository.saveDraft({ slug: body.slug ?? '', title: body.title ?? '', summary: body.summary ?? '', body: body.body ?? '', author: body.author ?? 'admin', seoTitle: body.seoTitle ?? '', seoDescription: body.seoDescription ?? '' })
      await identity.record({ event: 'post.created', target: post.slug })
      res.status(201).json({ post })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to save draft' })
    }
  })

  app.put('/api/admin/posts/:slug', requireRole('admin', 'editor'), async (req: Request<{ slug: string }>, res) => {
    try {
      const body = req.body as PostBody
      const post = await repository.saveDraft({ slug: req.params.slug, title: body.title ?? '', summary: body.summary ?? '', body: body.body ?? '', author: body.author ?? 'admin', seoTitle: body.seoTitle ?? '', seoDescription: body.seoDescription ?? '' })
      await identity.record({ event: 'post.updated', target: post.slug })
      res.json({ post })
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to save draft' })
    }
  })
}
