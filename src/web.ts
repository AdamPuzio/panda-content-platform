import { buildRuntime, assertValid, loadManifest, resolveEntity } from './bootstrap.js'

async function main() {
  const runtime = buildRuntime()
  const manifest = await loadManifest('manifests/web.json')
  assertValid(manifest, runtime.registry)
  const { entity } = await resolveEntity(manifest, runtime.registry, 'cms')
  const module = entity as unknown as { getExport(name: string): { run(): Promise<{ port: number; close: () => Promise<void> }> } }
  const running = await module.getExport('app').run()

  process.on('SIGINT', async () => {
    await running.close()
    process.exit(0)
  })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
