export function AuctionDetailSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="mb-6 h-5 w-36 rounded bg-muted" />
      <div className="mb-7 space-y-3">
        <div className="h-8 w-2/3 max-w-lg rounded bg-muted" />
        <div className="h-5 w-52 rounded bg-muted" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(19rem,0.75fr)]">
        <div className="space-y-6">
          <div className="aspect-[16/9] rounded-xl bg-muted" />
          <div className="h-64 rounded-xl border bg-card" />
        </div>
        <div className="h-[30rem] rounded-xl border bg-card" />
      </div>
    </div>
  );
}
