export const adminAuctionQueryKeys = {
  all: ["admin", "auctions"] as const,
  list: () => [...adminAuctionQueryKeys.all, "list"] as const,
};
