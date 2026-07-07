// ── Auth ──────────────────────────────────────────────────────
export type UserRole = 'ADMIN' | 'ENGINEER' | 'VIEWER'

export interface User {
  id:        string
  name:      string
  email:     string
  role:      UserRole
  createdAt: string
}

export interface AuthResponse {
  message: string
  user:    User
  token:   string
}

export interface LoginInput {
  email:    string
  password: string
}

export interface RegisterInput {
  name:     string
  email:    string
  password: string
  role?:    UserRole
}

// ── Projects ──────────────────────────────────────────────────
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED' | 'COMPLETED'

export interface Project {
  id:          string
  name:        string
  description: string | null
  location:    string | null
  status:      ProjectStatus
  userId:      string
  createdAt:   string
  updatedAt:   string
  _count?: {
    budgets: number
  }
}

export interface CreateProjectInput {
  name:        string
  description?: string
  location?:   string
  status?:     ProjectStatus
}

// ── Budgets ───────────────────────────────────────────────────
export type BudgetStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED'

export interface Budget {
  id:          string
  name:        string
  description: string | null
  status:      BudgetStatus
  projectId:   string
  userId:      string
  createdAt:   string
  updatedAt:   string
  _count?: {
    items: number
  }
}

export interface CreateBudgetInput {
  name:        string
  description?: string
  status?:     BudgetStatus
}

// ── Budget Items ──────────────────────────────────────────────
export interface BudgetItem {
  id:          string
  budgetId:    string
  code:        string
  description: string
  unit:        string
  quantity:    number
  unitPrice:   number
  totalPrice:  number
  source:      string
  createdAt:   string
  updatedAt:   string
}

export interface CreateBudgetItemInput {
  code:        string
  description: string
  unit:        string
  quantity:    number
  unitPrice:   number
  source?:     string
}

// ── API Responses ─────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data:  T[]
  total: number
  page:  number
  limit: number
}

export interface ApiError {
  error:    string
  details?: Record<string, string[]>
}
