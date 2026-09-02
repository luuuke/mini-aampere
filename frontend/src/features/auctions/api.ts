import { apiRequest } from "@/lib/api/client";
import type { DealerAuction } from "@/features/auctions/types";

export const auctionQueryKeys = {
  all: ["auctions"] as const,
  dealerList: () => [...auctionQueryKeys.all, "dealer", "list"] as const,
};

export function listDealerAuctions(token: string) {
  return apiRequest<DealerAuction[]>("/auctions", { token });
}
