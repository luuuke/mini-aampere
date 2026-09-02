"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Inbox, LockKeyhole, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listDealerBids } from "@/features/bids/dealer/api";
import { BidListSkeleton } from "@/features/bids/dealer/components/bid-list-skeleton";
import { DealerBidList } from "@/features/bids/dealer/components/dealer-bid-list";
import { UpdateBidDialog } from "@/features/bids/dealer/components/update-bid-dialog";
import { dealerBidQueryKeys } from "@/features/bids/dealer/query-keys";
import type {
  DealerBidListItem,
  DealerBidStatus,
} from "@/features/bids/dealer/types";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type BidFilter = "ALL" | "OPEN" | "AWAITING_REVIEW" | "WON" | "HISTORY";

const bidFilters: Array<{ value: BidFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "AWAITING_REVIEW", label: "Awaiting result" },
  { value: "WON", label: "Won" },
  { value: "HISTORY", label: "History" },
];

const emptyFilterCopy: Record<Exclude<BidFilter, "ALL">, string> = {
  OPEN: "You don’t have any open bids.",
  AWAITING_REVIEW: "No bids are awaiting a result.",
  WON: "You haven’t won an auction yet.",
  HISTORY: "Your completed bids will appear here.",
};

function getBidsError(error: unknown) {
  if (error instanceof ApiError && error.status === 403) {
    return "Your account does not have access to dealer bids.";
  }
  return "We couldn’t load your bids. Check that the API is running and try again.";
}

function matchesFilter(status: DealerBidStatus, filter: BidFilter) {
  if (filter === "ALL") return true;
  if (filter === "OPEN") return status === "ACTIVE";
  if (filter === "HISTORY") return status === "LOST" || status === "UNSOLD";
  return status === filter;
}

function countForFilter(bids: DealerBidListItem[], filter: BidFilter) {
  if (filter === "ALL") return bids.length;
  return bids.reduce(
    (count, bid) => count + Number(matchesFilter(bid.bid.status, filter)),
    0,
  );
}

export function DealerBidsScreen() {
  const [activeFilter, setActiveFilter] = useState<BidFilter>("ALL");
  const [selectedBid, setSelectedBid] = useState<DealerBidListItem | null>(null);
  const { accessToken } = useAuth();
  const bidsQuery = useQuery({
    queryKey: dealerBidQueryKeys.list(),
    queryFn: () => {
      if (!accessToken) throw new Error("Missing authenticated session");
      return listDealerBids(accessToken);
    },
    enabled: Boolean(accessToken),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 401) && failureCount < 2,
    refetchInterval: (query) =>
      query.state.data?.some((bid) => bid.bid.status === "ACTIVE")
        ? 60_000
        : false,
  });

  const bids = bidsQuery.data ?? [];
  const filteredBids = bids.filter((bid) =>
    matchesFilter(bid.bid.status, activeFilter),
  );

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Dealer marketplace</p>
          <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">
            My bids
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">
            Track every auction you’ve entered, including won and completed bids.
          </p>
        </div>
        {bidsQuery.data ? (
          <p className="text-sm text-muted-foreground">
            {bids.length} {bids.length === 1 ? "bid" : "bids"}
          </p>
        ) : null}
      </div>

      {bidsQuery.data && bids.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-muted p-1 sm:w-fit">
          {bidFilters.map((filter) => {
            const isActive = activeFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                aria-pressed={isActive}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}{" "}
                <span className="text-xs tabular-nums text-muted-foreground">
                  {countForFilter(bids, filter.value)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
        <LockKeyhole aria-hidden="true" className="mt-1 size-4 shrink-0" />
        <p>
          Live auctions are sealed. You’ll only see your own bid; other bids and
          the reserve remain hidden.
        </p>
      </div>

      {bidsQuery.isPending ? <BidListSkeleton /> : null}

      {bidsQuery.isError ? (
        <div className="rounded-xl border bg-card px-6 py-12 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-destructive/8 text-destructive">
            <TriangleAlert aria-hidden="true" className="size-5" />
          </span>
          <h2 className="mt-4 text-base font-semibold">Bids unavailable</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {getBidsError(bidsQuery.error)}
          </p>
          <Button
            variant="outline"
            className="mt-5"
            onClick={() => bidsQuery.refetch()}
          >
            <RefreshCw data-icon="inline-start" />
            Try again
          </Button>
        </div>
      ) : null}

      {bidsQuery.data?.length === 0 ? (
        <div className="rounded-xl border bg-card px-6 py-14 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Inbox aria-hidden="true" className="size-5" />
          </span>
          <h2 className="mt-4 text-base font-semibold">No bids yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Auctions you bid on will appear here, with your latest bid and result.
          </p>
        </div>
      ) : null}

      {bidsQuery.data && bids.length > 0 && filteredBids.length === 0 ? (
        <div className="rounded-xl border bg-card px-6 py-12 text-center">
          <h2 className="text-base font-semibold">Nothing here yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {activeFilter === "ALL" ? "No bids found." : emptyFilterCopy[activeFilter]}
          </p>
        </div>
      ) : null}

      {filteredBids.length > 0 ? (
        <DealerBidList bids={filteredBids} onUpdate={setSelectedBid} />
      ) : null}

      {selectedBid ? (
        <UpdateBidDialog
          key={selectedBid.auctionId}
          bid={selectedBid}
          onClose={() => setSelectedBid(null)}
        />
      ) : null}
    </div>
  );
}
