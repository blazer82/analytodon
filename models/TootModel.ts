import {Toot as TootType} from '@/types/Toot';
import {models, Document, model, Model, Schema} from 'mongoose';

const TootSchema = new Schema<TootType>(
    {
        uri: {
            type: String,
            required: true,
        },
        account: {
            type: Schema.Types.ObjectId,
            ref: 'Account',
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        favouritesCount: {
            type: Number,
            required: true,
        },
        fetchedAt: {
            type: Date,
            required: true,
        },
        language: {
            type: String,
            required: true,
        },
        reblogsCount: {
            type: Number,
            required: true,
        },
        repliesCount: {
            type: Number,
            required: true,
        },
        tags: [
            new Schema(
                {
                    name: {
                        type: String,
                        required: true,
                    },
                    url: {
                        type: String,
                        required: true,
                    },
                },
                {_id: false},
            ),
        ],
        url: {
            type: String,
            required: true,
        },
        visibility: {
            type: String,
            required: true,
        },
        createdAt: {
            type: Date,
            required: true,
        },
    },
    {
        timestamps: false,
    },
);

export interface Toot extends Omit<TootType, 'id' | '_id'>, Document {}

const TootModel: Model<Toot> = (models.Toot as Model<Toot>) ?? (model<Toot>('Toot', TootSchema) as Model<Toot>);

export default TootModel;
