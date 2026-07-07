//main.ts
import 'dotenv/config'
import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import cors from '@fastify/cors'

import { verifyApiKey } from './src/infra/http/middlewares/verify-api-key'
import { routes } from './src/infra/http/routes'

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
  },
  connectionTimeout: 300_000,
})

// ─── Plugins ──────────────────────────────────────────────────────────────────

app.register(cors, {
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key'],
  credentials: true,
})

app.register(multipart, {
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 1,
  },
})

// ─── Autenticação global ──────────────────────────────────────────────────────

app.addHook('preHandler', async (request, reply) => {
  // Deixa o CORS tratar as requisições OPTIONS
  if (request.method === 'OPTIONS') return
  if ((request.routeOptions?.config as any)?.skipAuth) return
  return verifyApiKey(request, reply)
})

// ─── Rotas ────────────────────────────────────────────────────────────────────

app.register(routes)

// ─── Handler de erros ────────────────────────────────────────────────────────

app.setErrorHandler((error: any, _request, reply) => {
  app.log.error(error)
  reply.status(error.statusCode ?? 500).send({
    error: error.message ?? 'Erro interno no servidor.',
  })
})

// ─── Start ────────────────────────────────────────────────────────────────────

const start = async () => {
  try {
    const port = Number(process.env.PORT ?? 3001)
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 API OrcaBuild Pro rodando em http://localhost:${port}`)
  } catch (err: any) {
    app.log.error(err)
    process.exit(1)
  }
}

start()