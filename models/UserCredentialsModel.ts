import mongoose, {Schema, Document} from 'mongoose';
import {UserCredentials as UserCredentialsType} from '@/types/UserCredentials';

const UserCredentialsSchema = new Schema<UserCredentialsType>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        passwordHash: {type: String, required: true},
        refreshToken: String,
    },
    {timestamps: true},
);

const UserCredentialsModel = mongoose.models.UserCredentials || mongoose.model('UserCredentials', UserCredentialsSchema);

export interface UserCredentials extends Omit<UserCredentialsType, 'id' | '_id'>, Document {}

export default UserCredentialsModel;
