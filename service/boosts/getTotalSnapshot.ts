import dbConnect from '@/helpers/dbConnect';
import DailyTootStatsModel from '@/models/DailyTootStatsModel';

export const getTotalSnapshot = async (accountID: string) => {
    await dbConnect();

    const entry = await DailyTootStatsModel.findOne({account: accountID}, {}, {sort: {day: -1}});

    if (entry) {
        return {
            amount: entry.boostsCount,
            day: entry.day,
        };
    }
};
