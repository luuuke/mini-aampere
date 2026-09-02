export const adminAuctionQueryKeys = {
  all: ["admin", "auctions"] as const,
  list: () => [...adminAuctionQueryKeys.all, "list"] as const,
  detail: (auctionId: string) =>
    [...adminAuctionQueryKeys.all, "detail", auctionId] as const,
};
