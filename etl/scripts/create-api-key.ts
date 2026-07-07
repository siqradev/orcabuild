// scripts/create-api-key.ts
import 'dotenv/config'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/infra/database/prisma'

async function main() {
  const rawKey = crypto.randomBytes(32).toString('hex') // 64 chars hex
  const prefix = rawKey.slice(0, 8)   // público — usado no lookup
  const secret = rawKey.slice(8)      // parte que vai pro hash

  const hash = await bcrypt.hash(secret, 12)

  const created = await prisma.apiKey.create({
    data: {
      keyPrefix: prefix,
      hash,
      owner: 'Administrador',
      active: true,
    },
  })

  console.log('\n🔐 API KEY GERADA — guarde, não será exibida novamente:')
  console.log(rawKey)
  console.log('\nID:', created.id)
  console.log('Prefix:', created.keyPrefix)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())