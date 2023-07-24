import {User} from './User';

export interface UserCredentials {
    user: User;
    passwordHash: string;
    refreshToken?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}
