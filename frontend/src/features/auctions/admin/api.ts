import type { AdminAuction } from "@/features/auctions/admin/types";
import { apiRequest } from "@/lib/api/client";

export function listAdminAuctions(token: string) {
  return apiRequest<AdminAuction[]>("/admin/auctions", { token });
}
