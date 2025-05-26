import { DailyAccountStatsEntity } from '@analytodon/shared-orm';
import { EntityRepository } from '@mikro-orm/core';

import {
  formatDateISO,
  getDaysAgo,
  getDaysToMonthBeginning,
  getDaysToWeekBeginning,
  getDaysToYearBeginning,
  getKPITrend,
  getPeriodKPI,
  resolveTimeframe,
} from './timeframe.helper';

// Define types for the mock repository
interface MockData {
  account: string;
  day: Date;
  followersCount?: number;
  boostsCount?: number;
  favouritesCount?: number;
  repliesCount?: number;
}

interface FindCriteria {
  account?: string;
  day?: {
    $lte?: Date;
  };
}

interface FindOptions {
  orderBy?: {
    day?: 'ASC' | 'DESC';
  };
}

// Mock EntityRepository for testing getPeriodKPI
class MockRepository {
  private mockData: MockData[] = [];

  setMockData(data: MockData[]) {
    this.mockData = data;
  }

  async findOne(criteria: FindCriteria, options: FindOptions) {
    // Sort the data by date if needed
    const sortedData = [...this.mockData];
    if (options?.orderBy?.day === 'DESC') {
      sortedData.sort((a, b) => new Date(b.day).getTime() - new Date(a.day).getTime());
    }

    // Filter by account ID
    const accountFiltered = sortedData.filter((item) => !criteria.account || item.account === criteria.account);

    // Filter by date criteria
    if (criteria.day && criteria.day.$lte) {
      const criteriaDate = new Date(criteria.day.$lte);
      // Find the latest entry that's before or equal to the criteria date
      const result = accountFiltered.find((item) => new Date(item.day) <= criteriaDate);
      return result;
    }

    // Default case - just return the first matching item
    const result = accountFiltered[0];
    return result;
  }
}

describe('TimeframeHelper', () => {
  // Fixed date for consistent testing
  const mockDate = new Date('2023-05-15T12:00:00Z'); // Monday, May 15, 2023
  let originalDate: DateConstructor;

  beforeAll(() => {
    originalDate = global.Date;
    // Mock Date to return a fixed date
    global.Date = class extends Date {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(...args: any[]) {
        // Handle different constructor signatures
        if (args.length === 0) {
          super(mockDate);
        } else {
          // @ts-expect-error - TypeScript doesn't like this pattern but it works for testing
          super(...args);
        }
      }
    } as DateConstructor;
  });

  afterAll(() => {
    // Restore original Date
    global.Date = originalDate;
  });

  describe('getDaysAgo', () => {
    it('should return the correct date for 0 days ago', () => {
      const result = getDaysAgo(0, 'Europe/Berlin');
      expect(result.toISOString().split('T')[0]).toBe('2023-05-15');
    });

    it('should return the correct date for 7 days ago', () => {
      const result = getDaysAgo(7, 'Europe/Berlin');
      expect(result.toISOString().split('T')[0]).toBe('2023-05-08');
    });

    it('should handle timezone differences correctly', () => {
      // Test with a timezone that's ahead of UTC
      const tokyoResult = getDaysAgo(1, 'Asia/Tokyo');
      // Test with a timezone that's behind UTC
      const nyResult = getDaysAgo(1, 'America/New_York');

      // The dates should be different due to timezone differences
      // but both should represent "yesterday" in their respective timezones
      expect(tokyoResult.toISOString()).not.toBe(nyResult.toISOString());
    });
  });

  describe('getDaysToWeekBeginning', () => {
    it('should return 0 for Monday (when Monday is the first day of the week)', () => {
      // May 15, 2023 is a Monday
      const result = getDaysToWeekBeginning('Europe/Berlin');
      expect(result).toBe(0);
    });

    it('should return correct days for other days of the week', () => {
      // Mock Tuesday (day 2)
      jest.spyOn(Date.prototype, 'getDay').mockReturnValueOnce(2);
      expect(getDaysToWeekBeginning('Europe/Berlin')).toBe(1);

      // Mock Sunday (day 0)
      jest.spyOn(Date.prototype, 'getDay').mockReturnValueOnce(0);
      expect(getDaysToWeekBeginning('Europe/Berlin')).toBe(6);
    });

    it('should handle week modifiers correctly', () => {
      // For current week (Monday)
      expect(getDaysToWeekBeginning('Europe/Berlin', 0)).toBe(0);

      // For last week
      expect(getDaysToWeekBeginning('Europe/Berlin', 1)).toBe(-7);

      // For next week
      expect(getDaysToWeekBeginning('Europe/Berlin', -1)).toBe(7);
    });
  });

  describe('getDaysToMonthBeginning', () => {
    it('should return correct days since the beginning of the month', () => {
      // May 15 is 14 days after May 1
      const result = getDaysToMonthBeginning('Europe/Berlin');
      expect(result).toBe(14);
    });

    it('should handle month modifiers correctly', () => {
      // Last month
      const lastMonth = getDaysToMonthBeginning('Europe/Berlin', -1);
      // This should be days since April 1, which is 44 days before May 15
      expect(lastMonth).toBe(44);

      // Next month
      const nextMonth = getDaysToMonthBeginning('Europe/Berlin', 1);
      // This should be negative, as June 1 is after May 15
      expect(nextMonth).toBeLessThan(0);
    });
  });

  describe('getDaysToYearBeginning', () => {
    it('should return correct days since the beginning of the year', () => {
      // May 15 is the 135th day of the year (Jan 1 = day 1)
      // But since we're counting from 0, it's 134 days since Jan 1
      const result = getDaysToYearBeginning('Europe/Berlin');
      expect(result).toBe(134);
    });

    it('should handle year modifiers correctly', () => {
      // Last year
      const lastYear = getDaysToYearBeginning('Europe/Berlin', -1);
      // This should be days since Jan 1, 2022, which is 499 days before May 15, 2023
      expect(lastYear).toBe(499);

      // Next year
      const nextYear = getDaysToYearBeginning('Europe/Berlin', 1);
      // This should be negative, as Jan 1, 2024 is after May 15, 2023
      expect(nextYear).toBeLessThan(0);
    });
  });

  describe('resolveTimeframe', () => {
    it('should resolve thisweek timeframe correctly', () => {
      const result = resolveTimeframe('Europe/Berlin', 'thisweek');
      expect(result.timeframe).toBe('thisweek');
      // Since our mock date is Monday (start of week), dateFrom should be today
      expect(result.dateFrom.toISOString().split('T')[0]).toBe('2023-05-15');
      // dateTo should be tomorrow (for inclusive end)
      expect(result.dateTo.toISOString().split('T')[0]).toBe('2023-05-16');
    });

    it('should resolve thismonth timeframe correctly', () => {
      const result = resolveTimeframe('Europe/Berlin', 'thismonth');
      expect(result.timeframe).toBe('thismonth');
      // dateFrom should be May 1
      expect(result.dateFrom.toISOString().split('T')[0]).toBe('2023-05-01');
      // dateTo should be tomorrow
      expect(result.dateTo.toISOString().split('T')[0]).toBe('2023-05-16');
    });

    it('should resolve last30days timeframe correctly', () => {
      const result = resolveTimeframe('Europe/Berlin', 'last30days');
      expect(result.timeframe).toBe('last30days');
      // dateFrom should be 30 days ago
      expect(result.dateFrom.toISOString().split('T')[0]).toBe('2023-04-15');
      // dateTo should be tomorrow
      expect(result.dateTo.toISOString().split('T')[0]).toBe('2023-05-16');
    });

    it('should use last30days as default for unknown timeframes', () => {
      const result = resolveTimeframe('Europe/Berlin', 'unknown');
      expect(result.timeframe).toBe('last30days');
      expect(result.dateFrom.toISOString().split('T')[0]).toBe('2023-04-15');
    });
  });

  describe('getPeriodKPI', () => {
    let mockRepo: MockRepository;
    const accountId = '60d0fe4f5311236168a109ca';

    beforeEach(() => {
      mockRepo = new MockRepository();
    });

    it('should calculate KPI correctly for followers count', async () => {
      // Mock data for followers stats - make sure we have entries for all the dates we need
      mockRepo.setMockData([
        // This is the "current period end" - latest data point
        {
          account: accountId,
          day: new Date('2023-05-15'), // Today in our mock
          followersCount: 150,
        },
        // This is the "current period start" - beginning of month
        {
          account: accountId,
          day: new Date('2023-05-01'),
          followersCount: 100,
        },
        // This is the "previous period start" - beginning of previous month
        {
          account: accountId,
          day: new Date('2023-04-01'),
          followersCount: 50,
        },
      ]);

      const result = await getPeriodKPI(
        mockRepo as unknown as EntityRepository<DailyAccountStatsEntity>,
        accountId,
        'Europe/Berlin',
        getDaysToMonthBeginning,
        'followersCount',
      );

      // Current period: May 15 (150) - May 1 (100) = 50
      expect(result.currentPeriod).toBe(50);
      // Previous period: May 1 (100) - April 1 (50) = 50
      expect(result.previousPeriod).toBe(50);
      expect(result.currentPeriodProgress).toBeCloseTo(0.5, 1); // Mid-month
    });

    it('should handle missing data gracefully', async () => {
      mockRepo.setMockData([]);

      const result = await getPeriodKPI(
        mockRepo as unknown as EntityRepository<DailyAccountStatsEntity>,
        accountId,
        'Europe/Berlin',
        getDaysToMonthBeginning,
        'followersCount',
      );

      expect(result.currentPeriod).toBeUndefined();
      expect(result.previousPeriod).toBeUndefined();
    });
  });

  describe('getKPITrend', () => {
    it('should calculate positive trend correctly', () => {
      const kpi = {
        currentPeriod: 150,
        previousPeriod: 100,
        currentPeriodProgress: 0.5,
      };

      // Current period is 150 at 50% progress, so projected to be 300
      // Trend = (300 - 100) / 100 = 2 (200% increase)
      const trend = getKPITrend(kpi);
      expect(trend).toBe(2);
    });

    it('should calculate negative trend correctly', () => {
      const kpi = {
        currentPeriod: 40,
        previousPeriod: 100,
        currentPeriodProgress: 0.5,
      };

      // Current period is 40 at 50% progress, so projected to be 80
      // Trend = (80 - 100) / 100 = -0.2 (20% decrease)
      const trend = getKPITrend(kpi);
      expect(trend).toBe(-0.2);
    });

    it('should handle zero previous period', () => {
      const kpi = {
        currentPeriod: 50,
        previousPeriod: 0,
        currentPeriodProgress: 0.5,
      };

      const trend = getKPITrend(kpi);
      expect(trend).toBeNull();
    });

    it('should return null for undefined values', () => {
      expect(getKPITrend({})).toBeNull();
      expect(getKPITrend({ currentPeriod: 100 })).toBeNull();
    });
  });

  describe('formatDateISO', () => {
    it('should format Date object correctly', () => {
      const date = new Date('2023-05-15T12:00:00Z');
      expect(formatDateISO(date)).toBe('2023-05-15');
    });

    it('should format string date correctly', () => {
      expect(formatDateISO('2023-05-15T12:00:00Z')).toBe('2023-05-15');
    });

    it('should return null for undefined date', () => {
      expect(formatDateISO(undefined)).toBeNull();
    });

    it('should respect timezone', () => {
      // This test is tricky because the result depends on the timezone
      // For a date near midnight, the formatted date might be different in different timezones
      const dateNearMidnight = new Date('2023-05-15T23:30:00Z');

      // In Tokyo (UTC+9), this would be May 16
      const tokyoDate = formatDateISO(dateNearMidnight, 'Asia/Tokyo');

      // In New York (UTC-5), this would be May 15
      const nyDate = formatDateISO(dateNearMidnight, 'America/New_York');

      // The dates should be different due to timezone differences
      expect(tokyoDate).not.toBe(nyDate);
    });
  });
});
