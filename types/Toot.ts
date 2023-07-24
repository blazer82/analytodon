import {Account} from './Account';
import {Tag} from './Tag';

export interface Toot {
    _id: string;
    uri: string;
    account: Account | string;
    content: string;
    createdAt: Date;
    favouritesCount: number;
    fetchedAt: Date;
    language: string;
    reblogsCount: number;
    repliesCount: number;
    tags?: Tag[];
    url: string;
    visibility: 'public' | 'unlisted' | 'private';
}
