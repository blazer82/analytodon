import {User as UserType} from '@/types/User';
import {UserRole} from '@/types/UserRole';
import {models, Document, model, Model, Schema} from 'mongoose';
import UserCredentialsModel from './UserCredentialsModel';

const UserSchema = new Schema<UserType>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
        },
        emailVerified: {
            type: Boolean,
            required: true,
        },
        emailVerificationCode: {
            type: String,
        },
        resetPasswordToken: {
            type: String,
        },
        role: {
            type: String,
            enum: [UserRole.Admin, UserRole.AccountOwner],
            required: true,
            index: true,
        },
        isActive: {
            type: Boolean,
            required: true,
        },
        accounts: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Account',
            },
        ],
        maxAccounts: {
            type: Number,
        },
        serverURLOnSignUp: {
            type: String,
        },
        timezone: {
            type: String,
        },
        credentials: {
            type: Schema.Types.ObjectId,
            ref: UserCredentialsModel,
        },
        unsubscribed: [
            {
                type: String,
            },
        ],
    },
    {
        timestamps: true,
    },
);

export interface User extends Omit<UserType, 'id' | '_id'>, Document {}

const UserModel: Model<User> = (models.User as Model<User>) ?? (model<User>('User', UserSchema) as Model<User>);

export default UserModel;
