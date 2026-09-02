"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  CarFront,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Gavel,
  Inbox,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listAdminAuctions } from "@/features/auctions/admin/api";
import { AdminAuctionListSkeleton } from "@/features/auctions/admin/components/admin-auction-list-skeleton";
import { adminAuctionQueryKeys } from "@/features/auctions/admin/query-keys";
import type { AdminAuction } from "@/features/auctions/admin/types";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type AuctionFilter = "ALL" | "LIVE" | "SCHEDULED" | "REVIEW" | "COMPLETED";

const currencyFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const filters: { value: AuctionFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "LIVE", label: "Live" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "REVIEW", label: "Awaiting review" },
  { value: "COMPLETED", label: "Completed" },
];

function isAwaitingReview(auction: AdminAuction) {
  return auction.status === "ENDED" && auction.result === null;
}

function matchesFilter(auction: AdminAuction, filter: AuctionFilter) {
  if (filter === "ALL") return true;
  if (filter === "REVIEW") return isAwaitingReview(auction);
  if (filter === "COMPLETED") return auction.result !== null;
  return auction.status === filter;
}

function getAuctionError(error: unknown) {
  if (error instanceof ApiError && error.status === 403) {
    return "Your account does not have access to auction management.";
  }
  return "We couldn’t load the auctions. Check that the API is running and try again.";
}

function StatusBadge({ status }: { status: AdminAuction["status"] }) {
  const styles = {
    LIVE: "border-emerald-200 bg-emerald-50 text-emerald-800",
    SCHEDULED: "border-sky-200 bg-sky-50 text-sky-800",
    ENDED: "border-border bg-muted text-muted-foreground",
  }[status];

  return (
    <Badge variant="outline" className={styles}>
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          status === "LIVE"
            ? "bg-primary"
            : status === "SCHEDULED"
              ? "bg-sky-500"
              : "bg-muted-foreground",
        )}
      />
      {status === "LIVE"
        ? "Live"
        : status === "SCHEDULED"
          ? "Scheduled"
          : "Ended"}
    </Badge>
  );
}

function ResultBadge({ auction }: { auction: AdminAuction }) {
  if (auction.status !== "ENDED") {
    return <span className="text-sm text-muted-foreground">Pending close</span>;
  }

  if (auction.result === "SOLD") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-200 bg-emerald-50 text-emerald-800"
      >
        <CheckCircle2 aria-hidden="true" />
        Sold
      </Badge>
    );
  }

  if (auction.result === "UNSOLD") {
    return (
      <Badge
        variant="outline"
        className="border-border bg-muted text-foreground"
      >
        Unsold
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-amber-200 bg-amber-50 text-amber-900"
    >
      <ClipboardCheck aria-hidden="true" />
      Review needed
    </Badge>
  );
}

function VehicleThumbnail({ auction }: { auction: AdminAuction }) {
  const [hasError, setHasError] = useState(false);
  const photoUrl = auction.vehicle.primaryPhotoUrl;

  if (!photoUrl || hasError) {
    return (
      <div className="grid size-16 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <CarFront aria-hidden="true" className="size-6" />
      </div>
    );
  }

  return (
    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
      <Image
        src={photoUrl}
        alt=""
        fill
        sizes="64px"
        className="object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

function AuctionTime({ auction }: { auction: AdminAuction }) {
  const label = auction.status === "SCHEDULED" ? "Starts" : "Ends";
  const value =
    auction.status === "SCHEDULED" ? auction.startsAt : auction.endsAt;

  return (
    <div>
      <StatusBadge status={auction.status} />
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      <time
        dateTime={value}
        className="mt-0.5 block text-sm font-medium tabular-nums"
      >
        {dateFormatter.format(new Date(value))}
      </time>
    </div>
  );
}

function BidActivity({ auction }: { auction: AdminAuction }) {
  const highestBid = auction.bidSummary.highestBid;

  return (
    <div>
      <p className="text-sm font-medium">
        {auction.bidSummary.count}{" "}
        {auction.bidSummary.count === 1 ? "bid" : "bids"}
      </p>
      {auction.status === "ENDED" ? (
        highestBid ? (
          <>
            <p className="mt-1 text-xs text-muted-foreground">Highest bid</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">
              {currencyFormatter.format(highestBid.amount)}
            </p>
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                auction.bidSummary.reserveMet
                  ? "text-emerald-700"
                  : "text-amber-700",
              )}
            >
              {auction.bidSummary.reserveMet
                ? "Reserve met"
                : "Reserve not met"}
            </p>
          </>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            No bids received
          </p>
        )
      ) : (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Highest bid available after close
        </p>
      )}
    </div>
  );
}

function AuctionRow({ auction }: { auction: AdminAuction }) {
  const { vehicle } = auction;

  return (
    <article className="grid grid-cols-2 gap-5 border-b p-4 last:border-b-0 sm:p-5 lg:grid-cols-[minmax(270px,1.4fr)_minmax(175px,0.9fr)_minmax(160px,0.75fr)_minmax(150px,0.75fr)_minmax(125px,0.6fr)] lg:items-center lg:px-6">
      <div className="col-span-2 flex min-w-0 items-center gap-4 lg:col-span-1">
        <VehicleThumbnail auction={auction} />
        <div className="min-w-0">
          <h2 className="truncate font-heading text-base font-semibold tracking-tight">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h2>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
            {vehicle.vin}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin aria-hidden="true" className="size-3" />
              {vehicle.city}, {vehicle.country}
            </span>
            <span>{numberFormatter.format(vehicle.mileageKm)} km</span>
          </div>
        </div>
      </div>

      <div className="border-t pt-4 lg:border-t-0 lg:pt-0">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:hidden">
          Schedule
        </p>
        <AuctionTime auction={auction} />
      </div>

      <div className="border-t pt-4 lg:border-t-0 lg:pt-0">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:hidden">
          Pricing
        </p>
        <p className="text-xs text-muted-foreground">Reserve</p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums">
          {currencyFormatter.format(auction.reservePrice)}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Start {currencyFormatter.format(auction.startingPrice)} · +
          {currencyFormatter.format(auction.minIncrement)}
        </p>
      </div>

      <div className="border-t pt-4 lg:border-t-0 lg:pt-0">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:hidden">
          Activity
        </p>
        <BidActivity auction={auction} />
      </div>

      <div className="border-t pt-4 lg:border-t-0 lg:pt-0">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:hidden">
          Result
        </p>
        <ResultBadge auction={auction} />
      </div>
    </article>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: typeof Gavel;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span
          className={cn(
            "grid size-8 place-items-center rounded-lg",
            accent
              ? "bg-accent text-accent-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  );
}

export function AdminAuctionsScreen() {
  const { accessToken } = useAuth();
  const [activeFilter, setActiveFilter] = useState<AuctionFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const auctionsQuery = useQuery({
    queryKey: adminAuctionQueryKeys.list(),
    queryFn: () => {
      if (!accessToken) throw new Error("Missing authenticated session");
      return listAdminAuctions(accessToken);
    },
    enabled: Boolean(accessToken),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 401) && failureCount < 2,
  });

  const counts = useMemo(() => {
    const auctions = auctionsQuery.data ?? [];

    return {
      LIVE: auctions.filter((auction) => auction.status === "LIVE").length,
      SCHEDULED: auctions.filter((auction) => auction.status === "SCHEDULED")
        .length,
      REVIEW: auctions.filter(isAwaitingReview).length,
      COMPLETED: auctions.filter((auction) => auction.result !== null).length,
    };
  }, [auctionsQuery.data]);

  const filteredAuctions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase();

    return (auctionsQuery.data ?? []).filter((auction) => {
      if (!matchesFilter(auction, activeFilter)) return false;
      if (!normalizedSearch) return true;

      const { vehicle } = auction;
      return [
        vehicle.make,
        vehicle.model,
        vehicle.vin,
        vehicle.city,
        vehicle.country,
      ].some((value) =>
        value.toLocaleLowerCase().includes(normalizedSearch),
      );
    });
  }, [activeFilter, auctionsQuery.data, searchTerm]);

  const hasActiveFilters =
    activeFilter !== "ALL" || searchTerm.trim().length > 0;

  function resetFilters() {
    setActiveFilter("ALL");
    setSearchTerm("");
  }

  return (
    <div>
      <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Admin workspace</p>
          <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">
            Auctions
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">
            Monitor every auction, reserve position, and result from one place.
          </p>
        </div>
        {auctionsQuery.data ? (
          <p className="text-sm text-muted-foreground">
            {auctionsQuery.data.length}{" "}
            {auctionsQuery.data.length === 1 ? "auction" : "auctions"}
          </p>
        ) : null}
      </div>

      {auctionsQuery.isPending ? <AdminAuctionListSkeleton /> : null}

      {auctionsQuery.isError ? (
        <div className="rounded-xl border bg-card px-6 py-12 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-destructive/8 text-destructive">
            <TriangleAlert aria-hidden="true" className="size-5" />
          </span>
          <h2 className="mt-4 text-base font-semibold">
            Auctions unavailable
          </h2>
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
          <h2 className="mt-4 text-base font-semibold">No auctions yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Auctions will appear here after a vehicle and bidding window are
            created.
          </p>
        </div>
      ) : null}

      {auctionsQuery.data && auctionsQuery.data.length > 0 ? (
        <>
          <section
            aria-label="Auction overview"
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            <SummaryCard
              icon={Gavel}
              label="Live now"
              value={counts.LIVE}
              accent
            />
            <SummaryCard
              icon={CalendarClock}
              label="Scheduled"
              value={counts.SCHEDULED}
            />
            <SummaryCard
              icon={ClipboardCheck}
              label="Awaiting review"
              value={counts.REVIEW}
            />
            <SummaryCard
              icon={CheckCircle2}
              label="Completed"
              value={counts.COMPLETED}
            />
          </section>

          <section
            aria-label="Auction list"
            className="mt-6 overflow-hidden rounded-xl border bg-card"
          >
            <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
              <div className="relative w-full lg:max-w-xs">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <label htmlFor="auction-search" className="sr-only">
                  Search auctions
                </label>
                <input
                  id="auction-search"
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search vehicle, VIN, or location"
                  className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20"
                />
              </div>

              <div
                className="flex gap-1 overflow-x-auto"
                aria-label="Filter auctions"
              >
                {filters.map((filter) => {
                  const count =
                    filter.value === "ALL"
                      ? auctionsQuery.data.length
                      : counts[filter.value];

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      aria-pressed={activeFilter === filter.value}
                      onClick={() => setActiveFilter(filter.value)}
                      className={cn(
                        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                        activeFilter === filter.value
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {filter.label}
                      <span
                        className={cn(
                          "tabular-nums",
                          activeFilter === filter.value
                            ? "text-background/70"
                            : "text-muted-foreground/70",
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="hidden grid-cols-[minmax(270px,1.4fr)_minmax(175px,0.9fr)_minmax(160px,0.75fr)_minmax(150px,0.75fr)_minmax(125px,0.6fr)] border-b bg-muted/35 px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid">
              <span>Vehicle</span>
              <span>Schedule</span>
              <span>Pricing</span>
              <span>Activity</span>
              <span>Result</span>
            </div>

            {filteredAuctions.length > 0 ? (
              <div>
                {filteredAuctions.map((auction) => (
                  <AuctionRow key={auction.id} auction={auction} />
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <span className="mx-auto grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <Search aria-hidden="true" className="size-4" />
                </span>
                <h2 className="mt-4 text-sm font-semibold">
                  No matching auctions
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Try a different search or clear the current filters.
                </p>
                {hasActiveFilters ? (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={resetFilters}
                  >
                    <RotateCcw data-icon="inline-start" />
                    Clear filters
                  </Button>
                ) : null}
              </div>
            )}
          </section>

          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CircleDollarSign aria-hidden="true" className="size-3.5" />
            Highest bids are disclosed here only after an auction closes.
          </p>
        </>
      ) : null}
    </div>
  );
}
