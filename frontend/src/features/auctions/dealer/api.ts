import type { DealerAuction } from "@/features/auctions/dealer/types";
import { apiRequest } from "@/lib/api/client";

export function listDealerAuctions(token: string) {
  return apiRequest<DealerAuction[]>("/auctions", { token });
}
