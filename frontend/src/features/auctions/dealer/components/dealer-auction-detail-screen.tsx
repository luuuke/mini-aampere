"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  BatteryCharging,
  CalendarDays,
  CarFront,
  Clock3,
  Gauge,
  MapPin,
  RefreshCw,
  Route,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VehicleGallery } from "@/features/auctions/components/vehicle-gallery";
import { getDealerAuction } from "@/features/auctions/dealer/api";
import { AuctionCountdown } from "@/features/auctions/dealer/components/auction-countdown";
import { AuctionDetailSkeleton } from "@/features/auctions/dealer/components/auction-detail-skeleton";
import { DealerBidForm } from "@/features/auctions/dealer/components/dealer-bid-form";
import { dealerAuctionQueryKeys } from "@/features/auctions/dealer/query-keys";
import type { DealerAuctionDetail } from "@/features/auctions/dealer/types";
import type { DealerBidStatus } from "@/features/bids/dealer/types";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1,
});

const currencyFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
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

const bidStatusPresentation: Record<
  DealerBidStatus,
  { label: string; description: string; className: string }
> = {
  ACTIVE: {
    label: "Bid active",
    description: "You can raise your bid until the auction closes.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  AWAITING_REVIEW: {
    label: "Awaiting result",
    description: "Aampere is reviewing the auction result.",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  WON: {
    label: "Won",
    description: "Your winning bid has been confirmed.",
    className: "border-sky-200 bg-sky-50 text-sky-800",
  },
  LOST: {
    label: "Not won",
    description: "The confirmed result went to another dealer.",
    className: "border-border bg-muted text-muted-foreground",
  },
  UNSOLD: {
    label: "Unsold",
    description: "Aampere confirmed that this vehicle was not sold.",
    className: "border-border bg-muted text-muted-foreground",
  },
};

function getDetailError(error: unknown) {
  if (error instanceof ApiError && error.status === 404) {
    return {
      title: "Auction not available",
      message:
        "This auction does not exist or is no longer available to your dealer account.",
    };
  }
  if (error instanceof ApiError && error.status === 403) {
    return {
      title: "Access denied",
      message: "Your account does not have access to dealer auctions.",
    };
  }
  return {
    title: "Auction unavailable",
    message: "We couldn’t load this auction. Check that the API is running and try again.",
  };
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

function AuctionTiming({ auction }: { auction: DealerAuctionDetail }) {
  if (auction.status === "LIVE") {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Time remaining
        </p>
        <div className="mt-2 text-base">
          <AuctionCountdown endsAt={auction.endsAt} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Closes {dateTimeFormatter.format(new Date(auction.endsAt))}
        </p>
      </div>
    );
  }

  if (auction.status === "SCHEDULED") {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Bidding opens
        </p>
        <p className="mt-2 flex items-center gap-2 font-semibold">
          <CalendarDays aria-hidden="true" className="size-4 text-primary" />
          <time dateTime={auction.startsAt}>
            {dateTimeFormatter.format(new Date(auction.startsAt))}
          </time>
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Auction closed
      </p>
      <p className="mt-2 flex items-center gap-2 font-semibold">
        <Clock3 aria-hidden="true" className="size-4 text-muted-foreground" />
        <time dateTime={auction.endsAt}>
          {dateTimeFormatter.format(new Date(auction.endsAt))}
        </time>
      </p>
    </div>
  );
}

function BidPanel({ auction }: { auction: DealerAuctionDetail }) {
  const ownBid = auction.myBid;

  return (
    <Card className="gap-0 py-0 shadow-none lg:sticky lg:top-6">
      <CardHeader className="border-b px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg font-semibold">Auction</CardTitle>
          <Badge
            variant="outline"
            className={
              auction.status === "LIVE"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-border bg-muted text-muted-foreground"
            }
          >
            <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
            {auction.status === "LIVE"
              ? "Live"
              : auction.status === "SCHEDULED"
                ? "Scheduled"
                : "Ended"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 px-5 py-5">
        <AuctionTiming auction={auction} />

        <div className="grid grid-cols-2 gap-3 border-y py-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Starting bid</p>
            <p className="mt-1 font-semibold tabular-nums">
              {currencyFormatter.format(auction.startingPrice)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Minimum increment</p>
            <p className="mt-1 font-semibold tabular-nums">
              {currencyFormatter.format(auction.minIncrement)}
            </p>
          </div>
        </div>

        {auction.status === "LIVE" && auction.nextMinimumBidAmount !== null ? (
          <DealerBidForm
            key={`${auction.myBid?.placedAt ?? "new"}-${auction.nextMinimumBidAmount}`}
            auctionId={auction.id}
            currentBidAmount={auction.myBid?.amount ?? null}
            minimumAmount={auction.nextMinimumBidAmount}
          />
        ) : ownBid ? (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Your final bid</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {currencyFormatter.format(ownBid.amount)}
                </p>
              </div>
              <Badge
                variant="outline"
                className={bidStatusPresentation[ownBid.status].className}
              >
                {bidStatusPresentation[ownBid.status].label}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {bidStatusPresentation[ownBid.status].description}
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">
            Bidding is not open yet. Return when the auction goes live to place
            your sealed bid.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AuctionDetail({ auction }: { auction: DealerAuctionDetail }) {
  const vehicle = auction.vehicle;
  const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  return (
    <div>
      <Link
        href="/dealer/auctions"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
      >
        <ArrowLeft data-icon="inline-start" />
        All auctions
      </Link>

      <div className="mt-5 mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">Dealer marketplace</p>
          <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            {vehicle.make} {vehicle.model}
          </h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin aria-hidden="true" className="size-4" />
            {vehicle.city}, {vehicle.country}
            <span aria-hidden="true">·</span>
            {vehicle.year}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
          Dealer-safe auction view
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(19rem,0.75fr)]">
        <div className="min-w-0 space-y-6">
          <VehicleGallery photoUrls={vehicle.photoUrls} vehicleName={vehicleName} />

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
                  icon={BatteryCharging}
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
                  label="First registration"
                  value={dateFormatter.format(
                    new Date(`${vehicle.registrationDate}T00:00:00.000Z`),
                  )}
                />
                <Specification icon={CarFront} label="VIN" value={vehicle.vin} />
              </div>

              <div className="mt-6 border-t pt-5">
                <h2 className="text-sm font-semibold">Condition and notes</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {vehicle.conditionNotes ?? "No additional condition notes provided."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <BidPanel auction={auction} />
      </div>
    </div>
  );
}

export function DealerAuctionDetailScreen({ auctionId }: { auctionId: string }) {
  const { accessToken } = useAuth();
  const auctionQuery = useQuery({
    queryKey: dealerAuctionQueryKeys.detail(auctionId),
    queryFn: () => {
      if (!accessToken) throw new Error("Missing authenticated session");
      return getDealerAuction(accessToken, auctionId);
    },
    enabled: Boolean(accessToken),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && [401, 403, 404].includes(error.status)) &&
      failureCount < 2,
    refetchInterval: (query) =>
      query.state.data?.status === "ENDED" ? false : 30_000,
  });

  if (auctionQuery.isPending) return <AuctionDetailSkeleton />;

  if (auctionQuery.isError) {
    const presentation = getDetailError(auctionQuery.error);
    return (
      <div className="mx-auto max-w-xl rounded-xl border bg-card px-6 py-14 text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-destructive/8 text-destructive">
          <TriangleAlert aria-hidden="true" className="size-5" />
        </span>
        <h1 className="mt-4 font-heading text-xl font-semibold">{presentation.title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          {presentation.message}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href="/dealer/auctions"
            className={buttonVariants({ variant: "outline" })}
          >
            <ArrowLeft data-icon="inline-start" />
            All auctions
          </Link>
          {!(auctionQuery.error instanceof ApiError) ||
          ![403, 404].includes(auctionQuery.error.status) ? (
            <Button onClick={() => auctionQuery.refetch()}>
              <RefreshCw data-icon="inline-start" />
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return <AuctionDetail auction={auctionQuery.data} />;
}
