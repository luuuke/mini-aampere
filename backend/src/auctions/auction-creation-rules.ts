const DEFAULT_AUCTION_DURATION_IN_MILLISECONDS = 24 * 60 * 60 * 1_000;

export interface ResolveAuctionWindowInput {
  startsAt: Date;
  endsAt?: Date;
  now: Date;
}

export type AuctionWindowResolution =
  | {
      valid: true;
      endsAt: Date;
    }
  | {
      valid: false;
      reason: 'END_NOT_AFTER_START' | 'END_NOT_IN_FUTURE';
    };

export function resolveAuctionWindow({
  startsAt,
  endsAt,
  now,
}: ResolveAuctionWindowInput): AuctionWindowResolution {
  const resolvedEndsAt =
    endsAt ??
    new Date(startsAt.getTime() + DEFAULT_AUCTION_DURATION_IN_MILLISECONDS);

  if (resolvedEndsAt <= startsAt) {
    return { valid: false, reason: 'END_NOT_AFTER_START' };
  }

  if (resolvedEndsAt <= now) {
    return { valid: false, reason: 'END_NOT_IN_FUTURE' };
  }

  return { valid: true, endsAt: resolvedEndsAt };
}
