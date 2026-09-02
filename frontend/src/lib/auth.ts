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

const AUTH_STORAGE_KEY = "aampere.auth.session";
const AUTH_CHANGE_EVENT = "aampere:auth-change";

let cachedRawSession: string | null | undefined;
let cachedSession: AuthSession | null = null;

export function getRoleHome(role: UserRole) {
  return role === "DEALER" ? "/dealer/auctions" : "/admin/auctions";
}

function isSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") return false;

  const session = value as Partial<AuthSession>;
  const user = session.user as Partial<AuthUser> | undefined;

  return Boolean(
    typeof session.accessToken === "string" &&
      user &&
      typeof user.id === "string" &&
      typeof user.name === "string" &&
      typeof user.email === "string" &&
      (user.dealershipName === null ||
        typeof user.dealershipName === "string") &&
      (user.role === "ADMIN" || user.role === "DEALER"),
  );
}

function tokenIsExpired(token: string) {
  try {
    const encodedPayload = token.split(".")[1];
    if (!encodedPayload) return true;

    const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { exp?: number };

    return typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function readStoredSession(): AuthSession | null {
  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored === cachedRawSession) return cachedSession;

    cachedRawSession = stored;
    if (!stored) {
      cachedSession = null;
      return null;
    }

    const session: unknown = JSON.parse(stored);
    if (!isSession(session) || tokenIsExpired(session.accessToken)) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      cachedRawSession = null;
      cachedSession = null;
      return null;
    }

    cachedSession = session;
    return session;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    cachedRawSession = null;
    cachedSession = null;
    return null;
  }
}

export function storeSession(session: AuthSession) {
  const serialized = JSON.stringify(session);
  window.localStorage.setItem(AUTH_STORAGE_KEY, serialized);
  cachedRawSession = serialized;
  cachedSession = session;
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function removeStoredSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  cachedRawSession = null;
  cachedSession = null;
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function subscribeToStoredSession(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(AUTH_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(AUTH_CHANGE_EVENT, onStoreChange);
  };
}
