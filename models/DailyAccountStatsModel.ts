import {DailyAccountStats as DailyAccountStatsType} from '@/types/DailyAccountStats';
import {models, Document, model, Model, Schema} from 'mongoose';

const DailyAccountStatsSchema = new Schema<DailyAccountStatsType>(
    {
        account: {
            type: Schema.Types.ObjectId,
            ref: 'Account',
            required: true,
        },
        day: {
            type: Date,
            required: true,
        },
        followersCount: {
            type: Number,
            required: true,
        },
        followingCount: {
            type: Number,
            required: true,
        },
        statusesCount: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: false,
    },
);

export interface DailyAccountStats extends Omit<DailyAccountStatsType, 'id' | '_id'>, Document {}

const DailyAccountStatsModel: Model<DailyAccountStats> =
    (models.DailyAccountStats as Model<DailyAccountStats>) ??
    (model<DailyAccountStats>('DailyAccountStats', DailyAccountStatsSchema) as Model<DailyAccountStats>);

export default DailyAccountStatsModel;
