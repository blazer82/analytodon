import dbConnect from './dbConnect';
import {getDaysAgo} from './getDaysAgo';
import {getDaysToWeekBeginning} from './getDaysToWeekBeginning';
import DailyAccountStatsModel from '@/models/DailyAccountStatsModel';
import DailyTootStatsModel from '@/models/DailyTootStatsModel';
import {KPI} from '@/types/KPI';

export const getPeriodKPI = async (
    accountID: string,
    timezone: string,
    perdiodFunction: typeof getDaysToWeekBeginning,
    attribute: 'boostsCount' | 'favouritesCount' | 'followersCount' | 'repliesCount',
): Promise<KPI> => {
    await dbConnect();

    const perdiodModifier = perdiodFunction(timezone) === 0 ? -1 : 0; // Display last perdiod if today is the beginning of a new one
    const daysToPeriodBeginning = perdiodFunction(timezone, perdiodModifier);

    const thisPeriod = getDaysAgo(daysToPeriodBeginning + 1, timezone);
    const thisPeriodEnd = getDaysAgo(1, timezone);
    const lastPeriod = getDaysAgo(perdiodFunction(timezone, perdiodModifier - 1) + 1, timezone);

    const query = {account: accountID, day: {$in: [thisPeriod, thisPeriodEnd, lastPeriod]}};
    const options = {sort: {day: -1}};

    const data = await (['boostsCount', 'favouritesCount', 'repliesCount'].includes(attribute)
        ? DailyTootStatsModel.find(query, {}, options)
        : DailyAccountStatsModel.find(query, {}, options));

    const results: KPI = {};

    if (data?.length >= 2) {
        const daysToPeriodEnd = perdiodFunction(timezone, perdiodModifier + 1);
        //@ts-ignore
        results.currentPeriod = data[0][attribute] - data[1][attribute];
        results.currentPeriodProgress = daysToPeriodBeginning / (daysToPeriodBeginning - daysToPeriodEnd);
        results.isLastPerdiod = perdiodModifier !== 0;
    }

    if (data?.length === 3) {
        //@ts-ignore
        results.previousPerdiod = data[1][attribute] - data[2][attribute];
    }

    return results;
};
