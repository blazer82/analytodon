import mongoose, {Schema, Document} from 'mongoose';
import {AccountCredentials as AccountCredentialsType} from '@/types/AccountCredentials';

const AccountCredentialsSchema = new Schema<AccountCredentialsType>(
    {
        account: {
            type: Schema.Types.ObjectId,
            ref: 'Account',
            required: true,
        },
        clientID: {
            type: String,
        },
        clientSecret: {
            type: String,
        },
        accessToken: {
            type: String,
        },
        connectionToken: {
            type: String,
        },
    },
    {timestamps: true},
);

const AccountCredentialsModel = mongoose.models.AccountCredentials || mongoose.model('AccountCredentials', AccountCredentialsSchema);

export interface AccountCredentials extends Omit<AccountCredentialsType, 'id' | '_id'>, Document {}

export default AccountCredentialsModel;
