import { MongoClient, type Collection, type Db } from 'mongodb'

export interface Post {
  slug: string
  title: string
  status: 'draft' | 'published'
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
    if (await this.collection.countDocuments() > 0) return
    await this.collection.insertMany([
      { slug: 'welcome', title: 'Welcome to Panda', status: 'published' },
      { slug: 'draft-roadmap', title: 'The Roadmap', status: 'draft' },
    ])
  }

  async list(includeDrafts = false): Promise<Post[]> {
    const filter = includeDrafts ? {} : { status: 'published' as const }
    return this.collection.find(filter, { projection: { _id: 0 } }).sort({ slug: 1 }).toArray()
  }

  async summary(): Promise<{ total: number; published: number; drafts: number; posts: Post[] }> {
    const [posts, published, drafts] = await Promise.all([
      this.list(true),
      this.collection.countDocuments({ status: 'published' }),
      this.collection.countDocuments({ status: 'draft' }),
    ])
    return { total: posts.length, published, drafts, posts: posts.slice(0, 8) }
  }

  async publish(slug: string): Promise<Post> {
    const result = await this.collection.findOneAndUpdate(
      { slug },
      { $set: { status: 'published' } },
      { returnDocument: 'after', projection: { _id: 0 } },
    )
    if (!result) throw new Error(`Post "${slug}" does not exist`)
    return result
  }

  async saveDraft(input: { slug: string; title: string }): Promise<Post> {
    const slug = input.slug.trim().toLowerCase()
    const title = input.title.trim()
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error('Slug must contain lowercase letters, numbers, and hyphens')
    }
    if (!title) throw new Error('Title is required')
    const result = await this.collection.findOneAndUpdate(
      { slug },
      { $set: { title, status: 'draft' } },
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
