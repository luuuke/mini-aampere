export const dealerBidQueryKeys = {
  all: ["bids", "dealer"] as const,
  list: () => [...dealerBidQueryKeys.all, "list"] as const,
};
