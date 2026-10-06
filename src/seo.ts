import type { JSONSchema, PandaEntityClass, PandaEntityInstance } from '@panda/kernel'

export interface SeoConfig { siteName: string; siteDescription: string }

export function createSeoEntity(): PandaEntityClass {
  class PandaSeoEntity implements PandaEntityInstance {
    static readonly type = 'panda:seo-config'
    static readonly configSchema: JSONSchema = { type: 'object', required: ['siteName', 'siteDescription'], properties: { siteName: { type: 'string' }, siteDescription: { type: 'string' } } }
    constructor(private config: Record<string, unknown>) {}
    getConfig(): SeoConfig { return { siteName: String(this.config.siteName), siteDescription: String(this.config.siteDescription) } }
    async run(): Promise<SeoConfig> { return this.getConfig() }
  }
  return PandaSeoEntity
}
