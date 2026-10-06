import type { PandaContext } from '@panda/kernel'
import type { MongoContentRepository } from './content-store.js'

export function registerContentActions(registry: { registerAction: Function }, repository: MongoContentRepository) {
  registry.registerAction('adminPosts', async (data: unknown, _ctx: PandaContext) => {
    const { res } = data as { res: { json(body: unknown): void } }
    res.json({ posts: await repository.list(true), area: 'cms' })
  }, { namespace: 'content' })

  registry.registerAction('publicPosts', async (data: unknown, _ctx: PandaContext) => {
    const { res } = data as { res: { json(body: unknown): void } }
    res.json({ posts: await repository.list(), area: 'web' })
  }, { namespace: 'content' })

  registry.registerAction('publicPostPage', async (data: unknown, ctx: PandaContext) => {
    const { req, res } = data as { req: { params: { slug: string } }; res: { status(code: number): { type(value: string): { send(body: string): void } }; type(value: string): { send(body: string): void } } }
    const post = await repository.getPublished(req.params.slug)
    if (!post) {
      res.status(404).type('text/html').send('<h1>Not found</h1><p>This published page does not exist.</p>')
      return
    }
    const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
    const seo = (ctx.instances.seoPlugin as unknown as { getExport(name: string): { getConfig(): { siteName: string; siteDescription: string } } } | undefined)?.getExport('seo').getConfig()
    res.type('text/html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(post.seoTitle || post.title)} | ${escapeHtml(seo?.siteName || 'Panda')}</title><meta name="description" content="${escapeHtml(post.seoDescription || post.summary || seo?.siteDescription)}"><style>body{margin:0;background:#101820;color:#f2f5f7;font:16px/1.7 system-ui,sans-serif}main{max-width:760px;margin:0 auto;padding:72px 24px}a{color:#f3b562}h1{font-size:clamp(2.5rem,7vw,5rem);line-height:1.02;letter-spacing:-.05em;margin:12px 0 20px}p{color:#b8c5ca}.eyebrow{color:#f3b562;text-transform:uppercase;letter-spacing:.15em;font-size:.75rem;font-weight:700}.body{white-space:pre-wrap;color:#dce5e8;font-size:1.1rem}</style></head><body><main><a href="/">${escapeHtml(seo?.siteName || 'PANDA CONTENT PLATFORM')}</a><div class="eyebrow">Published story</div><h1>${escapeHtml(post.title)}</h1><p>${escapeHtml(post.summary)}</p><div class="body">${escapeHtml(post.body)}</div></main></body></html>`)
  }, { namespace: 'content' })

  registry.registerAction('listPosts', async (_data: unknown, _ctx: PandaContext) => {
    return { posts: await repository.list(true) }
  }, { namespace: 'content' })

  registry.registerAction('publishPost', async (data: unknown, _ctx: PandaContext) => {
    const slug = (data as { slug?: string }).slug ?? 'welcome'
    return { post: await repository.transition(slug, 'published') }
  }, { namespace: 'content' })
}
