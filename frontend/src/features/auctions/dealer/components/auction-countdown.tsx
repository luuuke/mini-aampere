"use client";

import { useSyncExternalStore } from "react";
import { Clock3 } from "lucide-react";

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return [
    days ? `${days}d` : null,
    `${hours.toString().padStart(2, "0")}h`,
    `${minutes.toString().padStart(2, "0")}m`,
    `${seconds.toString().padStart(2, "0")}s`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function AuctionCountdown({ endsAt }: { endsAt: string }) {
  const now = useSyncExternalStore<number | null>(
    (onStoreChange) => {
      const timer = window.setInterval(onStoreChange, 1_000);
      return () => window.clearInterval(timer);
    },
    Date.now,
    () => null,
  );

  const remaining = now === null ? null : new Date(endsAt).getTime() - now;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Clock3 aria-hidden="true" className="size-4 text-primary" />
      <span className="text-muted-foreground">Ends in</span>
      <time
        dateTime={endsAt}
        className="font-mono text-sm font-semibold tabular-nums text-foreground"
      >
        {remaining === null
          ? "Calculating…"
          : remaining <= 0
            ? "Ended"
            : formatRemaining(remaining)}
      </time>
    </div>
  );
}
