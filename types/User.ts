import {Account, SessionAccount} from './Account';
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
    oldAccountDeletionNoticeSent?: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface JwtUser {
    _id: string;
    role: string;
}

export interface SessionUser {
    _id: string;
    role: string;
    email: string;
    emailVerified: boolean;
    accounts?: SessionAccount[];
    maxAccounts?: number;
    serverURLOnSignUp?: string;
    timezone?: string;
}
