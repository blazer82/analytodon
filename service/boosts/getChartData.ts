import dbConnect from '@/helpers/dbConnect';
import {formatDate, formatDateISO} from '@/helpers/localization';
import DailyTootStatsModel from '@/models/DailyTootStatsModel';

export const getChartData = async (accountID: string, timezone: string, dateFrom: Date, dateTo: Date, formattedDate = true) => {
    await dbConnect();

    const oneDayEarlier = new Date(dateFrom);
    oneDayEarlier.setUTCHours(oneDayEarlier.getUTCHours() - 24);

    const data = await DailyTootStatsModel.find({account: accountID, day: {$gte: oneDayEarlier, $lte: dateTo}}, {}, {sort: {day: 1}});

    return data
        ?.map((entry, index, list) => ({
            time: formattedDate ? formatDate(entry.day, timezone) : formatDateISO(entry.day, timezone),
            value: index > 0 ? Math.max(0, entry.boostsCount - list[index - 1].boostsCount) : null,
        }))
        ?.filter(({value}) => value !== null);
};
