"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dealerAuctionQueryKeys } from "@/features/auctions/dealer/query-keys";
import { placeDealerBid } from "@/features/bids/dealer/api";
import { currencyFormatter } from "@/features/bids/dealer/components/dealer-bid-list";
import { dealerBidQueryKeys } from "@/features/bids/dealer/query-keys";
import type { DealerBidListItem } from "@/features/bids/dealer/types";
import { useAuth } from "@/features/auth/auth-provider";
import { ApiError } from "@/lib/api/client";

function getSubmissionError(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return "We couldn’t update your bid. Please try again.";
}

export function UpdateBidDialog({
  bid,
  onClose,
}: {
  bid: DealerBidListItem;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [amount, setAmount] = useState(
    () => bid.bid.nextMinimumAmount?.toString() ?? "",
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const updateBid = useMutation({
    mutationFn: ({ auctionId, nextAmount }: { auctionId: string; nextAmount: number }) => {
      if (!accessToken) throw new Error("Missing authenticated session");
      return placeDealerBid(accessToken, auctionId, nextAmount);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dealerBidQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: dealerAuctionQueryKeys.all }),
      ]);
      onClose();
    },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  const minimumAmount = bid.bid.nextMinimumAmount;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextAmount = Number(amount);

    if (!Number.isSafeInteger(nextAmount) || nextAmount <= 0) {
      setValidationError("Enter a valid whole-euro amount.");
      return;
    }

    if (minimumAmount !== null && nextAmount < minimumAmount) {
      setValidationError(
        `Your next bid must be at least ${currencyFormatter.format(minimumAmount)}.`,
      );
      return;
    }

    setValidationError(null);
    updateBid.mutate({ auctionId: bid.auctionId, nextAmount });
  }

  const errorMessage =
    validationError ??
    (updateBid.isError ? getSubmissionError(updateBid.error) : null);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="update-bid-title"
      className="w-[calc(100%-2rem)] max-w-md rounded-xl border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-foreground/25"
      onCancel={onClose}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 id="update-bid-title" className="font-heading text-lg font-semibold">
              Update your bid
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {bid.vehicle.year} {bid.vehicle.make} {bid.vehicle.model}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </Button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted p-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Current bid</p>
              <p className="mt-1 font-semibold tabular-nums">
                {currencyFormatter.format(bid.bid.amount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Minimum update</p>
              <p className="mt-1 font-semibold tabular-nums">
                {minimumAmount === null
                  ? "Unavailable"
                  : currencyFormatter.format(minimumAmount)}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="bid-amount" className="text-sm font-medium">
              New bid amount
            </label>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                €
              </span>
              <input
                id="bid-amount"
                name="amount"
                type="number"
                inputMode="numeric"
                min={minimumAmount ?? 1}
                step="1"
                required
                value={amount}
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={errorMessage ? "bid-amount-error" : "bid-amount-help"}
                className="h-10 w-full rounded-lg border bg-background pr-3 pl-8 text-base tabular-nums outline-none transition-shadow focus:border-ring focus:ring-3 focus:ring-ring/25 aria-invalid:border-destructive aria-invalid:ring-destructive/15"
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            {errorMessage ? (
              <p id="bid-amount-error" role="alert" className="mt-2 text-sm text-destructive">
                {errorMessage}
              </p>
            ) : (
              <p id="bid-amount-help" className="mt-2 text-xs leading-5 text-muted-foreground">
                Your bid stays sealed. Other dealers cannot see this amount.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t bg-muted/40 px-5 py-4">
          <Button
            type="button"
            variant="outline"
            disabled={updateBid.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={updateBid.isPending || minimumAmount === null}>
            {updateBid.isPending ? "Updating…" : "Update bid"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
