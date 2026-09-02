import type { UserRole } from "@/features/auth/types";

export function getRoleHome(role: UserRole) {
  return role === "DEALER" ? "/dealer/auctions" : "/admin/auctions";
}
