import { validateBid } from './bid-rules.js';
import type { PlaceBidRulesInput } from './bid-rules.js';

describe('bid-rules', () => {
  it('rejects a bid for an auction that has already ended', () => {
    const result = validateBid(
      validBidInput({
        endsAt: new Date('2030-01-01T11:00:00.000Z'),
        now: new Date('2030-01-01T12:00:00.000Z'),
      }),
    );

    expect(result).toEqual({ valid: false, reason: 'ENDED' });
  });

  it('rejects a bid for an auction that has not started yet', () => {
    const result = validateBid(
      validBidInput({
        startsAt: new Date('2020-01-01T13:00:00.000Z'),
        endsAt: new Date('2020-01-01T14:00:00.000Z'),
        now: new Date('2020-01-01T12:00:00.000Z'),
      }),
    );

    expect(result).toEqual({ valid: false, reason: 'NOT_STARTED' });
  });

  it('accepts a bid exactly when the auction starts', () => {
    const startsAt = new Date('2030-01-01T10:00:00.000Z');

    const result = validateBid(
      validBidInput({
        startsAt,
        now: startsAt,
      }),
    );

    expect(result).toEqual({ valid: true });
  });

  it('rejects a bid exactly when the auction ends', () => {
    const endsAt = new Date('2030-01-01T14:00:00.000Z');

    const result = validateBid(
      validBidInput({
        endsAt,
        now: endsAt,
      }),
    );

    expect(result).toEqual({ valid: false, reason: 'ENDED' });
  });

  it('rejects an initial bid that is lower than the starting min amount', () => {
    const STARTING_PRICE = 20000;

    const result = validateBid(
      validBidInput({
        previousBidAmount: null,
        amount: 10000,
        startingPrice: STARTING_PRICE,
      }),
    );

    expect(result).toEqual({
      valid: false,
      reason: 'AMOUNT_TOO_LOW',
      minimumAmount: STARTING_PRICE,
    });
  });

  it('rejects a consecutive bid that is does not respect the minimum increment', () => {
    const PREV_BID_AMOUNT = 20000;
    const MIN_INCREMENT = 1000;

    const result = validateBid(
      validBidInput({
        startingPrice: 5000,
        previousBidAmount: PREV_BID_AMOUNT,
        minIncrement: MIN_INCREMENT,
        amount: 10500,
      }),
    );

    expect(result).toEqual({
      valid: false,
      reason: 'AMOUNT_TOO_LOW',
      minimumAmount: PREV_BID_AMOUNT + MIN_INCREMENT,
    });
  });

  it('accepts a valid initial bid', () => {
    const result = validateBid(
      validBidInput({
        startingPrice: 10000,
        minIncrement: 1000,
        previousBidAmount: null,
        amount: 11000,
      }),
    );

    expect(result).toEqual({
      valid: true,
    });
  });

  it('accepts an initial bid exactly at the starting price', () => {
    const startingPrice = 10_000;

    const result = validateBid(
      validBidInput({
        startingPrice,
        previousBidAmount: null,
        amount: startingPrice,
      }),
    );

    expect(result).toEqual({ valid: true });
  });

  it('accepts a valid consecutive bid', () => {
    const result = validateBid(
      validBidInput({
        startingPrice: 10000,
        minIncrement: 1000,
        previousBidAmount: 11000,
        amount: 12000,
      }),
    );

    expect(result).toEqual({
      valid: true,
    });
  });
});

function validBidInput(
  overrides: Partial<PlaceBidRulesInput> = {},
): PlaceBidRulesInput {
  return {
    amount: 20_250,
    startsAt: new Date('2030-01-01T10:00:00.000Z'),
    endsAt: new Date('2030-01-01T14:00:00.000Z'),
    startingPrice: 20_000,
    minIncrement: 250,
    previousBidAmount: null,
    now: new Date('2030-01-01T12:00:00.000Z'),
    ...overrides,
  };
}
