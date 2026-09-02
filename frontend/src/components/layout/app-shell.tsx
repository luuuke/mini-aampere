"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Gavel, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { getRoleHome, type UserRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  role,
}: {
  children: React.ReactNode;
  role: UserRole;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const auctionsHref = getRoleHome(role);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href={auctionsHref} className="flex shrink-0 items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-foreground text-sm font-bold text-background">
              A
            </span>
            <span className="font-heading text-base font-semibold tracking-tight">
              Aampere
            </span>
          </Link>

          <nav aria-label="Primary" className="ml-2 hidden self-stretch sm:flex">
            <Link
              href={auctionsHref}
              className={cn(
                "flex items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors",
                pathname === auctionsHref
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Gavel aria-hidden="true" className="size-4" />
              Auctions
            </Link>
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-4">
            <div className="hidden min-w-0 text-right md:block">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.dealershipName ?? "Aampere"}
              </p>
            </div>
            <Badge variant="secondary" className="hidden uppercase sm:inline-flex">
              {role.toLowerCase()}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut data-icon="inline-start" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>

        <nav aria-label="Primary mobile" className="border-t px-4 sm:hidden">
          <Link
            href={auctionsHref}
            className="flex h-11 items-center gap-2 border-b-2 border-primary text-sm font-medium"
          >
            <Gavel aria-hidden="true" className="size-4" />
            Auctions
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {children}
      </main>
    </div>
  );
}
