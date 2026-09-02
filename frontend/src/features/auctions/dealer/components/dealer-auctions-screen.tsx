"use client";

import { useQuery } from "@tanstack/react-query";
import { Inbox, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listDealerAuctions } from "@/features/auctions/dealer/api";
import { AuctionCard } from "@/features/auctions/dealer/components/auction-card";
import { AuctionListSkeleton } from "@/features/auctions/dealer/components/auction-list-skeleton";
import { dealerAuctionQueryKeys } from "@/features/auctions/dealer/query-keys";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError } from "@/lib/api/client";

function getAuctionError(error: unknown) {
  if (error instanceof ApiError && error.status === 403) {
    return "Your account does not have access to dealer auctions.";
  }
  return "We couldn’t load the auctions. Check that the API is running and try again.";
}

export function DealerAuctionsScreen() {
  const { accessToken } = useAuth();
  const auctionsQuery = useQuery({
    queryKey: dealerAuctionQueryKeys.list(),
    queryFn: () => {
      if (!accessToken) throw new Error("Missing authenticated session");
      return listDealerAuctions(accessToken);
    },
    enabled: Boolean(accessToken),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 401) && failureCount < 2,
  });

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Dealer marketplace</p>
          <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">
            Auctions
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">
            Browse electric vehicles currently open or scheduled for blind
            bidding.
          </p>
        </div>
        {auctionsQuery.data ? (
          <p className="text-sm text-muted-foreground">
            {auctionsQuery.data.length}{" "}
            {auctionsQuery.data.length === 1 ? "auction" : "auctions"}
          </p>
        ) : null}
      </div>

      {auctionsQuery.isPending ? <AuctionListSkeleton /> : null}

      {auctionsQuery.isError ? (
        <div className="rounded-xl border bg-card px-6 py-12 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-destructive/8 text-destructive">
            <TriangleAlert aria-hidden="true" className="size-5" />
          </span>
          <h2 className="mt-4 text-base font-semibold">Auctions unavailable</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {getAuctionError(auctionsQuery.error)}
          </p>
          <Button
            variant="outline"
            className="mt-5"
            onClick={() => auctionsQuery.refetch()}
          >
            <RefreshCw data-icon="inline-start" />
            Try again
          </Button>
        </div>
      ) : null}

      {auctionsQuery.data?.length === 0 ? (
        <div className="rounded-xl border bg-card px-6 py-14 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Inbox aria-hidden="true" className="size-5" />
          </span>
          <h2 className="mt-4 text-base font-semibold">
            No auctions available
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Live and scheduled vehicles will appear here when they are
            published.
          </p>
        </div>
      ) : null}

      {auctionsQuery.data && auctionsQuery.data.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {auctionsQuery.data.map((auction, index) => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              priority={index === 0}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
