import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import type { JSONSchema, PandaContext, PandaEntityClass, PandaEntityInstance } from '@panda/kernel'
import type { PandaRegistry } from '@panda/kernel'

interface Contribution {
  kind: 'route' | 'middleware'
  apply(app: Express, registry: PandaRegistry, context: () => PandaContext | undefined): void
}

export function createExpressEntities(registry: PandaRegistry): {
  PandaExpressEntity: PandaEntityClass
  PandaExpressRouteEntity: PandaEntityClass
  PandaExpressMiddlewareEntity: PandaEntityClass
} {
  class PandaExpressEntity implements PandaEntityInstance {
    static readonly type = 'panda:express'
    static readonly longRunning = true
    static readonly configSchema: JSONSchema = {
      type: 'object',
      properties: { port: { type: 'number' } },
    }

    private app = express()
    private contributions: Contribution[] = []
    private context?: PandaContext
    private server?: ReturnType<Express['listen']>

    constructor(private config: Record<string, unknown>) {}

    registerContribution(contribution: Contribution): void {
      this.contributions.push(contribution)
    }

    async run(context: PandaContext): Promise<unknown> {
      this.context = context
      for (const contribution of this.contributions) {
        contribution.apply(this.app, registry, () => this.context)
      }

      const port = Number(this.config.port ?? 0)
      return new Promise((resolve, reject) => {
        this.server = this.app.listen(port, () => {
          context.services.log.info(`Express app listening on port ${port}`)
          resolve({
            port,
            close: () => new Promise<void>((closeResolve, closeReject) => {
              this.server?.close((error) => error ? closeReject(error) : closeResolve())
            }),
          })
        })
        this.server.on('error', reject)
      })
    }
  }

  class PandaExpressRouteEntity implements PandaEntityInstance {
    static readonly type = 'panda:express-route'
    static readonly configSchema: JSONSchema = {
      type: 'object',
      required: ['method', 'path', 'action'],
      properties: {
        method: { type: 'string' },
        path: { type: 'string' },
        action: { type: 'string', pandaActionRef: true },
      },
    }

    readonly kind = 'route' as const

    constructor(private config: Record<string, unknown>) {}

    async run(): Promise<unknown> {
      return this
    }

    apply(app: Express, registryRef: PandaRegistry, context: () => PandaContext | undefined): void {
      const method = String(this.config.method)
      const path = String(this.config.path)
      const actionName = String(this.config.action)
      const handler = (req: Request, res: Response) => {
        const currentContext = context()
        if (!currentContext) throw new Error('Route invoked before Express app started')
        return registryRef.resolveAction(actionName)({ req, res }, currentContext)
      }
      ;(app as unknown as Record<string, Function>)[method](path, handler)
    }
  }

  class PandaExpressMiddlewareEntity implements PandaEntityInstance {
    static readonly type = 'panda:express-middleware'
    static readonly configSchema: JSONSchema = {
      type: 'object',
      required: ['action'],
      properties: { action: { type: 'string', pandaActionRef: true } },
    }

    readonly kind = 'middleware' as const

    constructor(private config: Record<string, unknown>) {}

    async run(): Promise<unknown> {
      return this
    }

    apply(app: Express, registryRef: PandaRegistry, context: () => PandaContext | undefined): void {
      const actionName = String(this.config.action)
      app.use((req: Request, res: Response, next: NextFunction) => {
        const currentContext = context()
        if (!currentContext) return next(new Error('Middleware invoked before Express app started'))
        Promise.resolve(registryRef.resolveAction(actionName)({ req, res, next }, currentContext)).catch(next)
      })
    }
  }

  return { PandaExpressEntity, PandaExpressRouteEntity, PandaExpressMiddlewareEntity }
}
