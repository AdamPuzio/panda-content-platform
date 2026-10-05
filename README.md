# Panda Content Platform

A concrete Panda application composed from three parts:

- **Web app:** an Express application exposing public content routes.
- **CMS app:** a separate Express application that owns content-management routes.
- **CLI:** a Panda command application for listing and publishing content.
- **CMS admin:** a React + Material UI interface with login, authenticated post listing, and publish actions.
- **Persistence:** MongoDB-backed content storage through an application-owned repository.

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

Start MongoDB for local development:

```bash
docker run --rm -d --name panda-content-mongo -p 27420:27017 mongo:8
export MONGODB_URL=mongodb://127.0.0.1:27420
export MONGODB_DATABASE=panda_content_platform
```

The application defaults to `mongodb://127.0.0.1:27017` and database `panda_content_platform`. Set `MONGODB_URL` and `MONGODB_DATABASE` explicitly for shared or production environments. The repository seeds two posts only when the `posts` collection is empty, so data persists across CMS and CLI process restarts.

Start the CMS:

```bash
npm run cms
```

The CMS admin interface is served at `http://localhost:4101/`. Local development credentials are `admin` / `panda-local`. Configure different credentials before starting the server:

```bash
CMS_ADMIN_USER=editor CMS_ADMIN_PASSWORD='use-a-local-secret' npm run cms
```

Set the configured user's role with `CMS_ADMIN_ROLE`: `admin`, `editor`, or `viewer`.

```bash
CMS_ADMIN_USER=editor CMS_ADMIN_PASSWORD='use-a-local-secret' CMS_ADMIN_ROLE=editor npm run cms
```

- `admin` and `editor` can publish posts.
- `viewer` can sign in and read the admin post list, but cannot publish.

In production, `CMS_ADMIN_USER` and `CMS_ADMIN_PASSWORD` are required; the development fallback is rejected when `NODE_ENV=production`. This is intentionally a simple in-memory session example, not a production identity system: sessions disappear when the process restarts, and credentials should eventually move to a real identity provider or secret manager.

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

The CLI uses the same MongoDB-backed repository as the web and CMS applications. The current kernel command proof entity forwards only a command name, so the CLI owns its positional argument parsing with the real `@panda/command` package while the manifest still defines and validates the available commands. The repository is application-owned and uses the real `mongodb` driver; `@panda/kernel` remains free of MongoDB dependencies.

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
admin/
├── src/App.tsx
├── src/main.tsx
└── vite.config.ts
manifests/
├── cli.json
└── web.json
```

The source is deliberately explicit. Read `src/bootstrap.ts` first, then the two manifests, then `src/panda-express.ts` to see how the external library is bound to Panda entities.
