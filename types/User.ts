import {Account} from './Account';
import {UserCredentials} from './UserCredentials';

export interface User {
    _id: string;
    isActive: boolean;
    role: string;
    email: string;
    emailVerified: boolean;
    emailVerificationCode?: string;
    resetPasswordToken?: string;
    accounts?: Account[];
    maxAccounts?: number;
    serverURLOnSignUp?: string;
    timezone?: string;
    credentials?: UserCredentials;
    unsubscribed?: string[];
    createdAt: Date | string;
    updatedAt: Date | string;
}
