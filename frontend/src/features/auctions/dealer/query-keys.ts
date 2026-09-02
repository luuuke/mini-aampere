export const dealerAuctionQueryKeys = {
  all: ["auctions", "dealer"] as const,
  list: () => [...dealerAuctionQueryKeys.all, "list"] as const,
  detail: (auctionId: string) =>
    [...dealerAuctionQueryKeys.all, "detail", auctionId] as const,
};
