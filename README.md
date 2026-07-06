# OrcaBuild

Sistema SaaS de orçamentação para obras de engenharia civil, desenvolvido em arquitetura de monorepo com três serviços independentes.

## Estrutura do Monorepo

```
orcabuild/
├── etl/        # Motor ETL — importação e catálogo SINAPI/SEINFRA
├── api/        # Budget API — orçamentos, projetos, cotações, composições
└── web/        # Frontend Next.js
```

---

## Serviços

### ETL (`/etl`) — porta 3001
Motor de importação e consulta ao catálogo de preços oficiais.

**Stack:** Node.js 22, TypeScript, Fastify, Prisma 7, PostgreSQL, Python 3.12 (parsers)

**Funcionalidades:**
- Importação de tabelas SINAPI (federal, mensal) e SEINFRA-CE (estadual)
- Busca e resolução de composições analíticas
- Módulo de Cotações (pedidos, fornecedores, aprovação com validade de 6 meses)
- Composições Próprias (CP) com Mão de Obra, Material e Equipamento
- Cálculo automático de Encargos Sociais e BDI

### Budget API (`/api`) — porta 3002
API de negócio para gerenciamento de orçamentos.

**Stack:** Node.js 22, TypeScript, Express, Prisma 7, PostgreSQL, Passport JWT

**Funcionalidades:**
- Autenticação JWT com cookies HttpOnly
- Projetos e Orçamentos com hierarquia Meta/Submeta/Item
- Proxy autenticado para a ETL API
- Módulo de Cotações e Composições Próprias
- Exportação de dados para o frontend

### Web (`/web`) — porta 3000
Interface do usuário para orçamentação.

**Stack:** Next.js 16, TypeScript, TanStack Query, Shadcn/UI, Tailwind CSS, ExcelJS

**Funcionalidades:**
- Editor de orçamento hierárquico (Meta → Submeta → Item)
- Busca no catálogo SINAPI/SEINFRA com autocomplete
- Adição de itens por Cotação ou Composição Própria
- Mapa Comparativo de Cotações (análise de fornecedores)
- Tela de montagem de Composições Próprias
- Exportação Excel com formatação profissional
- Impressão com cabeçalho da empresa

---

## Requisitos

- Node.js 22+
- Python 3.12+
- PostgreSQL 15+
- Yarn

---

## Configuração

### Variáveis de ambiente

**ETL (`etl/.env`):**
```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/api_orcamento_pro
MASTER_API_KEY=sua_chave_aqui
PORT=3001
```

**Budget API (`api/.env`):**
```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/orcabuild
JWT_SECRET=seu_secret_aqui
ETL_API_URL=http://localhost:3001
ETL_API_KEY=sua_chave_aqui
PORT=3002
```

**Web (`web/.env.local`):**
```env
BUDGET_API_URL=http://localhost:3002
ETL_API_KEY=sua_chave_aqui
```

---

## Como rodar

Cada serviço roda de forma independente. Abra um terminal para cada um:

```bash
# Terminal 1 — ETL
cd etl
yarn install
npx prisma migrate dev
yarn dev

# Terminal 2 — Budget API
cd api
yarn install
npx prisma migrate dev
yarn dev

# Terminal 3 — Frontend
cd web
yarn install
yarn dev
```

Acesse em: `http://localhost:3000`

---

## Tabelas de Preços Suportadas

| Fonte   | Descrição                        | Periodicidade |
|---------|----------------------------------|---------------|
| SINAPI  | Sistema Nacional de Pesquisa de Custos | Mensal |
| SEINFRA | Secretaria de Infraestrutura — CE | Irregular    |
| PRÓPRIO | Composições e Cotações próprias  | Contínuo      |

---

## Licença

Projeto privado — todos os direitos reservados.
