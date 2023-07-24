import {parse} from 'url';

export const stripSchema = (url: string) => {
    if (!url) return '';
    const {host} = parse(url);
    return host || '';
};
