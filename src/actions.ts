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

  registry.registerAction('listPosts', async (_data: unknown, _ctx: PandaContext) => {
    return { posts: await repository.list(true) }
  }, { namespace: 'content' })

  registry.registerAction('publishPost', async (data: unknown, _ctx: PandaContext) => {
    const slug = (data as { slug?: string }).slug ?? 'welcome'
    return { post: await repository.publish(slug) }
  }, { namespace: 'content' })
}
