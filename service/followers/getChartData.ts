import dbConnect from '@/helpers/dbConnect';
import {formatDate, formatDateISO} from '@/helpers/localization';
import DailyAccountStatsModel from '@/models/DailyAccountStatsModel';

export const getChartData = async (accountID: string, timezone: string, dateFrom: Date, dateTo: Date, formattedDate = true) => {
    await dbConnect();

    const data = await DailyAccountStatsModel.find({account: accountID, day: {$gte: dateFrom, $lte: dateTo}}, {}, {sort: {day: 1}});

    return data?.map((entry) => ({time: formattedDate ? formatDate(entry.day, timezone) : formatDateISO(entry.day, timezone), value: entry.followersCount}));
};
