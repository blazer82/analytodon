import dbConnect from '@/helpers/dbConnect';
import TootModel, {Toot} from '@/models/TootModel';
import {TootRanking} from '@/types/TootRanking';
import mongoose from 'mongoose';

export const getTopToots = async ({
    accountID,
    limit = 5,
    ranking = 'top',
    dateFrom,
    dateTo,
}: {
    accountID: string;
    limit?: number;
    ranking?: TootRanking;
    dateFrom?: Date;
    dateTo?: Date;
}) => {
    await dbConnect();

    const match: mongoose.FilterQuery<Toot> = {account: new mongoose.Types.ObjectId(accountID)};

    if (dateFrom) {
        match.createdAt = {$gte: dateFrom};
    }

    if (dateTo) {
        match.createdAt = match.createdAt || {};
        match.createdAt['$lt'] = dateTo;
    }

    const rank = ((ranking: TootRanking) => {
        switch (ranking) {
            case 'replies':
                return '$repliesCount';
            case 'boosts':
                return '$reblogsCount';
            case 'favourites':
                return '$favouritesCount';
            default:
                return {$add: ['$reblogsCount', '$repliesCount']};
        }
    })(ranking);

    const list = await TootModel.aggregate([
        {$match: match},
        {$addFields: {rank}},
        {$match: {rank: {$gt: 0}}},
        {$sort: {rank: -1, createdAt: -1}},
        {$limit: limit},
    ]);

    return list;
};
