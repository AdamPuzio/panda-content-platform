import { buildRuntime, assertValid, loadManifest, resolveEntity } from './bootstrap.js'
import { Command } from '@panda/command'

const listCommand = new Command({
  name: 'list',
  command: 'list',
  description: 'List all content, including drafts',
  action: async () => {
    const runtime = await buildRuntime()
    const manifest = await loadManifest('manifests/cli.json')
    assertValid(manifest, runtime.registry)
    const { entity } = await resolveEntity(manifest, runtime.registry, 'list')
    console.log(await entity.run(undefined as never))
    await runtime.repository.close()
  },
})

const publishCommand = new Command({
  name: 'publish',
  command: 'publish',
  description: 'Publish a post by slug',
  arguments: { name: 'slug', description: 'Post slug' },
  action: async (data: Record<string, unknown>) => {
    const runtime = await buildRuntime()
    const manifest = await loadManifest('manifests/cli.json')
    assertValid(manifest, runtime.registry)
    // The kernel's small proof command entity intentionally forwards only
    // the command name. The application owns argument parsing here with the
    // real @panda/command package, then applies the same domain operation
    // that the manifest's named action represents.
    const published = await runtime.repository.publish(String(data.slug))
    console.log({ post: published })
    await runtime.repository.close()
  },
})

new Command({
  name: 'content',
  command: 'content',
  description: 'Manage content in the Panda content platform',
  subcommands: [listCommand, publishCommand],
}).run().catch((error: Error) => {
  console.error(error.message)
  process.exit(1)
})
