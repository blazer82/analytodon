import dbConnect from '@/helpers/dbConnect';
import DailyAccountStatsModel from '@/models/DailyAccountStatsModel';

export const getTotalSnapshot = async (accountID: string) => {
    await dbConnect();

    const entry = await DailyAccountStatsModel.findOne({account: accountID}, {}, {sort: {day: -1}});

    if (entry) {
        return {
            amount: entry.followersCount,
            day: entry.day,
        };
    }
};
