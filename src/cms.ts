import { buildRuntime, assertValid, loadManifest, resolveEntity } from './bootstrap.js'

async function main() {
  const runtime = buildRuntime()
  const manifest = await loadManifest('manifests/cms.json')
  assertValid(manifest, runtime.registry)
  const { entity } = await resolveEntity(manifest, runtime.registry, 'app')
  const running = await entity.run(undefined as never) as { port: number; close: () => Promise<void> }

  process.on('SIGINT', async () => {
    await running.close()
    process.exit(0)
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
