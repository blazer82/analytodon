export interface PostingTimeSlot {
  /** ISO weekday: 1 = Monday ... 7 = Sunday */
  weekday: number;
  /** Hour of the day: 0-23 */
  hour: number;
  posts: number;
  /** Sum of replies + boosts + favorites of the posts in this slot */
  engagement: number;
}

export type PostingTimesMetric = 'posts' | 'engagement';

/** Slots with fewer posts than this don't get an average engagement (too noisy). */
export const MIN_POSTS_FOR_AVERAGE = 3;

export const DAYS_PER_WEEK = 7;
export const HOURS_PER_DAY = 24;

/** Night 0-6, morning 6-12, afternoon 12-18, evening 18-24 */
export const DAY_PARTS = ['night', 'morning', 'afternoon', 'evening'] as const;
export type DayPart = (typeof DAY_PARTS)[number];

export interface PostingTimesGrid {
  /** posts[dayIndex][hour], dayIndex 0 = Monday */
  posts: number[][];
  /** engagement[dayIndex][hour], dayIndex 0 = Monday */
  engagement: number[][];
}

export interface SlotRef {
  /** 0 = Monday ... 6 = Sunday */
  day: number;
  hour: number;
}

export interface PostingTimesInsights {
  totalPosts: number;
  dayTotals: number[];
  dayPartShares: Record<DayPart, number>;
  chronotype: 'nightOwl' | 'earlyBird';
  usualSlot: (SlotRef & { posts: number }) | null;
  busiestDay: { day: number; posts: number } | null;
  bestSlot: (SlotRef & { average: number }) | null;
}

const emptyMatrix = () => Array.from({ length: DAYS_PER_WEEK }, () => new Array<number>(HOURS_PER_DAY).fill(0));

/**
 * Turns the sparse list of slots returned by the API into dense 7x24 matrices.
 * Out-of-range entries are ignored.
 */
export function buildGrid(slots: PostingTimeSlot[]): PostingTimesGrid {
  const posts = emptyMatrix();
  const engagement = emptyMatrix();
  for (const slot of slots) {
    const day = slot.weekday - 1;
    if (day < 0 || day >= DAYS_PER_WEEK || slot.hour < 0 || slot.hour >= HOURS_PER_DAY) continue;
    posts[day][slot.hour] += slot.posts;
    engagement[day][slot.hour] += slot.engagement;
  }
  return { posts, engagement };
}

/** Average engagement per post, or null if the slot has too few posts for a meaningful average. */
export function averageEngagement(grid: PostingTimesGrid, day: number, hour: number): number | null {
  const posts = grid.posts[day][hour];
  if (posts < MIN_POSTS_FOR_AVERAGE) return null;
  return grid.engagement[day][hour] / posts;
}

/** The value a cell represents for the given metric (null = no reliable value). */
export function cellValue(grid: PostingTimesGrid, metric: PostingTimesMetric, day: number, hour: number) {
  return metric === 'posts' ? grid.posts[day][hour] : averageEngagement(grid, day, hour);
}

/** The largest cell value for the given metric, used to scale the colour ramp. */
export function maxCellValue(grid: PostingTimesGrid, metric: PostingTimesMetric): number {
  let max = 0;
  for (let day = 0; day < DAYS_PER_WEEK; day++) {
    for (let hour = 0; hour < HOURS_PER_DAY; hour++) {
      const value = cellValue(grid, metric, day, hour);
      if (value !== null && value > max) max = value;
    }
  }
  return max;
}

/**
 * Colour intensity (0-1) for a cell. Uses a square-root scale so a few very busy
 * slots don't wash out everything else, with a floor so non-empty cells stay visible.
 */
export function cellIntensity(value: number | null, max: number): number {
  if (value === null || value <= 0 || max <= 0) return 0;
  return 0.12 + 0.88 * Math.sqrt(Math.min(value, max) / max);
}

export function computeInsights(grid: PostingTimesGrid): PostingTimesInsights {
  const dayTotals = grid.posts.map((hours) => hours.reduce((sum, posts) => sum + posts, 0));
  const totalPosts = dayTotals.reduce((sum, posts) => sum + posts, 0);

  const partTotals = [0, 0, 0, 0];
  let usualSlot: PostingTimesInsights['usualSlot'] = null;
  let bestSlot: PostingTimesInsights['bestSlot'] = null;

  for (let day = 0; day < DAYS_PER_WEEK; day++) {
    for (let hour = 0; hour < HOURS_PER_DAY; hour++) {
      const posts = grid.posts[day][hour];
      partTotals[Math.floor(hour / 6)] += posts;
      if (posts > 0 && (!usualSlot || posts > usualSlot.posts)) {
        usualSlot = { day, hour, posts };
      }
      const average = averageEngagement(grid, day, hour);
      if (average !== null && (!bestSlot || average > bestSlot.average)) {
        bestSlot = { day, hour, average };
      }
    }
  }

  let busiestDay: PostingTimesInsights['busiestDay'] = null;
  dayTotals.forEach((posts, day) => {
    if (posts > 0 && (!busiestDay || posts > busiestDay.posts)) busiestDay = { day, posts };
  });

  const share = (count: number) => (totalPosts > 0 ? count / totalPosts : 0);
  const [night, morning, afternoon, evening] = partTotals;

  return {
    totalPosts,
    dayTotals,
    dayPartShares: {
      night: share(night),
      morning: share(morning),
      afternoon: share(afternoon),
      evening: share(evening),
    },
    chronotype: evening + night > morning ? 'nightOwl' : 'earlyBird',
    usualSlot,
    busiestDay,
    bestSlot,
  };
}

/** Formats an hour as "HH:00". */
export function formatHour(hour: number): string {
  return `${String(hour % HOURS_PER_DAY).padStart(2, '0')}:00`;
}

/** Rounds shares to whole percentages that add up to 100 (largest remainder method). */
export function toPercentages(shares: number[]): number[] {
  const total = shares.reduce((sum, share) => sum + share, 0);
  if (total <= 0) return shares.map(() => 0);
  const raw = shares.map((share) => (share / total) * 100);
  const floored = raw.map(Math.floor);
  let remaining = 100 - floored.reduce((sum, value) => sum + value, 0);
  const byRemainder = raw.map((value, index) => ({ index, remainder: value - floored[index] }));
  byRemainder.sort((a, b) => b.remainder - a.remainder);
  for (const { index } of byRemainder) {
    if (remaining <= 0) break;
    floored[index] += 1;
    remaining -= 1;
  }
  return floored;
}
