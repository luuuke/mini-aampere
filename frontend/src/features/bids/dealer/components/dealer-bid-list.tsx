import { CarFront } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { AuctionCountdown } from "@/features/auctions/dealer/components/auction-countdown";
import type {
  DealerBidListItem,
  DealerBidStatus,
} from "@/features/bids/dealer/types";

const currencyFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
});

const placedAtFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const bidStatusPresentation: Record<
  DealerBidStatus,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Open",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  },
  AWAITING_REVIEW: {
    label: "Awaiting result",
    className:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  },
  WON: {
    label: "Won",
    className:
      "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200",
  },
  LOST: {
    label: "Not won",
    className: "border-border bg-muted text-muted-foreground",
  },
  UNSOLD: {
    label: "Unsold",
    className: "border-border bg-muted text-muted-foreground",
  },
};

function VehicleIdentity({ bid }: { bid: DealerBidListItem }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-12 w-16 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <CarFront aria-hidden="true" className="size-6" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-heading text-sm font-semibold sm:text-base">
          {bid.vehicle.year} {bid.vehicle.make} {bid.vehicle.model}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          Sealed auction
        </span>
      </span>
    </div>
  );
}

function BidStatusBadge({ status }: { status: DealerBidStatus }) {
  const presentation = bidStatusPresentation[status];

  return (
    <Badge variant="outline" className={presentation.className}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {presentation.label}
    </Badge>
  );
}

function OwnBid({ bid }: { bid: DealerBidListItem }) {
  return (
    <div>
      <p className="font-semibold tabular-nums">
        {currencyFormatter.format(bid.bid.amount)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Updated {placedAtFormatter.format(new Date(bid.bid.placedAt))}
      </p>
    </div>
  );
}

function BidTiming({ bid }: { bid: DealerBidListItem }) {
  if (bid.bid.status === "ACTIVE") {
    return <AuctionCountdown endsAt={bid.endsAt} />;
  }

  const endedAt = dateFormatter.format(new Date(bid.endsAt));
  const detail =
    bid.bid.status === "AWAITING_REVIEW"
      ? "Result pending"
      : bid.bid.status === "WON"
        ? "Winning bid confirmed"
        : bid.bid.status === "UNSOLD"
          ? "Auction not sold"
          : "No further action";

  return (
    <div>
      <p className="font-medium">
        Closed <time dateTime={bid.endsAt}>{endedAt}</time>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function UpdateBidAction({ bid }: { bid: DealerBidListItem }) {
  if (bid.bid.status !== "ACTIVE") return null;

  return (
    <span
      aria-hidden="true"
      className={buttonVariants({ size: "sm", className: "w-full sm:w-auto" })}
    >
      Update bid
    </span>
  );
}

function DesktopBidContent({ bid }: { bid: DealerBidListItem }) {
  return (
    <>
      <span className="px-5 py-4">
        <VehicleIdentity bid={bid} />
      </span>
      <span className="px-4 py-4">
        <BidStatusBadge status={bid.bid.status} />
      </span>
      <span className="px-4 py-4">
        <OwnBid bid={bid} />
      </span>
      <span className="px-4 py-4">
        <BidTiming bid={bid} />
      </span>
      <span className="px-3 py-4 text-right">
        <UpdateBidAction bid={bid} />
      </span>
    </>
  );
}

function MobileBidContent({ bid }: { bid: DealerBidListItem }) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <VehicleIdentity bid={bid} />
        <BidStatusBadge status={bid.bid.status} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Your bid</p>
          <OwnBid bid={bid} />
        </div>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Timing</p>
          <BidTiming bid={bid} />
        </div>
      </div>

      {bid.bid.status === "ACTIVE" ? (
        <div className="mt-4">
          <UpdateBidAction bid={bid} />
        </div>
      ) : null}
    </>
  );
}

function getAuctionHref(bid: DealerBidListItem) {
  return `/dealer/auctions/${bid.auctionId}`;
}

function getAuctionLinkLabel(bid: DealerBidListItem) {
  return `View ${bid.vehicle.year} ${bid.vehicle.make} ${bid.vehicle.model} auction and update your bid`;
}

export function DealerBidList({ bids }: { bids: DealerBidListItem[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border bg-card lg:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-muted/70 text-xs font-medium text-muted-foreground">
            <tr>
              <th scope="col" className="w-[33%] px-5 py-3 font-medium">
                Vehicle
              </th>
              <th scope="col" className="w-[17%] px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="w-[18%] px-4 py-3 font-medium">
                Your bid
              </th>
              <th scope="col" className="w-[20%] px-4 py-3 font-medium">
                Timing
              </th>
              <th scope="col" className="w-[12%] px-3 py-3">
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {bids.map((bid) => {
              const rowClassName =
                "grid grid-cols-[33%_17%_18%_20%_12%] items-center text-sm";

              return (
                <tr key={bid.auctionId} className="border-t first:border-t-0">
                  <td colSpan={5} className="p-0">
                    {bid.bid.status === "ACTIVE" ? (
                      <Link
                        href={getAuctionHref(bid)}
                        aria-label={getAuctionLinkLabel(bid)}
                        className={`${rowClassName} outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/40`}
                      >
                        <DesktopBidContent bid={bid} />
                      </Link>
                    ) : (
                      <div className={rowClassName}>
                        <DesktopBidContent bid={bid} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 lg:hidden">
        {bids.map((bid) => (
          <li key={bid.auctionId} className="overflow-hidden rounded-xl border bg-card">
            {bid.bid.status === "ACTIVE" ? (
              <Link
                href={getAuctionHref(bid)}
                aria-label={getAuctionLinkLabel(bid)}
                className="block p-4 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/40"
              >
                <MobileBidContent bid={bid} />
              </Link>
            ) : (
              <div className="p-4">
                <MobileBidContent bid={bid} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

export { currencyFormatter };
