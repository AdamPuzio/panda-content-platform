import type { PandaContext } from '@panda/kernel'
import type { ContentStore } from './content-store.js'

export function registerContentActions(registry: { registerAction: Function }, store: ContentStore) {
  registry.registerAction('adminPosts', async (data: unknown, _ctx: PandaContext) => {
    const { res } = data as { res: { json(body: unknown): void } }
    res.json({ posts: store.list(true), area: 'cms' })
  }, { namespace: 'content' })

  registry.registerAction('publicPosts', async (data: unknown, _ctx: PandaContext) => {
    const { res } = data as { res: { json(body: unknown): void } }
    res.json({ posts: store.list(), area: 'web' })
  }, { namespace: 'content' })

  registry.registerAction('listPosts', async (_data: unknown, _ctx: PandaContext) => {
    return { posts: store.list(true) }
  }, { namespace: 'content' })

  registry.registerAction('publishPost', async (data: unknown, _ctx: PandaContext) => {
    const slug = (data as { slug?: string }).slug ?? 'welcome'
    return { post: store.publish(slug) }
  }, { namespace: 'content' })
}
