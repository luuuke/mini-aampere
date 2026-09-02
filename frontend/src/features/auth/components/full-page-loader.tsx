import { LoaderCircle } from "lucide-react";

export function FullPageLoader({ label }: { label: string }) {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-6">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        <span>{label}</span>
      </div>
    </main>
  );
}
