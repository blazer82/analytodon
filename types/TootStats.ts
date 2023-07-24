export interface TootStats {
    _id: string;
    uri: string;
    url: string;
    content: string;
    visibility: string;
    tags: {name: string; url: string}[];
    language: string;
    createdAt: Date | string;
    repliesCount: number;
    reblogsCount: number;
    favouritesCount: number;
}
