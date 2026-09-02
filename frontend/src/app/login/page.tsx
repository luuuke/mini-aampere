"use client";

import { SubmitEvent, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Gavel, LoaderCircle } from "lucide-react";
import { FullPageLoader } from "@/components/auth/full-page-loader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { login } from "@/features/auth/api";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError } from "@/lib/api/client";
import { getRoleHome } from "@/lib/auth";

function getLoginError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    return "The email or password is incorrect.";
  }
  if (error instanceof ApiError && error.status === 0) return error.message;
  return "We couldn’t sign you in. Please try again.";
}

export default function LoginPage() {
  const router = useRouter();
  const { completeLogin, isReady, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      completeLogin(session);
      router.replace(getRoleHome(session.user.role));
    },
  });

  useEffect(() => {
    if (isReady && user) router.replace(getRoleHome(user.role));
  }, [isReady, router, user]);

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    loginMutation.mutate({ email: email.trim().toLowerCase(), password });
  }

  if (!isReady || user)
    return <FullPageLoader label="Opening your dashboard" />;

  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-foreground text-base font-bold text-background">
            A
          </span>
          <span className="font-heading text-xl font-semibold tracking-tight">
            Aampere
          </span>
        </div>

        <Card className="gap-0 py-0 shadow-sm">
          <CardHeader className="gap-2 border-b px-6 py-6">
            <span className="mb-1 grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground">
              <Gavel aria-hidden="true" className="size-4" />
            </span>
            <CardTitle className="text-xl font-semibold">
              Welcome back
            </CardTitle>
            <CardDescription>
              Sign in with your Aampere auction account.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 py-6">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-10 w-full rounded-lg border bg-card px-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20"
                  placeholder="you@dealership.com"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-10 w-full rounded-lg border bg-card px-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20"
                  placeholder="Enter your password"
                />
              </div>

              {loginMutation.isError ? (
                <p
                  role="alert"
                  className="rounded-lg bg-destructive/8 px-3 py-2.5 text-sm text-destructive"
                >
                  {getLoginError(loginMutation.error)}
                </p>
              ) : null}

              <Button
                type="submit"
                size="lg"
                className="h-10 w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : null}
                {loginMutation.isPending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          Access is limited to invited Aampere administrators and dealers.
        </p>
      </div>
    </main>
  );
}
