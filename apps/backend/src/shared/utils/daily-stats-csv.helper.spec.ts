import { AccountEntity, DailyTootStatsEntity } from '@analytodon/shared-orm';
import { EntityRepository, Loaded } from '@mikro-orm/core';

import { buildDailyStatsCsvRows, getDailyStatsCsvRows } from './daily-stats-csv.helper';

describe('buildDailyStatsCsvRows', () => {
  const timezone = 'UTC';

  it('emits one row per calendar day with carry-forward and delta=0 for gap days', () => {
    const points = [
      // seed: day before dateFrom
      { day: new Date('2024-05-09T00:00:00.000Z'), value: 100 },
      { day: new Date('2024-05-10T00:00:00.000Z'), value: 103 },
      // 2024-05-11 missing → backfilled
      { day: new Date('2024-05-12T00:00:00.000Z'), value: 110 },
    ];

    const dateFrom = new Date('2024-05-10T00:00:00.000Z');
    const dateTo = new Date('2024-05-13T00:00:00.000Z'); // exclusive — covers 10, 11, 12

    const rows = buildDailyStatsCsvRows(points, dateFrom, dateTo, timezone);

    expect(rows).toEqual([
      { day: '2024-05-10', absolute: 103, delta: 3 }, // seeded prior of 100 → +3
      { day: '2024-05-11', absolute: 103, delta: 0 }, // backfilled gap
      { day: '2024-05-12', absolute: 110, delta: 7 },
    ]);
  });

  it('emits null delta for the very first row when no prior data exists', () => {
    const rows = buildDailyStatsCsvRows(
      [{ day: new Date('2024-05-10T00:00:00.000Z'), value: 50 }],
      new Date('2024-05-10T00:00:00.000Z'),
      new Date('2024-05-12T00:00:00.000Z'),
      timezone,
    );

    expect(rows).toEqual([
      { day: '2024-05-10', absolute: 50, delta: null },
      { day: '2024-05-11', absolute: 50, delta: 0 },
    ]);
  });

  it('returns empty array when range is empty', () => {
    const sameDay = new Date('2024-05-10T00:00:00.000Z');
    const rows = buildDailyStatsCsvRows([], sameDay, sameDay, timezone);
    expect(rows).toEqual([]);
  });

  it('throws (via eachDayInRange) when the range exceeds the hard cap', () => {
    // ~500 days far exceeds MAX_CUSTOM_RANGE_DAYS (366) + buffer (30).
    const dateFrom = new Date('2023-01-01T00:00:00.000Z');
    const dateTo = new Date('2024-05-15T00:00:00.000Z');
    expect(() => buildDailyStatsCsvRows([], dateFrom, dateTo, timezone)).toThrow(/eachDayInRange exceeded/);
  });
});

describe('getDailyStatsCsvRows', () => {
  it('queries the seed-day-extended window and projects values via the accessor', async () => {
    const account = { id: 'acc-1', timezone: 'UTC' } as unknown as Loaded<AccountEntity>;
    const findMock = jest.fn().mockResolvedValue([
      { day: new Date('2024-05-09T00:00:00.000Z'), boostsCount: 100 },
      { day: new Date('2024-05-10T00:00:00.000Z'), boostsCount: 103 },
    ] as DailyTootStatsEntity[]);
    const repo = { find: findMock } as unknown as EntityRepository<DailyTootStatsEntity>;

    const rows = await getDailyStatsCsvRows(repo, account, 'custom', (e) => e.boostsCount, {
      customDateFrom: '2024-05-10',
      customDateTo: '2024-05-10',
    });

    // Repo.find was called with day window that starts one day before dateFrom.
    expect(findMock).toHaveBeenCalledTimes(1);
    const [whereArg, optsArg] = findMock.mock.calls[0];
    expect(whereArg.account).toBe('acc-1');
    expect(whereArg.day.$gte).toBeInstanceOf(Date);
    expect(whereArg.day.$lt).toBeInstanceOf(Date);
    expect(optsArg).toEqual({ orderBy: { day: 'ASC' } });

    // Row is computed via buildDailyStatsCsvRows with seeded prior 100 → +3 delta.
    expect(rows).toEqual([{ day: '2024-05-10', absolute: 103, delta: 3 }]);
  });
});
