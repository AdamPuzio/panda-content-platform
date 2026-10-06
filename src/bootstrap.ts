import { readFile } from 'node:fs/promises'
import { resolve as resolvePath } from 'node:path'
import {
  PandaRegistry,
  createCommandEntity,
  createModuleEntity,
  PandaCliEntity,
  PandaLoggerEntity,
  resolve,
  validate,
} from '@panda/kernel'
import type { PandaManifest, PandaEntityInstance } from '@panda/kernel'
import { connectContentRepository, type MongoContentRepository } from './content-store.js'
import { registerContentActions } from './actions.js'
import { createExpressEntities } from './panda-express.js'
import { createSeoEntity } from './seo.js'
import { connectIdentityStore, type CmsIdentityStore } from './identity-store.js'

export interface AppRuntime {
  registry: PandaRegistry
  repository: MongoContentRepository
  identity: CmsIdentityStore
}

export async function buildRuntime(): Promise<AppRuntime> {
  const registry = new PandaRegistry()
  const repository = await connectContentRepository()
  const identity = await connectIdentityStore(repository.client, process.env.MONGODB_DATABASE ?? 'panda_content_platform')
  const expressEntities = createExpressEntities(registry)

  registry.registerEntity(createCommandEntity(registry))
  registry.registerEntity(createModuleEntity(registry))
  registry.registerEntity(PandaCliEntity)
  registry.registerEntity(PandaLoggerEntity)
  registry.registerEntity(expressEntities.PandaExpressEntity)
  registry.registerEntity(expressEntities.PandaExpressRouteEntity)
  registry.registerEntity(expressEntities.PandaExpressMiddlewareEntity)
  registry.registerEntity(createSeoEntity())
  registry.registerService('log', () => ({
    log: (message: string) => console.log(message),
    info: (message: string) => console.log(`INFO: ${message}`),
    error: (message: string) => console.error(`ERROR: ${message}`),
  }))
  registerContentActions(registry, repository)

  return { registry, repository, identity }
}

export async function loadManifest(file: string): Promise<PandaManifest> {
  return JSON.parse(await readFile(resolvePath(process.cwd(), file), 'utf8')) as PandaManifest
}

export function assertValid(manifest: PandaManifest, registry: PandaRegistry): void {
  const result = validate(manifest, registry)
  if (result.valid) return
  throw new Error(result.diagnostics.map((diagnostic) => diagnostic.message).join('\n'))
}

export async function resolveEntity(
  manifest: PandaManifest,
  registry: PandaRegistry,
  key: string,
): Promise<{ instances: Record<string, PandaEntityInstance>; entity: PandaEntityInstance }> {
  const instances = await resolve(manifest, registry)
  const entity = instances[key]
  if (!entity) throw new Error(`Manifest does not contain entity "${key}"`)
  return { instances, entity }
}
