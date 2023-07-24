import {Account} from './Account';

export interface DailyTootStats {
    _id: string;
    account: Account | string;
    day: Date;
    repliesCount: number;
    boostsCount: number;
    favouritesCount: number;
}
