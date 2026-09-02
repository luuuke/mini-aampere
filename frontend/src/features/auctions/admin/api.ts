import type {
  AdminAuction,
  AdminAuctionDetail,
  AdminAuctionResult,
  ConfirmAuctionResultResponse,
} from "@/features/auctions/admin/types";
import { apiRequest } from "@/lib/api/client";

export function listAdminAuctions(token: string) {
  return apiRequest<AdminAuction[]>("/admin/auctions", { token });
}

export function getAdminAuction(token: string, auctionId: string) {
  return apiRequest<AdminAuctionDetail>(`/admin/auctions/${auctionId}`, {
    token,
  });
}

export function confirmAdminAuctionResult(
  token: string,
  auctionId: string,
  result: Exclude<AdminAuctionResult, null>,
) {
  return apiRequest<ConfirmAuctionResultResponse>(
    `/admin/auctions/${auctionId}/result`,
    {
      token,
      method: "PATCH",
      body: JSON.stringify({ result }),
    },
  );
}
