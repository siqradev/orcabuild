# api_orcamento_pro

API REST para extração, tratamento e consulta de tabelas públicas de custos referenciais de engenharia civil.

Processa **SINAPI** (automático) e **SEINFRA-CE** (manual), disponibilizando insumos, composições e relações analíticas via endpoints REST.

---

## Requisitos

- Node.js v22+
- Python 3.10+ com virtualenv
- PostgreSQL 14+
- Yarn

---

## Instalação

```bash
# 1. Clonar e instalar dependências Node.js
git clone <repo>
cd api-orcamento-pro
yarn install

# 2. Criar e ativar virtualenv Python
python3 -m venv .venv
source .venv/bin/activate

# 3. Instalar dependências Python
pip install pandas openpyxl xlrd playwright requests

# 4. Instalar browsers do Playwright (necessário para scraper SINAPI)
playwright install chromium

# 5. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com DATABASE_URL e MASTER_API_KEY

# 6. Rodar migrations
npx prisma migrate dev

# 7. Gerar Prisma Client
npx prisma generate

# 8. Criar API Key inicial
npx tsx scripts/create-api-key.ts
```

---

## Variáveis de Ambiente

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://usuario:senha@localhost:5432/api_orcamento_pro
MASTER_API_KEY=<64 chars hex gerado pelo script>
BCRYPT_ROUNDS=12
IMPORT_CHUNK_SIZE=500
COMPOSITION_CHUNK_SIZE=300
TEMP_DIR=./temp
LOG_LEVEL=info
```

---

## Rodando o projeto

```bash
# Desenvolvimento (hot reload)
yarn dev

# Produção
node --import tsx main.ts
```

Servidor sobe em `http://localhost:3000`.

---

## Autenticação

Todas as rotas (exceto `/health`) exigem o header:

```
x-api-key: <sua-api-key>
```

Para gerar uma nova key:

```bash
npx tsx scripts/create-api-key.ts
```

A key é exibida **uma única vez**. Guarde imediatamente.

---

## Rotas

### Health (pública)

```
GET /health
```

### Itens

```
GET /items
  ?page=1&limit=20&type=INSUMO&source=SINAPI&state=CE&year=2026&tableId=<uuid>

GET /items/search
  ?q=cimento&source=SINAPI&tableType=ONERADA

GET /items/:code
  ?tableId=<uuid>
```

### Importação

```
POST /import
Body: { "state": "CE", "month": 3, "year": 2026 }

POST /import/seinfra
Body: {
  "version": "028",
  "insumos": "/caminho/Tabela-de-Insumos-028.xls",
  "planos": "/caminho/Planos-de-Servicos-028.xls",
  "composicoes": "/caminho/Composicoes-028.xls"
}

GET /import/jobs
GET /import/jobs/:id
```

### Composições

```
GET /compositions/:code/resolve
  ?tableId=<uuid>&qty=1

GET /compositions/:code/children
  ?tableId=<uuid>

GET /compositions/:code/parents
  ?tableId=<uuid>
```

---

## Importando SINAPI

```bash
curl -X POST http://localhost:3000/import \
  -H "x-api-key: <sua-key>" \
  -H "Content-Type: application/json" \
  -d '{"state": "CE", "month": 3, "year": 2026}'
```

O scraper acessa o portal da CAIXA automaticamente, faz o download do ZIP e processa o XLSX. Tempo estimado: ~47 segundos para CE.

---

## Importando SEINFRA

Faça o download manual dos arquivos em:
- Onerada: https://sin.seinfra.ce.gov.br/site-seinfra/siproce/onerada/html/tabela-seinfra.html
- Desonerada: https://sin.seinfra.ce.gov.br/site-seinfra/siproce/desonerada/html/tabela-seinfra.html

Coloque os arquivos na pasta `temp/` e faça o request:

```bash
# ONERADA (028)
curl -X POST http://localhost:3000/import/seinfra \
  -H "x-api-key: <sua-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "028",
    "insumos": "/caminho/temp/SEINFRA_028_insumos.xls",
    "planos": "/caminho/temp/SEINFRA_028_planos.xls",
    "composicoes": "/caminho/temp/SEINFRA_028_composicoes.xls"
  }'

# DESONERADA (028.1)
curl -X POST http://localhost:3000/import/seinfra \
  -H "x-api-key: <sua-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "028.1",
    "insumos": "/caminho/temp/SEINFRA_028_1_insumos.xls",
    "planos": "/caminho/temp/SEINFRA_028_1_planos.xls",
    "composicoes": "/caminho/temp/SEINFRA_028_1_composicoes.xls"
  }'
```

Tempo estimado: ~17 segundos por versão.

---

## Volumes de dados (referência CE — Maio/2026)

| Fonte | Itens | Composições |
|---|---|---|
| SINAPI 03/2026 ONERADA | 11.218 | 39.557 |
| SINAPI 03/2026 DESONERADA | 11.218 | 39.557 |
| SEINFRA 028 ONERADA | 20.539 | 23.113 |
| SEINFRA 028.1 DESONERADA | 20.539 | 23.113 |

---

## Monitorar jobs

```bash
curl http://localhost:3000/import/jobs \
  -H "x-api-key: <sua-key>"
```

---

## Banco de dados

```bash
# Abrir Prisma Studio (interface visual)
npx prisma studio

# Criar nova migration após alterar schema
npx prisma migrate dev --name descricao_da_mudanca

# Resetar banco (desenvolvimento)
npx prisma migrate reset
```

---

## Estrutura resumida

```
src/
├── application/use-cases/   # Orquestração (sem Prisma, sem HTTP)
├── domain/                  # DTOs, interfaces, contratos
├── infra/
│   ├── database/            # Repositórios Prisma
│   └── http/                # Controllers, middlewares, rotas
└── shared/utils/            # normalizeText, helpers

UniversalParser.py           # Parser Python multi-fonte
scraper_sinapi.py            # Playwright — portal CAIXA
scraper_seinfra.py           # requests — SEINFRA-CE
```

---

## Troubleshooting

**Porta 3000 ocupada:**
```bash
kill $(lsof -t -i:3000) && yarn dev
```

**API retornando 403:**
Verificar se o header `x-api-key` está correto. A key deve ter 64 chars hex.

**Python não encontrado:**
O sistema busca `.venv/bin/python3` na raiz do projeto. Certificar que o virtualenv está criado e ativado.

**Migration falhou:**
```bash
npx prisma migrate resolve --rolled-back <nome_da_migration>
# Corrigir o arquivo SQL em prisma/migrations/
npx prisma migrate dev
```

**`Null constraint violation` no seed:**
Rodar `npx prisma generate` antes do seed para atualizar o client.