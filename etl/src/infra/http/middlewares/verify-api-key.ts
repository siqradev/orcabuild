//src/infra/middlewares/verify-api-key.ts
import crypto from 'node:crypto'
import { FastifyReply, FastifyRequest } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma } from '../../database/prisma'

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  const len  = Math.max(bufA.length, bufB.length)
  const padA = Buffer.concat([bufA, Buffer.alloc(len - bufA.length)])
  const padB = Buffer.concat([bufB, Buffer.alloc(len - bufB.length)])
  return crypto.timingSafeEqual(padA, padB) && bufA.length === bufB.length
}

export async function verifyApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const apiKey = request.headers['x-api-key'] as string | undefined

  if (!apiKey) {
    return reply.status(401).send({
      error: 'API Key ausente. Forneça o header x-api-key.',
    })
  }

  const masterKey = process.env.MASTER_API_KEY
  if (masterKey && safeCompare(apiKey, masterKey)) {
    request.log.info({ auth: 'master' }, '[AUTH] master key usada')
    return
  }

  if (apiKey.length < 8 || !/^[a-f0-9]+$/i.test(apiKey)) {
    return reply.status(403).send({ error: 'API Key inválida.' })
  }

  try {
    const prefix = apiKey.slice(0, 8)
    const secret = apiKey.slice(8)

    const candidate = await prisma.apiKey.findFirst({
      where: { keyPrefix: prefix, active: true },
      select: { id: true, hash: true },  // owner removido — não vai pro log
    })

    if (!candidate) {
      return reply.status(403).send({ error: 'API Key inválida.' })
    }

    const valid = await bcrypt.compare(secret, candidate.hash)

    if (!valid) {
      return reply.status(403).send({ error: 'API Key inválida.' })
    }

    request.log.info({ auth: 'apikey', keyId: candidate.id }, '[AUTH] key autorizada')
    return // explícito — sem ambiguidade para quem mantém depois
  } catch (error) {
    request.log.error({ err: error }, '[AUTH] erro ao verificar chave')
    return reply.status(500).send({ error: 'Erro interno na autenticação.' })
  }
}