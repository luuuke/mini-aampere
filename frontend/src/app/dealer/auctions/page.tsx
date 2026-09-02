"use client";

import { useQuery } from "@tanstack/react-query";
import { Inbox, RefreshCw, TriangleAlert } from "lucide-react";
import { AuctionCard } from "@/components/auctions/auction-card";
import { Button } from "@/components/ui/button";
import {
  auctionQueryKeys,
  listDealerAuctions,
} from "@/features/auctions/api";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError } from "@/lib/api/client";

function AuctionListSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-xl border bg-card"
          aria-hidden="true"
        >
          <div className="aspect-[16/9] animate-pulse bg-muted" />
          <div className="space-y-4 p-5">
            <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function getAuctionError(error: unknown) {
  if (error instanceof ApiError && error.status === 403) {
    return "Your account does not have access to dealer auctions.";
  }
  return "We couldn’t load the auctions. Check that the API is running and try again.";
}

export default function DealerAuctionsPage() {
  const { accessToken } = useAuth();
  const auctionsQuery = useQuery({
    queryKey: auctionQueryKeys.dealerList(),
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
            Browse electric vehicles currently open or scheduled for blind bidding.
          </p>
        </div>
        {auctionsQuery.data ? (
          <p className="text-sm text-muted-foreground">
            {auctionsQuery.data.length} {auctionsQuery.data.length === 1 ? "auction" : "auctions"}
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
          <h2 className="mt-4 text-base font-semibold">No auctions available</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Live and scheduled vehicles will appear here when they are published.
          </p>
        </div>
      ) : null}

      {auctionsQuery.data && auctionsQuery.data.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {auctionsQuery.data.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
