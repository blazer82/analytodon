import {AccountCredentials} from './AccountCredentials';
import {User} from './User';

export interface Account {
    _id: string;
    serverURL: string;
    isActive: boolean;
    setupComplete: boolean;
    name?: string;
    username?: string;
    accountName?: string;
    accountURL?: string;
    avatarURL?: string;
    owner: User | string;
    utcOffset: string;
    timezone: string;
    credentials?: AccountCredentials;
    requestedScope?: string[];
    createdAt: Date | string;
    updatedAt: Date | string;
}
