"use client";

import { useState } from "react";
import Image from "next/image";
import {
  BatteryCharging,
  CalendarDays,
  CarFront,
  Gauge,
  MapPin,
} from "lucide-react";
import { AuctionCountdown } from "@/components/auctions/auction-countdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { DealerAuction } from "@/features/auctions/types";

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

function VehicleImage({ auction }: { auction: DealerAuction }) {
  const [hasError, setHasError] = useState(false);
  const photoUrl = auction.vehicle.photoUrls[0];

  if (!photoUrl || hasError) {
    return (
      <div className="grid h-full place-items-center bg-muted text-muted-foreground">
        <CarFront aria-hidden="true" className="size-10" />
      </div>
    );
  }

  return (
    <Image
      src={photoUrl}
      alt={`${auction.vehicle.year} ${auction.vehicle.make} ${auction.vehicle.model}`}
      fill
      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      className="object-cover transition-transform duration-300 group-hover/card:scale-[1.015]"
      onError={() => setHasError(true)}
    />
  );
}

function VehicleStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon aria-hidden="true" className="size-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

export function AuctionCard({ auction }: { auction: DealerAuction }) {
  const { vehicle } = auction;
  const isLive = auction.status === "LIVE";

  return (
    <Card className="gap-0 py-0 shadow-none transition-shadow hover:shadow-sm">
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        <VehicleImage auction={auction} />
        <Badge
          variant="outline"
          className={
            isLive
              ? "absolute top-3 left-3 border-emerald-200 bg-emerald-50 text-emerald-800"
              : "absolute top-3 left-3 border-white/80 bg-white/90 text-foreground"
          }
        >
          <span
            aria-hidden="true"
            className={isLive ? "size-1.5 rounded-full bg-primary" : "size-1.5 rounded-full bg-muted-foreground"}
          />
          {isLive ? "Live" : "Scheduled"}
        </Badge>
      </div>

      <CardContent className="px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate font-heading text-lg font-semibold tracking-tight">
              {vehicle.make} {vehicle.model}
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">
                {vehicle.city}, {vehicle.country}
              </span>
            </p>
          </div>
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold">
            {vehicle.year}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 border-y py-4">
          <VehicleStat
            icon={Gauge}
            label="Mileage"
            value={`${numberFormatter.format(vehicle.mileageKm)} km`}
          />
          <VehicleStat
            icon={BatteryCharging}
            label="Battery"
            value={`${vehicle.batteryCapacityKwh} kWh`}
          />
          <VehicleStat
            icon={BatteryCharging}
            label="SoH"
            value={`${vehicle.batteryHealthPercent}%`}
          />
        </div>

        <div className="mt-4">
          {isLive ? (
            <AuctionCountdown endsAt={auction.endsAt} />
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays aria-hidden="true" className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Starts</span>
              <time dateTime={auction.startsAt} className="font-medium">
                {dateFormatter.format(new Date(auction.startsAt))}
              </time>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
