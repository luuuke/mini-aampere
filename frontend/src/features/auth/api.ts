import { apiRequest } from "@/lib/api/client";
import type { AuthSession } from "@/lib/auth";

export interface LoginCredentials {
  email: string;
  password: string;
}

export function login(credentials: LoginCredentials) {
  return apiRequest<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}
