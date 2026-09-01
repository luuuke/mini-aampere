export interface PlaceBidRulesInput {
  amount: number;
  startsAt: Date;
  endsAt: Date;
  startingPrice: number;
  minIncrement: number;
  previousBidAmount: number | null;
  now: Date;
}

export type BidValidationResult =
  | { valid: true }
  | { valid: false; reason: 'NOT_STARTED' }
  | { valid: false; reason: 'ENDED' }
  | {
      valid: false;
      reason: 'AMOUNT_TOO_LOW';
      minimumAmount: number;
    };

export function validateBid({
  startsAt,
  endsAt,
  startingPrice,
  minIncrement,
  previousBidAmount,
  amount,
  now,
}: PlaceBidRulesInput): BidValidationResult {
  if (now < startsAt) return { valid: false, reason: 'NOT_STARTED' };
  if (now >= endsAt) return { valid: false, reason: 'ENDED' };

  const minimumAmount =
    previousBidAmount !== null
      ? previousBidAmount + minIncrement
      : startingPrice;

  if (amount < minimumAmount) {
    return { valid: false, reason: 'AMOUNT_TOO_LOW', minimumAmount };
  }

  return { valid: true };
}
