"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  BatteryCharging,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Gauge,
  Gavel,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Route,
  ShieldCheck,
  TriangleAlert,
  Trophy,
  UserRound,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  confirmAdminAuctionResult,
  getAdminAuction,
} from "@/features/auctions/admin/api";
import { AdminAuctionDetailSkeleton } from "@/features/auctions/admin/components/admin-auction-detail-skeleton";
import { adminAuctionQueryKeys } from "@/features/auctions/admin/query-keys";
import type {
  AdminAuctionDetail,
  AdminAuctionResult,
} from "@/features/auctions/admin/types";
import { VehicleGallery } from "@/features/auctions/components/vehicle-gallery";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function getDetailError(error: unknown) {
  if (error instanceof ApiError && error.status === 404) {
    return {
      title: "Auction not found",
      message: "This auction does not exist or may have been removed.",
    };
  }

  if (error instanceof ApiError && error.status === 403) {
    return {
      title: "Access denied",
      message: "Your account does not have access to auction management.",
    };
  }

  return {
    title: "Auction unavailable",
    message:
      "We couldn’t load this auction. Check that the API is running and try again.",
  };
}

function getResultError(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return "We couldn’t confirm the result. Please try again.";
}

function StatusBadge({ status }: { status: AdminAuctionDetail["status"] }) {
  const presentation = {
    LIVE: {
      label: "Live",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    },
    SCHEDULED: {
      label: "Scheduled",
      className: "border-sky-200 bg-sky-50 text-sky-800",
    },
    ENDED: {
      label: "Ended",
      className: "border-border bg-muted text-muted-foreground",
    },
  }[status];

  return (
    <Badge variant="outline" className={presentation.className}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {presentation.label}
    </Badge>
  );
}

function Specification({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon aria-hidden="true" className="size-4" />
        {label}
      </div>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}

function VehicleDetails({ auction }: { auction: AdminAuctionDetail }) {
  const { vehicle } = auction;

  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className="border-b px-5 py-5 sm:px-6">
        <CardTitle className="text-lg font-semibold">Vehicle details</CardTitle>
      </CardHeader>
      <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Specification
            icon={Gauge}
            label="Mileage"
            value={`${numberFormatter.format(vehicle.mileageKm)} km`}
          />
          <Specification
            icon={BatteryCharging}
            label="Battery capacity"
            value={`${numberFormatter.format(vehicle.batteryCapacityKwh)} kWh`}
          />
          <Specification
            icon={ShieldCheck}
            label="Battery health"
            value={`${numberFormatter.format(vehicle.batteryHealthPercent)}% SoH`}
          />
          <Specification
            icon={Route}
            label="Estimated range"
            value={`${numberFormatter.format(vehicle.rangeKm)} km`}
          />
          <Specification
            icon={CalendarDays}
            label="Registration"
            value={dateFormatter.format(
              new Date(`${vehicle.registrationDate}T00:00:00.000Z`),
            )}
          />
          <Specification
            icon={MapPin}
            label="Location"
            value={`${vehicle.city}, ${vehicle.country}`}
          />
        </div>

        <div className="mt-6 border-t pt-5">
          <h2 className="text-sm font-semibold">Condition notes</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {vehicle.conditionNotes ?? "No condition notes were provided."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function BidHistory({ auction }: { auction: AdminAuctionDetail }) {
  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className="border-b px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold">Bid history</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {auction.bids.length} {auction.bids.length === 1 ? "bid" : "bids"}
              {auction.bids.length > 0 ? ", ranked by amount" : " received"}
            </p>
          </div>
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Gavel aria-hidden="true" className="size-4" />
          </span>
        </div>
      </CardHeader>

      {auction.bids.length === 0 ? (
        <CardContent className="px-5 py-10 text-center sm:px-6">
          <span className="mx-auto grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Gavel aria-hidden="true" className="size-4" />
          </span>
          <p className="mt-3 text-sm font-semibold">No bids received</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This auction closed without dealer activity.
          </p>
        </CardContent>
      ) : (
        <div>
          <div className="hidden grid-cols-[3rem_minmax(12rem,1fr)_minmax(10rem,0.7fr)_minmax(8rem,0.5fr)] border-b bg-muted/35 px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid">
            <span>Rank</span>
            <span>Dealer</span>
            <span>Placed</span>
            <span className="text-right">Amount</span>
          </div>
          {auction.bids.map((bid, index) => {
            const isWinner = bid.id === auction.winningBidId;
            const isHighestPending =
              index === 0 && auction.status === "ENDED" && auction.result === null;

            return (
              <article
                key={bid.id}
                className={cn(
                  "grid gap-3 border-b px-5 py-4 last:border-b-0 sm:grid-cols-[3rem_minmax(12rem,1fr)_minmax(10rem,0.7fr)_minmax(8rem,0.5fr)] sm:items-center sm:px-6",
                  isWinner ? "bg-emerald-50/60" : undefined,
                )}
              >
                <div className="hidden sm:block">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                    {index + 1}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">
                      {bid.dealer.dealershipName ?? bid.dealer.name}
                    </p>
                    {isWinner ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-emerald-800"
                      >
                        <Trophy aria-hidden="true" />
                        Winner
                      </Badge>
                    ) : isHighestPending ? (
                      <Badge
                        variant="outline"
                        className="border-amber-200 bg-amber-50 text-amber-900"
                      >
                        Highest bid
                      </Badge>
                    ) : null}
                  </div>
                  {bid.dealer.dealershipName ? (
                    <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <UserRound aria-hidden="true" className="size-3" />
                      {bid.dealer.name}
                    </p>
                  ) : null}
                </div>
                <time
                  dateTime={bid.placedAt}
                  className="text-xs text-muted-foreground sm:text-sm"
                >
                  {dateTimeFormatter.format(new Date(bid.placedAt))}
                </time>
                <p className="text-lg font-semibold tabular-nums sm:text-right sm:text-sm">
                  {currencyFormatter.format(bid.amount)}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ResultBadge({ result }: { result: Exclude<AdminAuctionResult, null> }) {
  return result === "SOLD" ? (
    <Badge
      variant="outline"
      className="border-emerald-200 bg-emerald-50 text-emerald-800"
    >
      <CheckCircle2 aria-hidden="true" />
      Sold
    </Badge>
  ) : (
    <Badge variant="outline" className="border-border bg-muted text-foreground">
      <XCircle aria-hidden="true" />
      Unsold
    </Badge>
  );
}

function ResultReview({ auction }: { auction: AdminAuctionDetail }) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [selectedResult, setSelectedResult] =
    useState<AdminAuctionResult>(null);
  const highestBid = auction.bids[0] ?? null;
  const canConfirmSold = Boolean(highestBid && auction.reserveMet);
  const resultMutation = useMutation({
    mutationFn: (result: Exclude<AdminAuctionResult, null>) => {
      if (!accessToken) throw new Error("Missing authenticated session");
      return confirmAdminAuctionResult(accessToken, auction.id, result);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: adminAuctionQueryKeys.detail(auction.id),
        }),
        queryClient.invalidateQueries({
          queryKey: adminAuctionQueryKeys.list(),
        }),
      ]);
    },
  });

  if (auction.status !== "ENDED") {
    return (
      <div className="rounded-lg bg-muted px-4 py-4">
        <p className="text-sm font-semibold">Result review not available</p>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          The outcome can be confirmed after the auction closes.
        </p>
      </div>
    );
  }

  if (auction.result) {
    const winningBid = auction.bids.find(
      (bid) => bid.id === auction.winningBidId,
    );

    return (
      <div className="rounded-lg border bg-background p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">Confirmed result</p>
          <ResultBadge result={auction.result} />
        </div>
        {winningBid ? (
          <div className="mt-4 border-t pt-4">
            <p className="text-xs text-muted-foreground">Winning dealer</p>
            <p className="mt-1 text-sm font-semibold">
              {winningBid.dealer.dealershipName ?? winningBid.dealer.name}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {currencyFormatter.format(winningBid.amount)}
            </p>
          </div>
        ) : null}
        {auction.resultConfirmedAt ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Confirmed {dateTimeFormatter.format(new Date(auction.resultConfirmedAt))}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-950">Review required</p>
        <p className="mt-1.5 text-sm leading-6 text-amber-900/80">
          Confirm the final outcome to make the result visible to participating
          dealers.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={selectedResult === "SOLD"}
          disabled={!canConfirmSold || resultMutation.isPending}
          onClick={() => setSelectedResult("SOLD")}
          className={cn(
            "rounded-lg border p-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
            selectedResult === "SOLD"
              ? "border-primary bg-accent"
              : "bg-background hover:bg-muted",
          )}
        >
          <CheckCircle2 aria-hidden="true" className="size-4 text-emerald-700" />
          <span className="mt-2 block text-sm font-semibold">Sold</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Reserve met
          </span>
        </button>
        <button
          type="button"
          aria-pressed={selectedResult === "UNSOLD"}
          disabled={resultMutation.isPending}
          onClick={() => setSelectedResult("UNSOLD")}
          className={cn(
            "rounded-lg border p-3 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
            selectedResult === "UNSOLD"
              ? "border-foreground bg-muted"
              : "bg-background hover:bg-muted",
          )}
        >
          <XCircle aria-hidden="true" className="size-4 text-muted-foreground" />
          <span className="mt-2 block text-sm font-semibold">Unsold</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Do not assign winner
          </span>
        </button>
      </div>

      {!canConfirmSold ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Sold is unavailable because there are no qualifying bids above the
          reserve.
        </p>
      ) : null}

      {resultMutation.isError ? (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-destructive/8 px-3 py-2.5 text-sm text-destructive"
        >
          {getResultError(resultMutation.error)}
        </p>
      ) : null}

      <Button
        type="button"
        className="mt-4 h-9 w-full"
        disabled={!selectedResult || resultMutation.isPending}
        onClick={() => {
          if (selectedResult) resultMutation.mutate(selectedResult);
        }}
      >
        {resultMutation.isPending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : null}
        {resultMutation.isPending
          ? "Confirming…"
          : selectedResult
            ? `Confirm as ${selectedResult.toLowerCase()}`
            : "Select an outcome"}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        The result cannot be changed after confirmation.
      </p>
    </div>
  );
}

function AuctionSummary({ auction }: { auction: AdminAuctionDetail }) {
  const highestBid = auction.bids[0] ?? null;

  return (
    <Card className="gap-0 py-0 shadow-none lg:sticky lg:top-6">
      <CardHeader className="border-b px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg font-semibold">Auction</CardTitle>
          <StatusBadge status={auction.status} />
        </div>
      </CardHeader>
      <CardContent className="px-5 py-5">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <CalendarDays
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <div>
              <p className="text-xs text-muted-foreground">Starts</p>
              <time dateTime={auction.startsAt} className="mt-1 block text-sm font-medium">
                {dateTimeFormatter.format(new Date(auction.startsAt))}
              </time>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock3
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <div>
              <p className="text-xs text-muted-foreground">Ends</p>
              <time dateTime={auction.endsAt} className="mt-1 block text-sm font-medium">
                {dateTimeFormatter.format(new Date(auction.endsAt))}
              </time>
            </div>
          </div>
        </div>

        <div className="my-5 grid grid-cols-2 gap-x-4 gap-y-4 border-y py-5">
          <div>
            <p className="text-xs text-muted-foreground">Starting bid</p>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {currencyFormatter.format(auction.startingPrice)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Increment</p>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {currencyFormatter.format(auction.minIncrement)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Reserve</p>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {currencyFormatter.format(auction.reservePrice)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Highest bid</p>
            <p className="mt-1 text-sm font-semibold tabular-nums">
              {highestBid ? currencyFormatter.format(highestBid.amount) : "—"}
            </p>
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Reserve position</p>
            <p className="mt-1 text-sm font-semibold">
              {auction.reserveMet ? "Reserve met" : "Reserve not met"}
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              auction.reserveMet
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }
          >
            {auction.bids.length} {auction.bids.length === 1 ? "bid" : "bids"}
          </Badge>
        </div>

        <ResultReview auction={auction} />
      </CardContent>
    </Card>
  );
}

export function AdminAuctionDetailScreen({ auctionId }: { auctionId: string }) {
  const { accessToken } = useAuth();
  const auctionQuery = useQuery({
    queryKey: adminAuctionQueryKeys.detail(auctionId),
    queryFn: () => {
      if (!accessToken) throw new Error("Missing authenticated session");
      return getAdminAuction(accessToken, auctionId);
    },
    enabled: Boolean(accessToken),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && [401, 403, 404].includes(error.status)) &&
      failureCount < 2,
  });

  if (auctionQuery.isPending) return <AdminAuctionDetailSkeleton />;

  if (auctionQuery.isError) {
    const error = getDetailError(auctionQuery.error);

    return (
      <div>
        <Link
          href="/admin/auctions"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-6")}
        >
          <ArrowLeft aria-hidden="true" />
          All auctions
        </Link>
        <div className="rounded-xl border bg-card px-6 py-14 text-center">
          <span className="mx-auto grid size-11 place-items-center rounded-xl bg-destructive/8 text-destructive">
            <TriangleAlert aria-hidden="true" className="size-5" />
          </span>
          <h1 className="mt-4 text-lg font-semibold">{error.title}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {error.message}
          </p>
          <Button variant="outline" className="mt-5" onClick={() => auctionQuery.refetch()}>
            <RefreshCw data-icon="inline-start" />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const auction = auctionQuery.data;
  const vehicleName = `${auction.vehicle.year} ${auction.vehicle.make} ${auction.vehicle.model}`;

  return (
    <div>
      <Link
        href="/admin/auctions"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-6")}
      >
        <ArrowLeft aria-hidden="true" />
        All auctions
      </Link>

      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={auction.status} />
            {auction.result ? <ResultBadge result={auction.result} /> : null}
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {vehicleName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="size-4" />
              {auction.vehicle.city}, {auction.vehicle.country}
            </span>
            <span className="font-mono text-xs">{auction.vehicle.vin}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Auction <span className="font-mono text-xs">{auction.id.slice(0, 8)}</span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.75fr)] lg:items-start">
        <div className="space-y-6">
          <VehicleGallery
            photoUrls={auction.vehicle.photoUrls}
            vehicleName={vehicleName}
          />
          <VehicleDetails auction={auction} />
          <BidHistory auction={auction} />
        </div>
        <AuctionSummary auction={auction} />
      </div>
    </div>
  );
}
