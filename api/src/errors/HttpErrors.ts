import { AppError } from "./AppError.js";

export class NotFoundError extends AppError {
  constructor(resource = "Recurso") {
    super(404, `${resource} nao encontrado`, "NOT_FOUND");
  }
}
export class ForbiddenError extends AppError {
  constructor(message = "Acesso negado") {
    super(403, message, "FORBIDDEN");
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = "Nao autenticado") {
    super(401, message, "UNAUTHORIZED");
  }
}
export class ConflictError extends AppError {
  constructor(message: string) { super(409, message, "CONFLICT"); }
}
export class UnprocessableError extends AppError {
  constructor(message: string) { super(422, message, "UNPROCESSABLE"); }
}
export class BadGatewayError extends AppError {
  constructor(message = "Servico externo indisponivel") {
    super(502, message, "BAD_GATEWAY");
  }
}
