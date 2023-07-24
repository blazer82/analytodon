import {Account as AccountType} from '@/types/Account';
import {models, Document, model, Model, Schema} from 'mongoose';

const AccountSchema = new Schema<AccountType>(
    {
        serverURL: {
            type: String,
            required: true,
        },
        name: {
            type: String,
        },
        username: {
            type: String,
        },
        accountName: {
            type: String,
        },
        accountURL: {
            type: String,
        },
        avatarURL: {
            type: String,
        },
        isActive: {
            type: Boolean,
            required: true,
        },
        setupComplete: {
            type: Boolean,
            required: true,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        utcOffset: {
            // TODO: remove as this property is not reliable
            type: String,
            required: true,
        },
        timezone: {
            type: String,
            required: true,
        },
        credentials: {
            type: Schema.Types.ObjectId,
            ref: 'AccountCredentials',
        },
        requestedScope: [String],
    },
    {
        timestamps: true,
    },
);

export interface Account extends Omit<AccountType, 'id' | '_id'>, Document {}

const AccountModel: Model<Account> = (models.Account as Model<Account>) ?? (model<Account>('Account', AccountSchema) as Model<Account>);

export default AccountModel;
