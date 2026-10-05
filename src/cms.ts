import { buildRuntime, assertValid, loadManifest, resolveEntity } from './bootstrap.js'
import { registerCmsRoutes } from './cms-routes.js'
import cookieParser from 'cookie-parser'
import express from 'express'
import { resolve as resolvePath } from 'node:path'

async function main() {
  const runtime = buildRuntime()
  const manifest = await loadManifest('manifests/cms.json')
  assertValid(manifest, runtime.registry)
  const { entity } = await resolveEntity(manifest, runtime.registry, 'cms')
  const appHost = (entity as unknown as { getExport(name: string): { app: import('express').Express; run(ctx: never): Promise<unknown> } }).getExport('app')
  const app = appHost.app
  app.use(cookieParser())
  app.use(express.static(resolvePath(process.cwd(), 'dist/admin')))
  registerCmsRoutes(app, runtime.store)
  const running = await appHost.run(undefined as never) as { port: number; close: () => Promise<void> }

  process.on('SIGINT', async () => {
    await running.close()
    process.exit(0)
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
