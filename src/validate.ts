import { buildRuntime, assertValid, loadManifest } from './bootstrap.js'

async function main() {
  const runtime = await buildRuntime()
  for (const file of ['manifests/cms.json', 'manifests/web.json', 'manifests/cli.json']) {
    const manifest = await loadManifest(file)
    assertValid(manifest, runtime.registry)
    console.log(`Valid: ${file}`)
  }
  await runtime.repository.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
