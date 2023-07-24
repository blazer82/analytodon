import {Account} from './Account';

export interface AccountCredentials {
    account: Account;
    clientID?: string;
    clientSecret?: string;
    accessToken?: string;
    connectionToken?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}
