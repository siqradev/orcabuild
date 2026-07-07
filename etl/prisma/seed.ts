import 'dotenv/config'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/infra/database/prisma'

async function main() {
  console.log('🚀 Iniciando seed...')

  // ─── Validação da variável de ambiente ──────────────────────────────────────
  const masterKeyRaw = process.env.MASTER_API_KEY
  if (!masterKeyRaw || masterKeyRaw.length < 16) {
    throw new Error(
      'SEED_MASTER_API_KEY não definida ou muito curta. ' +
      'Defina no .env com no mínimo 16 caracteres hex.'
    )
  }

  // ─── Deriva prefix + hash conforme contrato do verify-api-key.ts ────────────
  const prefix = masterKeyRaw.slice(0, 8)
  const secret = masterKeyRaw.slice(8)
  const hash   = await bcrypt.hash(secret, 12)

  // ─── Upsert por keyPrefix — idempotente, seguro rodar múltiplas vezes ───────
  const apiKey = await prisma.apiKey.upsert({
    where:  { keyPrefix: prefix },
    update: { hash, active: true },           // rotaciona hash se a key mudou
    create: { keyPrefix: prefix, hash, owner: 'Administrador', active: true },
  })

  // Só metadados não-sensíveis no log
  console.log('✅ API Key registrada')
  console.log('   ID:     ', apiKey.id)
  console.log('   Prefix: ', apiKey.keyPrefix)
  console.log('\nUso: x-api-key: <valor de SEED_MASTER_API_KEY no .env>')
}

main()
  .catch((error) => {
    console.error('❌ Seed falhou:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())