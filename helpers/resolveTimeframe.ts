import {Timeframe} from '@/types/Timeframe';
import {getDaysAgo} from './getDaysAgo';
import {getDaysToMonthBeginning} from './getDaysToMonthBeginning';
import {getDaysToWeekBeginning} from './getDaysToWeekBeginning';
import {getDaysToYearBeginning} from './getDaysToYearBeginning';

export const resolveTimeframe = (timezone: string, timeframe: string): {dateFrom: Date; dateTo: Date; timeframe: Timeframe} => {
    switch (timeframe) {
        case 'thisweek':
            return {
                dateFrom: getDaysAgo(getDaysToWeekBeginning(timezone), timezone),
                dateTo: getDaysAgo(0, timezone),
                timeframe: 'thisweek',
            };
        case 'thismonth':
            return {
                dateFrom: getDaysAgo(getDaysToMonthBeginning(timezone), timezone),
                dateTo: getDaysAgo(0, timezone),
                timeframe: 'thismonth',
            };
        case 'thisyear':
            return {
                dateFrom: getDaysAgo(getDaysToYearBeginning(timezone), timezone),
                dateTo: getDaysAgo(0, timezone),
                timeframe: 'thisyear',
            };
        case 'lastweek':
            return {
                dateFrom: getDaysAgo(getDaysToWeekBeginning(timezone, -1), timezone),
                dateTo: getDaysAgo(getDaysToWeekBeginning(timezone) + 1, timezone),
                timeframe: 'lastweek',
            };
        case 'lastmonth':
            return {
                dateFrom: getDaysAgo(getDaysToMonthBeginning(timezone, -1), timezone),
                dateTo: getDaysAgo(getDaysToMonthBeginning(timezone) + 1, timezone),
                timeframe: 'lastmonth',
            };
        case 'lastyear':
            return {
                dateFrom: getDaysAgo(getDaysToYearBeginning(timezone, -1), timezone),
                dateTo: getDaysAgo(getDaysToYearBeginning(timezone) + 1, timezone),
                timeframe: 'lastyear',
            };
        default:
            return {
                dateFrom: getDaysAgo(30, timezone),
                dateTo: getDaysAgo(0, timezone),
                timeframe: 'last30days',
            };
    }
};
