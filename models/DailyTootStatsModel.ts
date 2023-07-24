import {DailyTootStats as DailyTootStatsType} from '@/types/DailyTootStats';
import {models, Document, model, Model, Schema} from 'mongoose';

const DailyTootStatsSchema = new Schema<DailyTootStatsType>(
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
        repliesCount: {
            type: Number,
            required: true,
        },
        boostsCount: {
            type: Number,
            required: true,
        },
        favouritesCount: {
            type: Number,
            required: true,
        },
    },
    {
        timestamps: false,
    },
);

export interface DailyTootStats extends Omit<DailyTootStatsType, 'id' | '_id'>, Document {}

const DailyTootStatsModel: Model<DailyTootStats> =
    (models.DailyTootStats as Model<DailyTootStats>) ?? (model<DailyTootStats>('DailyTootStats', DailyTootStatsSchema) as Model<DailyTootStats>);

export default DailyTootStatsModel;
