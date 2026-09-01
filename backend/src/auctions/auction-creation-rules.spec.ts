import { resolveAuctionWindow } from './auction-creation-rules.js';

describe('resolveAuctionWindow', () => {
  const now = new Date('2030-01-01T12:00:00.000Z');

  it('defaults the end to exactly 24 hours after the start', () => {
    const result = resolveAuctionWindow({
      startsAt: new Date('2030-01-02T09:00:00.000Z'),
      now,
    });

    expect(result).toEqual({
      valid: true,
      endsAt: new Date('2030-01-03T09:00:00.000Z'),
    });
  });

  it('preserves an explicitly configured end', () => {
    const result = resolveAuctionWindow({
      startsAt: new Date('2030-01-02T09:00:00.000Z'),
      endsAt: new Date('2030-01-04T15:30:00.000Z'),
      now,
    });

    expect(result).toEqual({
      valid: true,
      endsAt: new Date('2030-01-04T15:30:00.000Z'),
    });
  });

  it.each(['2030-01-02T09:00:00.000Z', '2030-01-02T08:59:59.999Z'])(
    'rejects an end that is not later than the start (%s)',
    (endsAt) => {
      expect(
        resolveAuctionWindow({
          startsAt: new Date('2030-01-02T09:00:00.000Z'),
          endsAt: new Date(endsAt),
          now,
        }),
      ).toEqual({ valid: false, reason: 'END_NOT_AFTER_START' });
    },
  );

  it.each(['2030-01-01T12:00:00.000Z', '2030-01-01T11:59:59.999Z'])(
    'rejects an auction that has already ended (%s)',
    (endsAt) => {
      expect(
        resolveAuctionWindow({
          startsAt: new Date('2030-01-01T10:00:00.000Z'),
          endsAt: new Date(endsAt),
          now,
        }),
      ).toEqual({ valid: false, reason: 'END_NOT_IN_FUTURE' });
    },
  );

  it('allows an immediately live auction with a future end', () => {
    expect(
      resolveAuctionWindow({
        startsAt: new Date('2030-01-01T11:00:00.000Z'),
        endsAt: new Date('2030-01-01T13:00:00.000Z'),
        now,
      }),
    ).toEqual({
      valid: true,
      endsAt: new Date('2030-01-01T13:00:00.000Z'),
    });
  });
});
