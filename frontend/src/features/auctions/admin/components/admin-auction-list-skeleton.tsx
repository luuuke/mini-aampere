export function AdminAuctionListSkeleton() {
  return (
    <div aria-label="Loading auctions" role="status">
      <span className="sr-only">Loading auctions…</span>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="h-24 animate-pulse rounded-xl border bg-card"
          />
        ))}
      </div>

      <div
        aria-hidden="true"
        className="mt-6 overflow-hidden rounded-xl border bg-card"
      >
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-9 w-full max-w-sm animate-pulse rounded-lg bg-muted" />
          <div className="h-8 w-72 max-w-full animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="hidden h-11 border-b bg-muted/40 lg:block" />
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b p-4 last:border-b-0"
          >
            <div className="size-16 shrink-0 animate-pulse rounded-lg bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-48 max-w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-64 max-w-full animate-pulse rounded bg-muted" />
            </div>
            <div className="hidden h-8 w-24 animate-pulse rounded bg-muted sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
