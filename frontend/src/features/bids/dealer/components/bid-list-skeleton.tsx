export function BidListSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <div className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1.25fr_7rem] gap-4 bg-muted/70 px-5 py-3">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-3 animate-pulse rounded bg-muted-foreground/15" />
          ))}
        </div>
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1.25fr_7rem] items-center gap-4 border-t px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-16 shrink-0 animate-pulse rounded-lg bg-muted" />
              <div className="w-full space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:hidden">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-16 shrink-0 animate-pulse rounded-lg bg-muted" />
              <div className="w-full space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="h-10 animate-pulse rounded bg-muted" />
              <div className="h-10 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
