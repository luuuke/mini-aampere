export type UserRole = "ADMIN" | "DEALER";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  dealershipName: string | null;
  role: UserRole;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}
