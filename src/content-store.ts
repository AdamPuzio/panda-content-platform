import { MongoClient, type Collection, type Db } from 'mongodb'

export interface Post {
  slug: string
  title: string
  summary: string
  body: string
  author: string
  status: 'draft' | 'review' | 'published' | 'archived'
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

interface PostDocument extends Post {
  _id?: unknown
}

export class MongoContentRepository {
  private readonly collection: Collection<PostDocument>

  constructor(private readonly client: MongoClient, database: string) {
    const db: Db = client.db(database)
    this.collection = db.collection<PostDocument>('posts')
  }

  async initialize(): Promise<void> {
    const now = new Date().toISOString()
    await this.collection.updateMany({ summary: { $exists: false } }, { $set: { summary: '' } })
    await this.collection.updateMany({ body: { $exists: false } }, { $set: { body: '' } })
    await this.collection.updateMany({ author: { $exists: false } }, { $set: { author: 'admin' } })
    await this.collection.updateMany({ createdAt: { $exists: false } }, { $set: { createdAt: now } })
    await this.collection.updateMany({ updatedAt: { $exists: false } }, { $set: { updatedAt: now } })
    if (await this.collection.countDocuments() > 0) return
    await this.collection.insertMany([
      { slug: 'welcome', title: 'Welcome to Panda', summary: 'A first look at the Panda content platform.', body: 'Panda composes applications from manifests, entities, and named actions.', author: 'admin', status: 'published', createdAt: now, updatedAt: now, publishedAt: now },
      { slug: 'draft-roadmap', title: 'The Roadmap', summary: 'What we are building next.', body: 'This draft will become a real editorial workflow.', author: 'admin', status: 'draft', createdAt: now, updatedAt: now },
    ])
  }

  async list(includeDrafts = false): Promise<Post[]> {
    const filter = includeDrafts ? {} : { status: 'published' as const }
    return this.collection.find(filter, { projection: { _id: 0 } }).sort({ slug: 1 }).toArray()
  }

  async getPublished(slug: string): Promise<Post | null> {
    return this.collection.findOne({ slug, status: 'published' }, { projection: { _id: 0 } })
  }

  async summary(): Promise<{ total: number; published: number; drafts: number; posts: Post[] }> {
    const [posts, published, drafts] = await Promise.all([
      this.list(true),
      this.collection.countDocuments({ status: 'published' }),
      this.collection.countDocuments({ status: { $in: ['draft', 'review'] } }),
    ])
    return { total: posts.length, published, drafts, posts: posts.slice(0, 8) }
  }

  async transition(slug: string, target: Post['status']): Promise<Post> {
    const current = await this.collection.findOne({ slug })
    if (!current) throw new Error(`Post "${slug}" does not exist`)
    const allowed: Record<Post['status'], Post['status'][]> = {
      draft: ['review', 'published'],
      review: ['draft', 'published'],
      published: ['archived', 'draft'],
      archived: ['draft'],
    }
    if (!allowed[current.status]?.includes(target)) {
      throw new Error(`Cannot move post from ${current.status} to ${target}`)
    }
    const now = new Date().toISOString()
    const result = await this.collection.findOneAndUpdate(
      { slug, status: current.status },
      { $set: { status: target, updatedAt: now, ...(target === 'published' ? { publishedAt: now } : {}) } },
      { returnDocument: 'after', projection: { _id: 0 } },
    )
    if (!result) throw new Error(`Post "${slug}" does not exist`)
    return result
  }

  async saveDraft(input: { slug: string; title: string; summary: string; body: string; author: string }): Promise<Post> {
    const slug = input.slug.trim().toLowerCase()
    const title = input.title.trim()
    const summary = input.summary.trim()
    const body = input.body.trim()
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error('Slug must contain lowercase letters, numbers, and hyphens')
    }
    if (!title) throw new Error('Title is required')
    if (!summary) throw new Error('Summary is required')
    if (!body) throw new Error('Body is required')
    const now = new Date().toISOString()
    const result = await this.collection.findOneAndUpdate(
      { slug },
      { $set: { title, summary, body, author: input.author.trim() || 'admin', status: 'draft', updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true, returnDocument: 'after', projection: { _id: 0 } },
    )
    if (!result) throw new Error('Unable to save draft')
    return result
  }

  async close(): Promise<void> {
    await this.client.close()
  }
}

export async function connectContentRepository(): Promise<MongoContentRepository> {
  const client = new MongoClient(process.env.MONGODB_URL ?? 'mongodb://127.0.0.1:27017')
  await client.connect()
  const repository = new MongoContentRepository(client, process.env.MONGODB_DATABASE ?? 'panda_content_platform')
  await repository.initialize()
  return repository
}
