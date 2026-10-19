import { describe, expect, it } from 'vitest';

import {
  averageEngagement,
  buildGrid,
  cellIntensity,
  cellValue,
  computeInsights,
  formatHour,
  maxCellValue,
  toPercentages,
  type PostingTimeSlot,
} from './insights';

const slot = (weekday: number, hour: number, posts: number, engagement = 0): PostingTimeSlot => ({
  weekday,
  hour,
  posts,
  engagement,
});

describe('buildGrid', () => {
  it('creates dense 7x24 matrices with Monday as the first day', () => {
    const grid = buildGrid([slot(1, 0, 2, 10), slot(7, 23, 1, 4)]);

    expect(grid.posts).toHaveLength(7);
    grid.posts.forEach((hours) => expect(hours).toHaveLength(24));
    expect(grid.posts[0][0]).toBe(2);
    expect(grid.engagement[0][0]).toBe(10);
    expect(grid.posts[6][23]).toBe(1);
    expect(grid.engagement[6][23]).toBe(4);
    expect(grid.posts[3][12]).toBe(0);
  });

  it('ignores out-of-range slots', () => {
    const grid = buildGrid([slot(0, 5, 3), slot(8, 5, 3), slot(1, 24, 3), slot(1, -1, 3)]);
    expect(grid.posts.flat().every((posts) => posts === 0)).toBe(true);
  });
});

describe('averageEngagement / cellValue', () => {
  const grid = buildGrid([slot(1, 9, 3, 30), slot(1, 10, 2, 100), slot(2, 9, 0, 0)]);

  it('returns the average engagement per post for slots with enough posts', () => {
    expect(averageEngagement(grid, 0, 9)).toBe(10);
  });

  it('returns null for slots with fewer than 3 posts', () => {
    expect(averageEngagement(grid, 0, 10)).toBeNull();
    expect(averageEngagement(grid, 1, 9)).toBeNull();
  });

  it('returns post counts or averages depending on the metric', () => {
    expect(cellValue(grid, 'posts', 0, 10)).toBe(2);
    expect(cellValue(grid, 'engagement', 0, 10)).toBeNull();
    expect(cellValue(grid, 'engagement', 0, 9)).toBe(10);
  });

  it('computes the max per metric, ignoring slots without a reliable average', () => {
    expect(maxCellValue(grid, 'posts')).toBe(3);
    expect(maxCellValue(grid, 'engagement')).toBe(10);
  });
});

describe('cellIntensity', () => {
  it('is 0 for empty, missing or unscaled values', () => {
    expect(cellIntensity(0, 10)).toBe(0);
    expect(cellIntensity(null, 10)).toBe(0);
    expect(cellIntensity(5, 0)).toBe(0);
  });

  it('scales non-empty values between a visible floor and 1', () => {
    expect(cellIntensity(10, 10)).toBe(1);
    const low = cellIntensity(1, 100);
    expect(low).toBeGreaterThan(0.12);
    expect(low).toBeLessThan(cellIntensity(50, 100));
  });
});

describe('computeInsights', () => {
  it('returns empty insights when there are no posts', () => {
    const insights = computeInsights(buildGrid([]));

    expect(insights.totalPosts).toBe(0);
    expect(insights.dayTotals).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(insights.usualSlot).toBeNull();
    expect(insights.busiestDay).toBeNull();
    expect(insights.bestSlot).toBeNull();
    expect(insights.dayPartShares).toEqual({ night: 0, morning: 0, afternoon: 0, evening: 0 });
  });

  it('computes totals, the usual slot and the busiest day', () => {
    const insights = computeInsights(
      buildGrid([slot(1, 8, 4, 8), slot(3, 8, 2, 2), slot(3, 20, 3, 3), slot(6, 21, 1, 50)]),
    );

    expect(insights.totalPosts).toBe(10);
    expect(insights.dayTotals).toEqual([4, 0, 5, 0, 0, 1, 0]);
    expect(insights.usualSlot).toEqual({ day: 0, hour: 8, posts: 4 });
    expect(insights.busiestDay).toEqual({ day: 2, posts: 5 });
  });

  it('only considers slots with at least 3 posts for the best time to post', () => {
    const insights = computeInsights(buildGrid([slot(1, 8, 3, 30), slot(2, 9, 4, 80), slot(5, 22, 1, 500)]));

    expect(insights.bestSlot).toEqual({ day: 1, hour: 9, average: 20 });
  });

  it('has no best slot when no slot has enough posts', () => {
    const insights = computeInsights(buildGrid([slot(1, 8, 2, 30), slot(2, 9, 1, 80)]));
    expect(insights.bestSlot).toBeNull();
  });

  it('splits posts into night, morning, afternoon and evening', () => {
    const insights = computeInsights(
      buildGrid([
        slot(1, 0, 1),
        slot(1, 5, 1),
        slot(1, 6, 2),
        slot(1, 11, 2),
        slot(1, 12, 2),
        slot(1, 18, 1),
        slot(1, 23, 1),
      ]),
    );

    expect(insights.dayPartShares).toEqual({ night: 0.2, morning: 0.4, afternoon: 0.2, evening: 0.2 });
  });

  it('classifies mostly evening/night posters as night owls', () => {
    const insights = computeInsights(buildGrid([slot(1, 22, 3), slot(1, 2, 1), slot(1, 8, 3)]));
    expect(insights.chronotype).toBe('nightOwl');
  });

  it('classifies mostly morning posters as early birds', () => {
    const insights = computeInsights(buildGrid([slot(1, 7, 5), slot(1, 22, 2), slot(1, 14, 4)]));
    expect(insights.chronotype).toBe('earlyBird');
  });

  it('classifies mostly afternoon posters as daytime posters', () => {
    const insights = computeInsights(buildGrid([slot(1, 7, 5), slot(1, 22, 2), slot(1, 14, 9)]));
    expect(insights.chronotype).toBe('daytime');
  });

  it('counts night and evening together against morning and afternoon', () => {
    const insights = computeInsights(buildGrid([slot(1, 2, 3), slot(1, 20, 3), slot(1, 9, 5), slot(1, 15, 5)]));
    expect(insights.chronotype).toBe('nightOwl');
  });
});

describe('formatHour', () => {
  it('pads hours to HH:00 and wraps at midnight', () => {
    expect(formatHour(0)).toBe('00:00');
    expect(formatHour(9)).toBe('09:00');
    expect(formatHour(23)).toBe('23:00');
    expect(formatHour(24)).toBe('00:00');
  });
});

describe('toPercentages', () => {
  it('rounds shares to whole percentages that add up to 100', () => {
    const result = toPercentages([1 / 3, 1 / 3, 1 / 3, 0]);
    expect(result.reduce((sum, value) => sum + value, 0)).toBe(100);
    expect(result).toEqual([34, 33, 33, 0]);
  });

  it('returns zeros when there is nothing to split', () => {
    expect(toPercentages([0, 0, 0, 0])).toEqual([0, 0, 0, 0]);
  });
});
