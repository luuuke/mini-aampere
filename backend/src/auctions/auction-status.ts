import type { AuctionStatus } from './auctions.types.js';

export function deriveAuctionStatus(
  startsAt: Date,
  endsAt: Date,
  now: Date,
): AuctionStatus {
  if (now < startsAt) {
    return 'SCHEDULED';
  }

  if (now < endsAt) {
    return 'LIVE';
  }

  return 'ENDED';
}
