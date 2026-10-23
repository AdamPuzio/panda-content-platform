import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { MongoClient, type Collection, type Db } from 'mongodb'
import type { CmsRole } from './auth.js'

interface UserDocument {
  username: string
  passwordHash: string
  role: CmsRole
  active: boolean
  createdAt: string
}

export interface CmsUser {
  username: string
  role: CmsRole
  active: boolean
  createdAt: string
}

export interface AuditEvent {
  event: string
  username?: string
  role?: CmsRole
  target?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export class CmsIdentityStore {
  private readonly users: Collection<UserDocument>
  private readonly audit: Collection<AuditEvent>

  constructor(private readonly client: MongoClient, database: string) {
    const db: Db = client.db(database)
    this.users = db.collection<UserDocument>('cms_users')
    this.audit = db.collection<AuditEvent>('cms_audit')
  }

  async initialize(): Promise<void> {
    const credentials = {
      username: process.env.CMS_ADMIN_USER ?? 'admin',
      password: process.env.CMS_ADMIN_PASSWORD ?? 'panda-local',
      role: (process.env.CMS_ADMIN_ROLE ?? 'admin') as CmsRole,
    }
    if (await this.users.countDocuments() === 0) {
      await this.users.insertOne({
        username: credentials.username,
        passwordHash: hashPassword(credentials.password),
        role: credentials.role,
        active: true,
        createdAt: new Date().toISOString(),
      })
    }
  }

  async authenticate(username: string, password: string): Promise<{ username: string; role: CmsRole } | null> {
    const user = await this.users.findOne({ username, active: true })
    if (!user || !verifyPassword(password, user.passwordHash)) return null
    return { username: user.username, role: user.role }
  }

  async listUsers(): Promise<CmsUser[]> {
    return this.users.find({}, { projection: { _id: 0, username: 1, role: 1, active: 1, createdAt: 1 } }).sort({ username: 1 }).toArray()
  }

  async createUser(input: { username: string; password: string; role: CmsRole }): Promise<CmsUser> {
    const username = input.username.trim().toLowerCase()
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) throw new Error('Username must be 3-32 lowercase letters, numbers, dots, underscores, or hyphens')
    if (input.password.length < 10) throw new Error('Password must be at least 10 characters')
    const user: UserDocument = { username, passwordHash: hashPassword(input.password), role: input.role, active: true, createdAt: new Date().toISOString() }
    try { await this.users.insertOne(user) } catch (error) { if ((error as { code?: number }).code === 11000) throw new Error('Username already exists'); throw error }
    return { username: user.username, role: user.role, active: user.active, createdAt: user.createdAt }
  }

  async updateUser(username: string, input: { role?: CmsRole; active?: boolean }): Promise<CmsUser> {
    const update: Partial<Pick<UserDocument, 'role' | 'active'>> = {}
    if (input.role !== undefined) update.role = input.role
    if (input.active !== undefined) update.active = input.active
    const result = await this.users.findOneAndUpdate({ username }, { $set: update }, { returnDocument: 'after', projection: { _id: 0, username: 1, role: 1, active: 1, createdAt: 1 } })
    if (!result) throw new Error('User does not exist')
    return result
  }

  async resetPassword(username: string, password: string): Promise<void> {
    if (password.length < 10) throw new Error('Password must be at least 10 characters')
    const result = await this.users.updateOne({ username }, { $set: { passwordHash: hashPassword(password) } })
    if (result.matchedCount === 0) throw new Error('User does not exist')
  }

  async record(event: Omit<AuditEvent, 'createdAt'>): Promise<void> {
    await this.audit.insertOne({ ...event, createdAt: new Date().toISOString() })
  }

  async recent(limit = 20): Promise<AuditEvent[]> {
    return this.audit.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(limit).toArray()
  }
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password: string, encoded: string): boolean {
  const [salt, expectedHex] = encoded.split(':')
  if (!salt || !expectedHex) return false
  const actual = scryptSync(password, salt, 64)
  const expected = Buffer.from(expectedHex, 'hex')
  return expected.length === actual.length && timingSafeEqual(actual, expected)
}

export async function connectIdentityStore(client: MongoClient, database: string): Promise<CmsIdentityStore> {
  const store = new CmsIdentityStore(client, database)
  await store.initialize()
  return store
}
