# Panda Content Platform

A concrete Panda application composed from three parts:

- **Web app:** an Express application exposing public content routes.
- **CMS app:** a separate Express application that owns content-management routes.
- **CLI:** a Panda command application for listing and publishing content.

The project demonstrates the current Panda paradigm rather than hiding the composition in ordinary application code:

1. The CMS is a real npm package in `packages/cms` with a `panda.manifest.json` and an exported `panda:express` host.
2. The web manifest consumes the CMS through `panda:module` and contributes its public route into the CMS Express host with `contributesTo: "cms.app"`.
3. The CLI is a separate manifest that uses Panda commands and named actions against the same content actions.
4. All Express binding lives in the application-owned adapter at `src/panda-express.ts`; it is not added to `@panda/kernel`.

## Run It

This reference project currently uses local workspace packages because `@panda/kernel` and `@panda/command` are not published yet.

```bash
npm install
npm run build
npm run validate
```

Start the CMS:

```bash
npm run cms
```

In another terminal, start the web app:

```bash
npm run web
```

The web app listens on `http://localhost:4100` and the CMS listens on `http://localhost:4101`.

```bash
curl http://localhost:4100/
curl http://localhost:4100/api/posts
curl http://localhost:4101/admin/posts
```

Run the CLI:

```bash
npm run cli -- list
npm run cli -- publish welcome
```

The CLI uses the same content domain operation as the web and CMS applications. The current kernel command proof entity forwards only a command name, so the CLI owns its positional argument parsing with the real `@panda/command` package while the manifest still defines and validates the available commands. The in-memory store is intentional for this first reference project; replacing it with `panda:mongodb` is a later application exercise.

## Structure

```text
packages/cms/
├── package.json
└── panda.manifest.json
src/
├── actions.ts
├── bootstrap.ts
├── cli.ts
├── cms.ts
├── content-store.ts
├── panda-express.ts
├── validate.ts
└── web.ts
manifests/
├── cli.json
└── web.json
```

The source is deliberately explicit. Read `src/bootstrap.ts` first, then the two manifests, then `src/panda-express.ts` to see how the external library is bound to Panda entities.
