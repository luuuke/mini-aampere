import { ArrowDown, Gavel, Layers3, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const foundations = [
  {
    title: "Next.js App Router",
    description:
      "TypeScript, React Server Components, Tailwind CSS, and route-aware types.",
    icon: Layers3,
  },
  {
    title: "TanStack Query",
    description:
      "A stable, SSR-safe query client is available to every interactive route.",
    icon: RefreshCw,
  },
  {
    title: "shadcn/ui",
    description:
      "Accessible Base UI primitives with local, composable component source.",
    icon: Gavel,
  },
];

export default function Home() {
  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden bg-muted/30">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-0 h-96 bg-[radial-gradient(circle_at_top_left,oklch(0.92_0.05_170),transparent_55%)]"
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8 lg:px-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-foreground text-sm font-semibold text-background shadow-sm">
              A
            </span>
            <span className="font-heading text-sm font-semibold tracking-tight">
              Aampere
            </span>
          </div>
          <Badge variant="secondary">Frontend starter</Badge>
        </header>

        <section className="flex flex-1 flex-col justify-center py-20 sm:py-28">
          <Badge variant="outline" className="mb-6 bg-background/70">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Foundation ready
          </Badge>
          <h1 className="max-w-4xl font-heading text-5xl leading-[0.98] font-semibold tracking-[-0.045em] text-balance sm:text-7xl">
            Blind vehicle auctions, built on a clear foundation.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
            The Aampere dealer platform is ready for its login, auction, bid,
            and administration flows. Client-side server state is configured
            without turning the whole application into a client bundle.
          </p>
          <div className="mt-9">
            <Button
              size="lg"
              render={<a href="#foundation" />}
              className="px-4"
            >
              View the foundation
              <ArrowDown data-icon="inline-end" />
            </Button>
          </div>
        </section>

        <section
          id="foundation"
          aria-label="Frontend foundation"
          className="grid scroll-mt-8 gap-4 pb-8 md:grid-cols-3"
        >
          {foundations.map(({ description, icon: Icon, title }) => (
            <Card key={title} className="bg-background/80 backdrop-blur-sm">
              <CardHeader>
                <span className="mb-3 grid size-9 place-items-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <CardTitle>{title}</CardTitle>
                <CardDescription className="leading-6">
                  {description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
