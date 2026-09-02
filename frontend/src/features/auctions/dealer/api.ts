import type {
  DealerAuction,
  DealerAuctionDetail,
} from "@/features/auctions/dealer/types";
import { apiRequest } from "@/lib/api/client";

export function listDealerAuctions(token: string) {
  return apiRequest<DealerAuction[]>("/auctions", { token });
}

export function getDealerAuction(token: string, auctionId: string) {
  return apiRequest<DealerAuctionDetail>(`/auctions/${auctionId}`, { token });
}
