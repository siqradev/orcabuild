import type { UserRole } from "../generated/client.js";

declare global {
  namespace Express {
    interface User {
      id:    string;
      name:  string;
      email: string;
      role:  UserRole;
    }
  }
}