import { buildDailyStatsCsvRows } from './daily-stats-csv.helper';

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
});
