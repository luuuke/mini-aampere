import { CalendarClock } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AdminAuctionsScreen() {
  return (
    <div>
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-primary">Admin workspace</p>
        <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">
          Auctions
        </h1>
        <p className="mt-2 text-base leading-7 text-muted-foreground">
          Create, review, and manage vehicle auctions from one place.
        </p>
      </div>

      <Card className="mt-8 max-w-2xl border-dashed py-0 shadow-none">
        <CardHeader className="gap-3 px-6 py-8">
          <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-foreground">
            <CalendarClock aria-hidden="true" className="size-5" />
          </span>
          <CardTitle className="text-lg font-semibold">
            Auction management is coming next
          </CardTitle>
          <CardDescription className="max-w-lg leading-6">
            This workspace will contain auction creation, lifecycle management,
            and result review. Those tools are intentionally not part of this
            first frontend release.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
