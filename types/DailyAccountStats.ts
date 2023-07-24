import {Account} from './Account';

export interface DailyAccountStats {
    _id: string;
    account: Account | string;
    day: Date;
    followersCount: number;
    followingCount: number;
    statusesCount: number;
}
