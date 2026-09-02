import type {
  DealerBidListItem,
  PlacedDealerBid,
} from "@/features/bids/dealer/types";
import { apiRequest } from "@/lib/api/client";

export function listDealerBids(token: string) {
  return apiRequest<DealerBidListItem[]>("/bids", { token });
}

export function placeDealerBid(
  token: string,
  auctionId: string,
  amount: number,
) {
  return apiRequest<PlacedDealerBid>(`/auctions/${auctionId}/bids`, {
    token,
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}
