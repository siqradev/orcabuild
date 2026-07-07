# Integração orcabuild-web ↔ orcabuild-budget-api

## Arquivos gerados

```
src/
├── services/api/
│   ├── etlClient.ts       ← renomear client.ts atual para este
│   ├── budgetClient.ts    ← novo — Axios com Bearer JWT para porta 3002
│   ├── auth.ts            ← novo — login, register, me, logout
│   ├── projects.ts        ← novo — CRUD de projetos
│   └── budgets.ts         ← novo — CRUD de orçamentos e itens
├── types/
│   └── budget.types.ts    ← novo — tipos User, Project, Budget, BudgetItem
├── lib/
│   └── auth.ts            ← novo — authStorage (token/user no localStorage)
├── features/
│   ├── auth/hooks/
│   │   └── useAuth.ts     ← novo — hook de login/logout
│   ├── projects/hooks/
│   │   └── useProjects.ts ← novo — hooks TanStack Query para projetos
│   └── budgets/hooks/
│       └── useBudgets.ts  ← novo — hooks TanStack Query para orçamentos
└── app/
    ├── login/
    │   └── page.tsx       ← novo — tela de login
    └── (app)/
        └── projetos/
            └── page.tsx   ← novo — listagem de projetos
```

## Passos de instalação

### 1. Atualizar .env.local

```bash
# ETL API — catálogo SINAPI/SEINFRA
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_KEY=sua_chave_aqui

# Budget API — projetos, orçamentos, auth
NEXT_PUBLIC_BUDGET_API_URL=http://localhost:3002
```

### 2. Renomear o client.ts atual

```bash
cd src/services/api
mv client.ts etlClient.ts
```

Atualizar imports nas features de catálogo:
- `items.ts` → trocar `import { apiClient }` por `import { etlClient as apiClient }`
- `compositions.ts` → idem
- `imports.ts` → idem
- `tables.ts` → idem
- `health.ts` → idem

### 3. Copiar os novos arquivos para o projeto

Copie cada arquivo gerado para o caminho correspondente em `src/`.

### 4. Adicionar rota de Projetos na Sidebar

Em `src/components/layout/Sidebar.tsx`, adicionar no grupo ORÇAMENTO:

```tsx
{ href: '/projetos', icon: Folder, label: 'Projetos' },
{ href: '/orcamentos', icon: FileText, label: 'Orçamentos' },
```

### 5. Reiniciar o servidor

```bash
fuser -k 3000/tcp
PORT=3000 yarn dev
```

## Fluxo de autenticação

1. Usuário acessa `/login`
2. `useAuth.login()` chama `POST /auth/login` na budget-api (3002)
3. Token JWT salvo no `localStorage` como `orcabuild_token`
4. `budgetClient.ts` injeta o token automaticamente em toda requisição
5. Se o token expirar (401), redireciona para `/login` automaticamente
