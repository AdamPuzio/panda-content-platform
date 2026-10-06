# Panda Content Platform Roadmap

This document describes what the content platform can become and which features best demonstrate the Panda programming model. It is intentionally broader than a conventional product backlog: each feature should improve the application while also proving a distinct composition pattern.

The project is a reference application, not a finished production CMS. Features should be built in small vertical slices, verified against the real application, and documented when they introduce a new Panda pattern.

## Current Baseline

The application currently includes:

- An Express-backed public web application.
- A separate Express-backed CMS application.
- A CLI using `@panda/command`.
- A reusable CMS module with a `panda.manifest.json` and exported Express host.
- Cross-module route contributions using `contributesTo`.
- MongoDB-backed content persistence through an application-owned repository.
- React and Material UI CMS administration.
- Simple session authentication with `admin`, `editor`, and `viewer` roles.
- Draft creation, draft editing, and publishing.
- Rich post fields and draft/review/published/archived lifecycle transitions.
- A separate `@panda/content-seo` module with persisted SEO metadata and public page integration.
- Manifest validation through `paws`/kernel validation APIs.
- Environment-based MongoDB and CMS credential configuration.

The current implementation is deliberately small. It proves the architecture with real processes and real HTTP calls without pretending to be production-ready identity, media, search, or deployment infrastructure.

## Guiding Principles

### Build Vertical Slices

Each feature should be usable end to end before moving to the next one:

1. Define the domain behavior.
2. Add or update the repository/API boundary.
3. Add the manifest and Panda registrations.
4. Add the web, admin, or CLI surface.
5. Verify the flow against MongoDB and real HTTP requests.
6. Document the new composition pattern.

### Keep Dependencies Out Of Kernel

External dependencies belong to this application or to an application-owned adapter package. Do not add MongoDB, Express, React, Material UI, authentication providers, storage SDKs, or other product dependencies to `@panda/kernel` without explicit architectural approval.

### Prefer Composable Boundaries

When a feature can be represented as a replaceable subsystem, give it a clear boundary:

- Repository instead of route handlers directly querying MongoDB.
- Middleware contribution instead of authentication logic embedded in every route.
- Module instead of a copied set of entities.
- Named action instead of a function embedded in a manifest.
- Service or resource entity instead of a global singleton.

### Separate Reference Code From Production Claims

The simple in-memory session map is useful for demonstrating authentication, but it is not a production session system. Each feature should call out what is illustrative and what is safe to carry forward.

## Priority 1: Make The CMS Useful

### 1. Rich Post Editing

Expand the current title-only editor into a content editor with:

- Slug
- Title
- Summary
- Body content
- Status
- Publish date
- Updated date
- Author
- Featured image reference

Suggested model:

```text
Post
├── slug
├── title
├── summary
├── body
├── status
├── authorId
├── publishedAt
└── updatedAt
```

Panda demonstration:

- Keep persistence in `MongoContentRepository`.
- Keep business rules in named content actions.
- Keep the UI as a client of authenticated CMS routes.
- Use manifest-defined route entities for the API surface.

### 2. Draft Lifecycle

Add explicit state transitions:

- Draft
- In review
- Scheduled
- Published
- Archived

Add actions for:

- Save draft
- Submit for review
- Approve
- Schedule
- Publish
- Unpublish
- Archive

The repository should enforce valid transitions instead of allowing any route to mutate `status` directly.

### 3. Admin Navigation And Layout

Turn the current dashboard into a small admin shell:

- Overview
- Posts
- Media
- Users
- Settings
- Audit log

Use route-level authorization and role-aware navigation so viewers do not see controls they cannot use.

### 4. Form Validation And Error States

Add client and server validation for:

- Required title
- Slug format
- Slug uniqueness
- Body length
- Valid status transitions
- Publish requirements

The server remains authoritative. The Material UI form should provide immediate feedback, while the API returns structured validation errors suitable for field-level display.

## Priority 2: Strengthen Identity And Authorization

### 5. Multiple Local Users

Replace the single environment-configured user with MongoDB-backed users:

- Username or email
- Password hash
- Role
- Active state
- Display name
- Last login

Never store plaintext passwords. Use a vetted password hashing library and keep secrets out of source and manifests.

### 6. Role-Based Permissions

Move from the current three broad roles to explicit permissions:

```text
posts:read
posts:create
posts:edit
posts:submit
posts:publish
posts:archive
media:manage
users:manage
audit:read
```

Suggested default role mappings:

| Role | Capabilities |
|---|---|
| `admin` | All permissions |
| `editor` | Create, edit, submit, publish, read |
| `author` | Create, edit own drafts, read |
| `reviewer` | Read, submit, approve |
| `viewer` | Read only |

Panda demonstration:

- Authorization as reusable middleware contributions.
- Permission policy as a service available through `ctx.services`.
- Route metadata describing required permissions.

### 7. Real Session Management

Replace the process-local session map with one of:

- MongoDB session collection.
- A dedicated session store.
- An external identity provider.

Add:

- Session expiration.
- Session rotation after login.
- Logout-all-sessions.
- CSRF protection for cookie-authenticated mutations.
- Rate limits on login.
- Security event logging.

## Priority 3: Demonstrate Panda Plugins

### 8. SEO Plugin

Create a separate package such as `packages/seo-plugin` or a dedicated public repo. It should contribute:

- SEO fields to content metadata.
- Admin SEO panel.
- API endpoints for SEO analysis.
- CLI command such as `content seo check`.
- Sitemap metadata.

This demonstrates a real independently-developed plugin rather than another route copied into the CMS.

### 9. Redirects Plugin

Add a plugin that contributes:

- Redirect storage.
- Public redirect middleware.
- Admin redirect management.
- CLI import/export.

This is a good middleware contribution example because it changes request behavior before a route handler runs.

### 10. Analytics Plugin

Add a plugin with:

- Page-view events.
- Admin analytics summary.
- A pluggable event sink.
- CLI reporting.

The first implementation can use MongoDB. Later, another event sink can prove the subsystem is replaceable.

### 11. Webhook Plugin

Add outbound webhooks for content events:

- `post.created`
- `post.updated`
- `post.published`
- `post.archived`

Add:

- Webhook registration.
- Delivery retries.
- Signature verification.
- Delivery history.
- Admin replay controls.

Panda demonstration:

- Event-producing actions remain independent of delivery implementation.
- Webhook delivery can be a stateful resource or task pipeline.
- Retry behavior belongs in a task-oriented subsystem rather than route code.

## Priority 4: Media And Delivery

### 12. Media Library

Add media metadata management:

- File name
- MIME type
- Size
- Dimensions
- Alt text
- Caption
- Storage key
- Upload state

Start with metadata and a local storage adapter before adding cloud storage.

### 13. Storage Adapter Boundary

Define a storage interface with implementations such as:

```text
panda:local-storage
panda:s3-storage
panda:r2-storage
```

The content application should use a stable storage capability while the manifest selects the implementation.

Do not add cloud SDK dependencies to the kernel. Keep them in adapter packages or the application package that uses them.

### 14. Image Processing Pipeline

Add an asynchronous media pipeline:

1. Upload original.
2. Record metadata.
3. Generate thumbnails.
4. Generate responsive sizes.
5. Extract dimensions and metadata.
6. Mark processing complete.

This is a useful place to demonstrate task composition and retry behavior.

## Priority 5: Public Web Experience

### 15. Post Detail Pages

Add public routes:

```text
GET /posts/:slug
GET /preview/posts/:slug
```

Separate published content from preview content. Preview should require authentication or a signed preview token.

### 16. Search

Start with MongoDB text search or a simple indexed query. Later add a replaceable search adapter:

```text
panda:search
panda:mongodb-search
panda:meilisearch
panda:opensearch
```

The CMS, CLI, and web app should consume a stable search service rather than importing a search client directly.

### 17. Multiple Web Flavors

Create multiple applications from the same CMS module:

- Public website.
- Documentation site.
- Preview site.
- Partner portal.
- Internal admin portal.

Each application should consume the same content module but contribute different routes, middleware, and presentation behavior.

## Priority 6: CLI And Operations

### 18. Expand CLI Commands

Add:

```text
content posts list
content posts create
content posts edit
content posts publish
content posts archive
content media list
content media import
content users list
content audit list
content validate
content export
```

Keep the CLI manifest-driven while using application-owned registration code for real argument parsing and domain actions.

### 19. Task Pipelines

Use `@panda/task` for composite workflows:

```text
content export
├── validate content
├── query published posts
├── generate JSON export
└── write export archive
```

```text
content deploy
├── validate manifests
├── run content checks
├── generate sitemap
├── build web assets
└── publish deployment artifact
```

### 20. Scheduled Publishing Worker

Add a worker that finds scheduled posts and publishes them. This will demonstrate a lifecycle shape different from:

- One-shot CLI command.
- Long-running Express host.
- Stateful MongoDB resource.

It should have explicit startup, polling, error handling, and shutdown behavior.

### 21. Health And Readiness

Add:

```text
GET /health
GET /ready
```

Distinguish:

- Process is alive.
- MongoDB is reachable.
- Required modules initialized.
- Application is ready to serve traffic.

## Priority 7: Auditability And Reliability

### 22. Audit Log

Record:

- Login and logout.
- Failed login.
- Post created.
- Post edited.
- Post published.
- Post archived.
- Permission denied.

Expose the audit log through an admin screen and CLI command.

### 23. Structured Logging And Trace

Use:

- `@panda/logger` for structured application events.
- `@panda/trace` for opt-in development diagnostics.

Add request IDs and include them in logs, audit records, and error responses.

### 24. Integration Test Harness

Build a reusable test harness that can:

- Start a manifest-resolved Express host on an ephemeral port.
- Connect to a disposable MongoDB database.
- Authenticate as each role.
- Exercise contributed routes.
- Verify persistence across process boundaries.
- Close all resources cleanly.

This should eventually become a reusable example/testing package rather than repeated shell commands.

### 25. Error Handling And Observability

Add:

- Consistent API error envelopes.
- Request validation errors.
- Error middleware contributions.
- Structured error logs.
- Admin-visible operation failures.
- Retryable versus permanent failure classification.

## Suggested Build Sequence

The recommended order is:

1. Rich post fields and structured editing.
2. Full draft lifecycle and validation.
3. Persistent users and password hashing.
4. Fine-grained permissions.
5. Persistent sessions and CSRF protection.
6. Audit log.
7. SEO plugin.
8. Redirects plugin.
9. Media library and storage adapter.
10. Public post detail and preview.
11. CLI task pipelines.
12. Scheduled publishing worker.
13. Integration test harness.

This sequence makes the product more useful while progressively demonstrating:

- Panda entities.
- `uses` dependencies.
- `contributesTo` plugins.
- `panda:module` reuse.
- External-library adapters.
- Stateful resources.
- Long-running services.
- One-shot task pipelines.
- Replaceable storage and search subsystems.

## Production Hardening Checklist

Before treating this as a production application, address at least:

- Replace environment-configured single-user auth.
- Hash passwords with a vetted library.
- Use persistent sessions or an identity provider.
- Add CSRF protection for cookie-authenticated mutations.
- Add rate limiting and login lockout.
- Add request body limits and input validation.
- Add structured logging and audit events.
- Add database indexes and migration/versioning strategy.
- Add backups and restore testing.
- Add health/readiness checks.
- Add automated integration tests.
- Add secure secret management.
- Add deployment-specific cookie, CORS, and proxy configuration.

## Definition Of Done For A Feature

A feature is complete when:

- The domain behavior works through a real API or CLI flow.
- The persistence boundary is tested against MongoDB.
- Authorization is enforced on the server, not only hidden in the UI.
- The feature has a manifest or registration boundary where appropriate.
- Type-checking and the admin client build pass.
- A fresh clone can follow the documented setup.
- The README or this roadmap explains the new Panda composition pattern.
