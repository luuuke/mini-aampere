"use client";

import { SubmitEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, LoaderCircle, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dealerAuctionQueryKeys } from "@/features/auctions/dealer/query-keys";
import { placeDealerBid } from "@/features/bids/dealer/api";
import { dealerBidQueryKeys } from "@/features/bids/dealer/query-keys";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError } from "@/lib/api/client";

const currencyFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function getSubmissionError(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return "We couldn’t place your bid. Please try again.";
}

export function DealerBidForm({
  auctionId,
  currentBidAmount,
  minimumAmount,
}: {
  auctionId: string;
  currentBidAmount: number | null;
  minimumAmount: number;
}) {
  const [amount, setAmount] = useState(() => minimumAmount.toString());
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submittedAmount, setSubmittedAmount] = useState<number | null>(null);
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const bidMutation = useMutation({
    mutationFn: (nextAmount: number) => {
      if (!accessToken) throw new Error("Missing authenticated session");
      return placeDealerBid(accessToken, auctionId, nextAmount);
    },
    onSuccess: async (_, nextAmount) => {
      setSubmittedAmount(nextAmount);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dealerAuctionQueryKeys.all,
        }),
        queryClient.invalidateQueries({ queryKey: dealerBidQueryKeys.all }),
      ]);
    },
  });

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const nextAmount = Number(amount);

    if (!Number.isSafeInteger(nextAmount) || nextAmount <= 0) {
      setValidationError("Enter a valid whole-euro amount.");
      return;
    }

    if (nextAmount < minimumAmount) {
      setValidationError(
        `Your bid must be at least ${currencyFormatter.format(minimumAmount)}.`,
      );
      return;
    }

    setValidationError(null);
    setSubmittedAmount(null);
    bidMutation.mutate(nextAmount);
  }

  const errorMessage =
    validationError ??
    (bidMutation.isError ? getSubmissionError(bidMutation.error) : null);

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {currentBidAmount === null ? (
        <div>
          <p className="text-xs text-muted-foreground">Starting bid</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {currencyFormatter.format(minimumAmount)}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-3.5">
          <div>
            <p className="text-xs text-muted-foreground">Your current bid</p>
            <p className="mt-1 font-semibold tabular-nums">
              {currencyFormatter.format(currentBidAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Minimum update</p>
            <p className="mt-1 font-semibold tabular-nums">
              {currencyFormatter.format(minimumAmount)}
            </p>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="detail-bid-amount" className="text-sm font-medium">
          {currentBidAmount === null ? "Your bid" : "New bid amount"}
        </label>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
            €
          </span>
          <input
            id="detail-bid-amount"
            name="amount"
            type="number"
            inputMode="numeric"
            min={minimumAmount}
            step="1"
            required
            value={amount}
            aria-invalid={Boolean(errorMessage)}
            aria-describedby={errorMessage ? "detail-bid-error" : "detail-bid-help"}
            className="h-11 w-full rounded-lg border bg-background pr-3 pl-8 text-base font-medium tabular-nums outline-none transition-shadow focus:border-ring focus:ring-3 focus:ring-ring/25 aria-invalid:border-destructive aria-invalid:ring-destructive/15"
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
        {errorMessage ? (
          <p id="detail-bid-error" role="alert" className="mt-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : (
          <p id="detail-bid-help" className="mt-2 text-xs leading-5 text-muted-foreground">
            Whole euros only. The server verifies the final minimum.
          </p>
        )}
      </div>

      {submittedAmount !== null && !bidMutation.isError ? (
        <div
          role="status"
          className="flex gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm text-accent-foreground"
        >
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Bid placed at {currencyFormatter.format(submittedAmount)}.
        </div>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="h-10 w-full"
        disabled={bidMutation.isPending}
      >
        {bidMutation.isPending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : null}
        {bidMutation.isPending
          ? "Submitting…"
          : currentBidAmount === null
            ? "Place sealed bid"
            : "Update sealed bid"}
      </Button>

      <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <LockKeyhole aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        Your amount is sealed. Other dealers cannot see it, and you cannot see
        theirs or the reserve.
      </p>
    </form>
  );
}
