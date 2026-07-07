import bcrypt       from "bcryptjs";
import jwt          from "jsonwebtoken";
import { prisma }   from "../../lib/prisma.js";
import type { RegisterInput, LoginInput } from "./auth.schemas.js";

const SALT_ROUNDS   = 12;
const JWT_EXPIRES_IN = "7d";

interface JwtPayload {
  sub:   string;
  email: string;
  role:  string;
}

// ── Registro ──────────────────────────────────────────────────
export async function registerUser(data: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error("E-mail já cadastrado");
  }

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name:     data.name,
      email:    data.email,
      password: hashedPassword,
      role:     data.role,
    },
    select: {
      id:        true,
      name:      true,
      email:     true,
      role:      true,
      createdAt: true,
    },
  });

  const token = generateToken({ sub: user.id, email: user.email, role: user.role });

  return { user, token };
}

// ── Login ─────────────────────────────────────────────────────
export async function loginUser(data: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new Error("Credenciais inválidas");
  }

  const passwordMatch = await bcrypt.compare(data.password, user.password);

  if (!passwordMatch) {
    throw new Error("Credenciais inválidas");
  }

  const token = generateToken({ sub: user.id, email: user.email, role: user.role });

  const { password: _, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, token };
}

// ── Helper ────────────────────────────────────────────────────
function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: JWT_EXPIRES_IN,
  });
}
